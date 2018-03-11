import { randomBytes } from 'crypto';

export default function generateSecret(length: number = 64): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    randomBytes(
      Math.ceil(length / 2),
      function (err, buffer) {
        if (err) {
          reject(err);
        } else {
          resolve(buffer.toString('hex').substring(0, length));
        }
      }
    );
  });
}