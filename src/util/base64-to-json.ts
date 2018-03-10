import * as zlib from 'zlib';

export default function base64ToJson(b64: string, compressed: boolean = true): string {
  const bfr = Buffer.from(b64, 'base64');
  const decompressed = compressed ? zlib.inflateSync(bfr) : bfr;
  return decompressed.toString('utf8');
}