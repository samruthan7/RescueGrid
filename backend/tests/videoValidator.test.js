const test = require('node:test');
const assert = require('node:assert/strict');
const { verifyVideoMagicBytes, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } = require('../utils/videoValidator');

test('accepts MP4, WebM and QuickTime signatures', () => {
  const mp4=Buffer.from('0000ftypisom'); const webm=Buffer.from([0x1a,0x45,0xdf,0xa3,...new Array(8).fill(0)]);
  const mov=Buffer.from('0000moovxxxx');
  assert.equal(verifyVideoMagicBytes(mp4).detectedFormat,'mp4');
  assert.equal(verifyVideoMagicBytes(webm).detectedFormat,'webm');
  assert.equal(verifyVideoMagicBytes(mov).detectedFormat,'quicktime');
});
test('rejects truncated and spoofed video headers and keeps upload constraints', () => {
  assert.equal(verifyVideoMagicBytes(Buffer.from('tiny')).isValid,false);
  assert.equal(verifyVideoMagicBytes(Buffer.from('0000textfake')).isValid,false);
  assert.deepEqual(ALLOWED_MIME_TYPES,['video/mp4','video/webm','video/quicktime']);
  assert.equal(MAX_FILE_SIZE,50*1024*1024);
});
