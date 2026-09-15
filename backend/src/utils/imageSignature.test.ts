import { detectImageType } from './imageSignature';

// real magic-number headers, padded with a few content bytes the way a
// genuine file would continue
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const GIF = Buffer.from('GIF89a\x01\x00\x01\x00', 'latin1');
const WEBP = Buffer.from('RIFF\x24\x00\x00\x00WEBPVP8 ', 'latin1');
const BMP = Buffer.from('BM\x76\x00\x00\x00', 'latin1');

describe('detectImageType', () => {
  it.each([
    ['jpeg', JPEG, 'image/jpeg', '.jpg'],
    ['png', PNG, 'image/png', '.png'],
    ['gif', GIF, 'image/gif', '.gif'],
    ['webp', WEBP, 'image/webp', '.webp'],
    ['bmp', BMP, 'image/bmp', '.bmp'],
  ])('detects %s from its header', (_name, data, mimetype, extension) => {
    expect(detectImageType(data)).toEqual({ mimetype, extension });
  });

  it.each([
    ['an empty buffer', Buffer.alloc(0)],
    ['plain text', Buffer.from('definitely not an image')],
    ['a windows executable header', Buffer.from('MZ\x90\x00\x03\x00\x00\x00', 'latin1')],
    ['a truncated jpeg header (2 of 3 bytes)', Buffer.from([0xff, 0xd8])],
    ['a truncated png header (7 of 8 bytes)', PNG.subarray(0, 7)],
    ['a png with one corrupted signature byte', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x00, 0x00, 0x00])],
    ['a RIFF container that is WAVE audio, not WEBP', Buffer.from('RIFF\x24\x00\x00\x00WAVEfmt ', 'latin1')],
  ])('returns null for %s', (_name, data) => {
    expect(detectImageType(data)).toBeNull();
  });
});
