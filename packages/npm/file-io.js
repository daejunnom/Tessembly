/** Node-only bounded file input. Caller chooses paths; this is not a filesystem sandbox. */
import { open } from 'node:fs/promises';
import { constants } from 'node:fs';
import { TessemblyError } from './locale.js';
export async function readLimitedFile(path, limit, language) {
  let file;
  try {
    file = await open(path, constants.O_RDONLY | (constants.O_NONBLOCK ?? 0));
    const stat = await file.stat();
    if (!stat.isFile()) throw new TessemblyError('REGULAR_FILE_REQUIRED', { language });
    if (stat.size > limit) throw new TessemblyError('INPUT_LIMIT', { language });
    const bytes = Buffer.alloc(Math.min(limit + 1, stat.size + 1)); let used = 0;
    // Bound the actual read, including files that grow after fstat.
    while (used < bytes.length) {
      const { bytesRead } = await file.read(bytes, used, bytes.length - used, null);
      if (bytesRead === 0) break;
      used += bytesRead;
    }
    if (used > limit) throw new TessemblyError('INPUT_LIMIT', { language });
    if (used > stat.size) throw new TessemblyError('READ_FAILED', { language });
    return bytes.subarray(0, used);
  } catch (cause) {
    if (cause instanceof TessemblyError) throw cause;
    throw new TessemblyError('READ_FAILED', { language, cause });
  } finally { await file?.close(); }
}
