import { NextRequest } from 'next/server';
import { validateApiKey } from '@/lib/validateApiKey';
import { unauthorized, badRequest, serverError, success } from '@/lib/apiResponse';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

// Allowed audio MIME types
const ALLOWED_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/aac',
  'audio/mp4',
  'audio/webm',
  'audio/flac',
]);

// Max file size: 50MB
const MAX_SIZE = 50 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const rawKey =
    request.headers.get('authorization')?.replace('Bearer ', '') ??
    request.headers.get('x-api-key') ??
    '';

  try {
    // 1. Validate API key
    const apiKeyRecord = await validateApiKey(rawKey);
    if (!apiKeyRecord) {
      return unauthorized('Invalid or expired API key.');
    }

    // 2. Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return badRequest('Missing "file" field in form data.');
    }

    // 3. Validate MIME type
    if (!ALLOWED_TYPES.has(file.type)) {
      return badRequest(
        `Unsupported audio format: ${file.type}. Accepted: mp3, wav, ogg, aac, mp4, webm, flac.`,
      );
    }

    // 4. Validate file size
    if (file.size > MAX_SIZE) {
      return badRequest(`File too large. Maximum size is 50MB.`);
    }

    // 5. Generate path: public/uploads/audio/{date}/{uuid}.{ext}
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'mp3';
    const dateDir = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const fileName = `${randomUUID()}.${ext}`;
    const relativePath = `uploads/audio/${dateDir}/${fileName}`;
    const absolutePath = join(process.cwd(), 'public', relativePath);

    // 6. Ensure directory exists
    await mkdir(join(process.cwd(), 'public', 'uploads', 'audio', dateDir), {
      recursive: true,
    });

    // 7. Write file
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(absolutePath, buffer);

    // 8. Build public URL
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://princemarketing.ai';
    const audioUrl = `${baseUrl}/${relativePath}`;

    return success({
      audioUrl,
      fileName,
      size: file.size,
      mimeType: file.type,
    });
  } catch (err) {
    console.error('[API] POST /v1/upload/audio error:', err);
    return serverError('Failed to upload audio file.');
  }
}
