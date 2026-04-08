import { NextRequest } from 'next/server';
import { validateApiKey } from '@/lib/validateApiKey';
import { unauthorized, badRequest, serverError, success } from '@/lib/apiResponse';
import { writeFile, mkdir, unlink, readdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Remix Audio — /api/v1/video/remix-audio
// WHY: After the full stitch runs, users can iterate on the audio mix
// without regenerating any video clips. This endpoint takes an already-
// stitched MP4, strips its audio, and re-applies the sidechain duck with
// a different duckingDb value (Subtle -6, Standard -12, Aggressive -18).
// The video track is copied byte-for-byte so remix is near-instant compared
// to a full re-stitch.
// ---------------------------------------------------------------------------

const requestSchema = z.object({
  projectId: z.string(),
  baseVideoUrl: z.string().url(),
  audioUrl: z.string().url().optional(),
  voiceoverUrl: z.string().url().optional(),
  duckingDb: z.number().min(-24).max(0),
});

async function downloadFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download: ${url} (${res.status})`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buffer);
}

async function cleanup(dir: string) {
  try {
    const files = await readdir(dir);
    for (const file of files) {
      await unlink(join(dir, file)).catch(() => {});
    }
    const { rmdir } = await import('fs/promises');
    await rmdir(dir).catch(() => {});
  } catch {
    // best-effort
  }
}

export async function POST(request: NextRequest) {
  const rawKey =
    request.headers.get('authorization')?.replace('Bearer ', '') ??
    request.headers.get('x-api-key') ??
    '';

  const jobId = randomUUID();
  const tmpDir = join('/tmp', `remix-${jobId}`);

  try {
    const apiKeyRecord = await validateApiKey(rawKey);
    if (!apiKeyRecord) {
      return unauthorized('Invalid or expired API key.');
    }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.errors.map(
        (e) => `${e.path.join('.')}: ${e.message}`,
      );
      return badRequest(`Invalid request. ${fieldErrors.join('; ')}`);
    }

    const { projectId, baseVideoUrl, audioUrl, voiceoverUrl, duckingDb } = parsed.data;

    if (!audioUrl && !voiceoverUrl) {
      return badRequest('Nothing to remix — need at least audioUrl or voiceoverUrl');
    }

    await mkdir(tmpDir, { recursive: true });

    // 1. Download base video
    const baseVideoPath = join(tmpDir, 'base.mp4');
    await downloadFile(baseVideoUrl, baseVideoPath);

    // 2. Download any audio layers we need
    let musicPath: string | null = null;
    let voPath: string | null = null;
    if (audioUrl) {
      musicPath = join(tmpDir, 'music.mp3');
      await downloadFile(audioUrl, musicPath);
    }
    if (voiceoverUrl) {
      voPath = join(tmpDir, 'vo.mp3');
      await downloadFile(voiceoverUrl, voPath);
    }

    const outPath = join(tmpDir, 'remix.mp4');

    if (musicPath && voPath) {
      // Full duck + mix — same filter graph as the main stitch. See
      // /api/v1/video/stitch for the inline documentation of every
      // parameter. The only thing that changes between remix tiers is
      // the VO makeup gain derived from duckingDb.
      const voGainDb = Math.max(0, Math.min(6, Math.abs(duckingDb) - 12));
      const filterGraph = [
        `[1:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=0.85[music]`,
        `[2:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=${(1 + voGainDb / 20).toFixed(2)}[vofull]`,
        `[vofull]asplit=2[vosc][voout]`,
        `[music][vosc]sidechaincompress=threshold=0.05:ratio=8:attack=20:release=400:makeup=1[duckedmusic]`,
        `[duckedmusic][voout]amix=inputs=2:duration=longest:normalize=0[mixout]`,
      ].join(';');

      await execFileAsync('ffmpeg', [
        '-i', baseVideoPath,
        '-i', musicPath,
        '-i', voPath,
        '-filter_complex', filterGraph,
        '-map', '0:v:0',
        '-map', '[mixout]',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest',
        '-y',
        outPath,
      ]);
    } else if (musicPath) {
      await execFileAsync('ffmpeg', [
        '-i', baseVideoPath,
        '-i', musicPath,
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-shortest',
        '-y',
        outPath,
      ]);
    } else if (voPath) {
      await execFileAsync('ffmpeg', [
        '-i', baseVideoPath,
        '-i', voPath,
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-shortest',
        '-y',
        outPath,
      ]);
    }

    // Move to public dir
    const outputName = `${projectId}-remix-${jobId}.mp4`;
    const outputDir = join(process.cwd(), 'public', 'videos', 'stitched');
    await mkdir(outputDir, { recursive: true });
    const outputPath = join(outputDir, outputName);
    const { copyFile } = await import('fs/promises');
    await copyFile(outPath, outputPath);

    cleanup(tmpDir).catch(() => {});

    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://princemarketing.ai';
    const videoUrl = `${baseUrl}/videos/stitched/${outputName}`;

    return success({
      videoUrl,
      projectId,
      duckingDb,
      mixMode: musicPath && voPath ? 'music+vo+ducking' : musicPath ? 'music-only' : 'vo-only',
    });
  } catch (err) {
    console.error(`[API] POST /v1/video/remix-audio error (job ${jobId}):`, err);
    cleanup(tmpDir).catch(() => {});
    const message = err instanceof Error ? err.message : 'Remix failed';
    return serverError(`Audio remix failed: ${message}`);
  }
}
