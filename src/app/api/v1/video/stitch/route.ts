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

const requestSchema = z.object({
  projectId: z.string(),
  audioUrl: z.string().url().optional(),
  scenes: z.array(
    z.object({
      videoUrl: z.string(),
      trimStart: z.number(),
      trimEnd: z.number(),
    }),
  ).min(1, 'At least one scene is required'),
});

/** Download a file from URL to a local path */
async function downloadFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download: ${url} (${res.status})`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buffer);
}

/** Clean up temporary files */
async function cleanup(dir: string) {
  try {
    const files = await readdir(dir);
    for (const file of files) {
      await unlink(join(dir, file)).catch(() => {});
    }
    // Remove dir itself (only if empty)
    const { rmdir } = await import('fs/promises');
    await rmdir(dir).catch(() => {});
  } catch {
    // Best-effort cleanup
  }
}

export async function POST(request: NextRequest) {
  const rawKey =
    request.headers.get('authorization')?.replace('Bearer ', '') ??
    request.headers.get('x-api-key') ??
    '';

  const jobId = randomUUID();
  const tmpDir = join('/tmp', `stitch-${jobId}`);

  try {
    // 1. Validate API key
    const apiKeyRecord = await validateApiKey(rawKey);
    if (!apiKeyRecord) {
      return unauthorized('Invalid or expired API key.');
    }

    // 2. Parse request
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors = parsed.error.errors.map(
        (e) => `${e.path.join('.')}: ${e.message}`,
      );
      return badRequest(`Invalid request. ${fieldErrors.join('; ')}`);
    }

    const { projectId, scenes, audioUrl } = parsed.data;

    // 3. Create temp directory
    await mkdir(tmpDir, { recursive: true });

    // 4. Download all video clips and trim them
    const trimmedPaths: string[] = [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const inputPath = join(tmpDir, `input-${i}.mp4`);
      const trimmedPath = join(tmpDir, `trimmed-${i}.mp4`);

      await downloadFile(scene.videoUrl, inputPath);

      const duration = scene.trimEnd - scene.trimStart;

      // Trim the clip
      await execFileAsync('ffmpeg', [
        '-i', inputPath,
        '-ss', String(scene.trimStart),
        '-t', String(duration),
        '-c', 'copy',
        '-y',
        trimmedPath,
      ]);

      trimmedPaths.push(trimmedPath);
    }

    // 5. Create concat file for ffmpeg
    const concatListPath = join(tmpDir, 'concat.txt');
    const concatContent = trimmedPaths
      .map((p) => `file '${p}'`)
      .join('\n');
    await writeFile(concatListPath, concatContent);

    // 6. Concatenate all clips
    const stitchedPath = join(tmpDir, 'stitched.mp4');
    await execFileAsync('ffmpeg', [
      '-f', 'concat',
      '-safe', '0',
      '-i', concatListPath,
      '-c', 'copy',
      '-y',
      stitchedPath,
    ]);

    // 7. If audioUrl is provided, replace the audio track
    let finalPath = stitchedPath;

    if (audioUrl) {
      const audioPath = join(tmpDir, 'audio-track.mp3');
      await downloadFile(audioUrl, audioPath);

      const withAudioPath = join(tmpDir, 'final.mp4');

      // REPLACE mode: strip original audio, use provided audio track
      // -map 0:v:0 takes video from stitched clip
      // -map 1:a:0 takes audio from the uploaded track
      // -shortest ends when the shorter stream ends
      await execFileAsync('ffmpeg', [
        '-i', stitchedPath,
        '-i', audioPath,
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-shortest',
        '-y',
        withAudioPath,
      ]);

      // TODO: Add MIX mode option that blends original + custom audio:
      // ffmpeg -i stitched.mp4 -i audio.mp3
      //   -filter_complex "[0:a][1:a]amix=inputs=2:duration=shortest:weights=0.3 1.0[a]"
      //   -map 0:v -map "[a]" -c:v copy output.mp4

      finalPath = withAudioPath;
    }

    // 8. Move final video to public directory
    const outputName = `${projectId}-${jobId}.mp4`;
    const outputDir = join(process.cwd(), 'public', 'videos', 'stitched');
    await mkdir(outputDir, { recursive: true });
    const outputPath = join(outputDir, outputName);

    // Copy final file to public
    const { copyFile } = await import('fs/promises');
    await copyFile(finalPath, outputPath);

    // 9. Calculate total duration
    const totalDuration = scenes.reduce(
      (sum, s) => sum + (s.trimEnd - s.trimStart),
      0,
    );

    // 10. Build public URL
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://princemarketing.ai';
    const videoUrl = `${baseUrl}/videos/stitched/${outputName}`;

    // 11. Cleanup temp files (non-blocking)
    cleanup(tmpDir).catch(() => {});

    return success({
      videoUrl,
      projectId,
      totalScenes: scenes.length,
      totalDuration,
      hasCustomAudio: !!audioUrl,
    });
  } catch (err) {
    console.error(`[API] POST /v1/video/stitch error (job ${jobId}):`, err);

    // Cleanup on error (non-blocking)
    cleanup(tmpDir).catch(() => {});

    const message = err instanceof Error ? err.message : 'Stitch failed';
    return serverError(`Video stitch failed: ${message}`);
  }
}
