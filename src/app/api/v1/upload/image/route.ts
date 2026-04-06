import { NextRequest } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { validateApiKey } from '@/lib/validateApiKey';
import { unauthorized, badRequest, serverError, success } from '@/lib/apiResponse';
import { prisma } from '@/lib/db';

// ---------------------------------------------------------------------------
// POST /api/v1/upload/image
// WHY: User-uploaded reference images (character photos, product shots,
// environment references) need to be persisted to disk so they survive
// page reloads and can be referenced by Seedance @image tags. Saves to the
// same uploads directory as generated images and creates a Generation
// record so the asset shows up in /api/v1/user/generations.
// ---------------------------------------------------------------------------

const STORAGE_DIR = process.env.STORAGE_DIR ?? '/var/www/princemarketing.ai/public/uploads';
const PUBLIC_URL = process.env.PUBLIC_URL ?? 'https://princemarketing.ai/uploads';
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

function mimeToExt(mimeType: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
  };
  return map[mimeType] ?? 'bin';
}

function getDateFolder(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export async function POST(request: NextRequest) {
  const rawKey =
    request.headers.get('authorization')?.replace('Bearer ', '') ??
    request.headers.get('x-api-key') ??
    '';

  try {
    // 1. Auth
    const apiKeyRecord = await validateApiKey(rawKey);
    if (!apiKeyRecord) {
      return unauthorized('Invalid or expired API key.');
    }

    // 2. Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file');
    const label = String(formData.get('label') ?? 'Uploaded reference');
    const category = String(formData.get('category') ?? 'reference');

    if (!file || !(file instanceof File)) {
      return badRequest('Missing file in form data.');
    }

    if (file.size > MAX_FILE_SIZE) {
      return badRequest(`File too large. Max ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return badRequest(`Unsupported file type: ${file.type}`);
    }

    // 3. Save to disk
    const isVideo = file.type.startsWith('video/');
    const subdir = isVideo ? 'videos' : 'images';
    const ext = mimeToExt(file.type);
    const dateFolder = getDateFolder();
    const filename = `${crypto.randomUUID()}.${ext}`;
    const dirPath = join(STORAGE_DIR, subdir, dateFolder);
    const filePath = join(dirPath, filename);

    await mkdir(dirPath, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const publicUrl = `${PUBLIC_URL}/${subdir}/${dateFolder}/${filename}`;

    // 4. Create Generation record so it shows up in the user's library
    // WHY: The .com Assets page reads from /api/v1/user/generations, so
    // uploaded files need a row in the same table to appear there.
    const generation = await prisma.generation.create({
      data: {
        userId: apiKeyRecord.userId,
        type: isVideo ? 'video' : 'image',
        status: 'passed',
        prompt: label,
        resultUrl: publicUrl,
        creditsConsumed: 0, // Uploads don't cost credits
        metadata: {
          source: 'upload',
          category,
          originalName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        },
      },
    });

    return success({
      id: generation.id,
      url: publicUrl,
      type: isVideo ? 'video' : 'image',
      label,
      category,
    });
  } catch (err) {
    console.error('[UploadImage] Error:', err);
    return serverError(err instanceof Error ? err.message : 'Upload failed');
  }
}
