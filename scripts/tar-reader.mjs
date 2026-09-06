/** Strict, bounded reader for this project's npm tarballs. Does not extract any paths. */
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
export function tarEntries(compressed) {
  assert.ok(compressed.length <= 2_097_152, 'ARCHIVE_COMPRESSED_LIMIT');
  const data = gunzipSync(compressed, { maxOutputLength: 8_388_608 });
  const entries = new Map(); let offset = 0; let count = 0; let ended = false;
  const text = b => b.toString('utf8').replace(/\0.*$/s, '');
  const octal = b => {
    const s = text(b).trim(); assert.match(s, /^[0-7]+$/, 'INVALID_TAR_NUMBER');
    const n = parseInt(s, 8); assert.ok(Number.isSafeInteger(n), 'TAR_INTEGER_OVERFLOW'); return n;
  };
  while (offset + 512 <= data.length) {
    const header = data.subarray(offset, offset + 512); offset += 512;
    if (header.every(b => b === 0)) { ended = true; break; }
    assert.ok(++count <= 128, 'ARCHIVE_ENTRY_LIMIT');
    const checksum = header.reduce((a, b, i) => a + (i >= 148 && i < 156 ? 32 : b), 0);
    assert.equal(octal(header.subarray(148, 156)), checksum, 'TAR_CHECKSUM_MISMATCH');
    assert.equal(text(header.subarray(257, 263)).trim(), 'ustar', 'UNSUPPORTED_TAR_FORMAT');
    const name = text(header.subarray(0, 100)); const prefix = text(header.subarray(345, 500));
    const path = prefix ? prefix + '/' + name : name;
    const type = header[156];
    assert.ok(type === 0 || type === 48 || type === 53, 'UNSUPPORTED_TAR_ENTRY');
    assert.ok(!/[\\\x00-\x1f\x7f:]/.test(path) && !path.startsWith('/'), 'UNSAFE_TAR_PATH');
    const parts = path.replace(/\/$/, '').split('/');
    assert.ok(parts[0] === 'package' && parts.every(p => p && p !== '.' && p !== '..'), 'UNSAFE_TAR_PATH');
    assert.ok((octal(header.subarray(100, 108)) & ~0o777) === 0, 'UNSAFE_TAR_MODE');
    const size = octal(header.subarray(124, 136));
    assert.ok(size <= 2_097_152 && size <= data.length - offset, 'ARCHIVE_ENTRY_SIZE');
    if (type === 53) assert.equal(size, 0, 'INVALID_TAR_DIRECTORY');
    else {
      assert.ok(!entries.has(path), 'DUPLICATE_TAR_ENTRY');
      assert.ok(!parts.some(p => p.startsWith('.')), 'HIDDEN_PACKAGE_FILE');
      entries.set(path, data.subarray(offset, offset + size));
    }
    offset += Math.ceil(size / 512) * 512;
  }
  assert.ok(ended && data.subarray(offset).every(b => b === 0), 'TRAILING_OR_TRUNCATED_TAR');
  return entries;
}
