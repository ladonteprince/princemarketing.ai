import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

// ─── Configuration ─────────────────────────────────────────────────────────

const STORAGE_DIR = process.env.STORAGE_DIR ?? '/var/www/princemarketing.ai/public/uploads';
const PUBLIC_URL = process.env.PUBLIC_URL ?? 'https://princemarketing.ai/uploads';

// ─── Helpers ───────────────────────────────────────────────────────────────

function getDateFolder(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function mimeToExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return map[mimeType] ?? 'png';
}

async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Save a base64-encoded image to disk and return a public URL.
 *
 * @param base64Data - Raw base64 string (no data: prefix)
 * @param mimeType - e.g. "image/png"
 * @returns Public URL to the saved image
 */
export async function saveImage(
  base64Data: string,
  mimeType: string,
): Promise<string> {
  const dateFolder = getDateFolder();
  const ext = mimeToExtension(mimeType);
  const filename = `${crypto.randomUUID()}.${ext}`;

  const dirPath = join(STORAGE_DIR, 'images', dateFolder);
  const filePath = join(dirPath, filename);

  await ensureDir(dirPath);
  await writeFile(filePath, Buffer.from(base64Data, 'base64'));

  return `${PUBLIC_URL}/images/${dateFolder}/${filename}`;
}

/**
 * Download a video from a remote URL (e.g. MuAPI result) and save locally.
 *
 * @param remoteUrl - The URL to download from
 * @returns Public URL to the saved video
 */
export async function saveVideo(remoteUrl: string): Promise<string> {
  const dateFolder = getDateFolder();
  const filename = `${crypto.randomUUID()}.mp4`;

  const dirPath = join(STORAGE_DIR, 'videos', dateFolder);
  const filePath = join(dirPath, filename);

  await ensureDir(dirPath);

  const response = await fetch(remoteUrl, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) {
    throw new Error(`Failed to download video from ${remoteUrl}: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await writeFile(filePath, Buffer.from(arrayBuffer));

  return `${PUBLIC_URL}/videos/${dateFolder}/${filename}`;
}
