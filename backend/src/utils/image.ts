// Detects the real image type from the first bytes of the file ("magic bytes").
// We do not trust the type the phone says, because Android sometimes sends odd values like "image/jpg".
export function detectImageExt(buf: Buffer): '.jpg' | '.png' | '.webp' | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return '.jpg';
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buf.length >= 8 && buf.subarray(0, 8).equals(png)) return '.png';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return '.webp';
  }
  return null;
}
