import * as zlib from 'zlib';

export function parseMessage(base64Message: string): any {
  const bfr = Buffer.from(base64Message, 'base64');
  const decompressed = zlib.inflateSync(bfr);
  return JSON.parse(decompressed.toString('utf8'));
}

export function createMessage(obj: any): string {
  const bfr = Buffer.from(JSON.stringify(obj), 'utf8');
  const compressed = zlib.deflateSync(bfr);
  return compressed.toString('base64');
}