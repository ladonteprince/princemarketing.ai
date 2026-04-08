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
  // WHY: Voiceover fork. Either the karaoke recording or the ElevenLabs
  // AI voice ends up here. When present alongside audioUrl, we apply
  // sidechain ducking — the music bed automatically dips -12dB under
  // the VO, then recovers. When present without audioUrl, the VO
  // becomes the sole audio track.
  voiceoverUrl: z.string().url().optional(),
  // Ducking controls — sensible defaults for commercial work, but the
  // frontend can override for genre-specific mixes (EDM wants shallower
  // ducking, podcasts want deeper).
  duckingDb: z.number().min(-24).max(0).optional(), // default: -12
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

    const { projectId, scenes, audioUrl, voiceoverUrl, duckingDb } = parsed.data;
    const DUCK_DB = duckingDb ?? -12;

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

    // 7. Audio layer assembly — four branches:
    //    (a) no audioUrl, no voiceoverUrl → keep stitched video audio as-is
    //    (b) audioUrl only → REPLACE with music track (existing behavior)
    //    (c) voiceoverUrl only → REPLACE with voiceover (music-less VO)
    //    (d) audioUrl + voiceoverUrl → DUCK music under VO + mix both
    let finalPath = stitchedPath;

    const hasMusic = !!audioUrl;
    const hasVoiceover = !!voiceoverUrl;

    if (hasMusic && !hasVoiceover) {
      // Branch (b): music-only replace. Existing behavior preserved.
      const audioPath = join(tmpDir, 'music.mp3');
      await downloadFile(audioUrl!, audioPath);
      const out = join(tmpDir, 'final.mp4');
      await execFileAsync('ffmpeg', [
        '-i', stitchedPath,
        '-i', audioPath,
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-shortest',
        '-y',
        out,
      ]);
      finalPath = out;
    } else if (!hasMusic && hasVoiceover) {
      // Branch (c): voiceover-only. Skip the music layer entirely,
      // replace with VO. The final video plays the VO over silent
      // stitched footage (which is what the user asked for when they
      // chose a VO without picking a track — rare but supported).
      const voPath = join(tmpDir, 'vo.mp3');
      await downloadFile(voiceoverUrl!, voPath);
      const out = join(tmpDir, 'final.mp4');
      await execFileAsync('ffmpeg', [
        '-i', stitchedPath,
        '-i', voPath,
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-shortest',
        '-y',
        out,
      ]);
      finalPath = out;
    } else if (hasMusic && hasVoiceover) {
      // Branch (d): the real score-first production mix.
      // Sidechain compression — music automatically ducks whenever the
      // VO signal is present, then recovers during gaps. This is how
      // every radio ad, podcast intro, and pro commercial handles the
      // music-bed-under-narration problem. We layer:
      //   [video]         from stitched.mp4
      //   [music_ducked]  from audioUrl, compressed by VO envelope
      //   [vo]            from voiceoverUrl, at unity gain
      // Final: video + amix(music_ducked, vo)
      //
      // Filter graph explanation:
      //   1. aformat normalizes both audio streams to 44.1kHz stereo so
      //      the filters see matched formats.
      //   2. asplit duplicates the VO — one copy drives the sidechain
      //      (shapes the music envelope), the other is mixed into the
      //      final output unchanged.
      //   3. sidechaincompress with threshold=0.05, ratio=8, attack=20ms,
      //      release=400ms gives a natural "radio DJ" duck — fast enough
      //      to catch word starts, slow enough to recover between phrases.
      //      makeup gain compensates for the average compression.
      //   4. amix(inputs=2, duration=longest, normalize=0) prevents
      //      ffmpeg from auto-normalizing which would cancel the duck.
      const musicPath = join(tmpDir, 'music.mp3');
      const voPath = join(tmpDir, 'vo.mp3');
      await Promise.all([
        downloadFile(audioUrl!, musicPath),
        downloadFile(voiceoverUrl!, voPath),
      ]);

      // Convert DUCK_DB (negative dB) into a linear makeup gain applied
      // to the VO side of the mix. Deeper duck (-18dB) needs slightly
      // hotter VO to stay on top of the bed; default (-12dB) keeps VO
      // at unity.
      const voGainDb = Math.max(0, Math.min(6, Math.abs(DUCK_DB) - 12));

      const filterGraph = [
        `[1:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=0.85[music]`,
        `[2:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=${(1 + voGainDb / 20).toFixed(2)}[vofull]`,
        `[vofull]asplit=2[vosc][voout]`,
        `[music][vosc]sidechaincompress=threshold=0.05:ratio=8:attack=20:release=400:makeup=1[duckedmusic]`,
        `[duckedmusic][voout]amix=inputs=2:duration=longest:normalize=0[mixout]`,
      ].join(';');

      const out = join(tmpDir, 'final.mp4');
      await execFileAsync('ffmpeg', [
        '-i', stitchedPath,
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
        out,
      ]);
      finalPath = out;
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

    const mixMode = hasMusic && hasVoiceover
      ? 'music+vo+ducking'
      : hasMusic
        ? 'music-only'
        : hasVoiceover
          ? 'vo-only'
          : 'video-audio';

    return success({
      videoUrl,
      projectId,
      totalScenes: scenes.length,
      totalDuration,
      hasCustomAudio: !!audioUrl,
      hasVoiceover: !!voiceoverUrl,
      mixMode,
      duckingDb: hasMusic && hasVoiceover ? DUCK_DB : undefined,
    });
  } catch (err) {
    console.error(`[API] POST /v1/video/stitch error (job ${jobId}):`, err);

    // Cleanup on error (non-blocking)
    cleanup(tmpDir).catch(() => {});

    const message = err instanceof Error ? err.message : 'Stitch failed';
    return serverError(`Video stitch failed: ${message}`);
  }
}
