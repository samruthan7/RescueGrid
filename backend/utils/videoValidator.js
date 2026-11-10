/**
 * Video Magic Bytes & MIME Validator
 * Inspects binary file header to verify valid MP4, WebM, or QuickTime (MOV)
 */

const ALLOWED_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

/**
 * Checks magic bytes against known video signatures
 * @param {Buffer} buffer - first 64 bytes of file buffer
 * @returns {{ isValid: boolean, detectedFormat: string|null, error: string|null }}
 */
function verifyVideoMagicBytes(buffer) {
  if (!buffer || buffer.length < 12) {
    return {
      isValid: false,
      detectedFormat: null,
      error: 'File is too small or corrupt to determine video signature.'
    };
  }

  // 1. WebM: Starts with EBML Header 0x1A 0x45 0xDF 0xA3
  if (
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return { isValid: true, detectedFormat: 'webm', error: null };
  }

  // 2. MP4 / ISO BMFF: Bytes 4-7 contain "ftyp" (0x66 0x74 0x79 0x70)
  const boxType = buffer.toString('ascii', 4, 8);
  if (boxType === 'ftyp') {
    // Sub-brand check: isom, mp41, mp42, qt, M4V, etc.
    const subBrand = buffer.toString('ascii', 8, 12);
    if (subBrand.toLowerCase().includes('qt')) {
      return { isValid: true, detectedFormat: 'quicktime', error: null };
    }
    return { isValid: true, detectedFormat: 'mp4', error: null };
  }

  // 3. QuickTime (MOV): Common box types at offset 4: "moov", "mdat", "wide", "free"
  if (['moov', 'mdat', 'wide', 'free'].includes(boxType)) {
    return { isValid: true, detectedFormat: 'quicktime', error: null };
  }

  return {
    isValid: false,
    detectedFormat: null,
    error: 'File signature (magic bytes) does not match valid MP4, WebM, or QuickTime format.'
  };
}

module.exports = {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  verifyVideoMagicBytes
};
