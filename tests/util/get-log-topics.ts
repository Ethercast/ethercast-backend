import * as _ from 'underscore';
import * as shajs from 'sha.js';

const NUM_FIELDS = 5;

export default function getLogTopics({ address, topics }: { address: string, topics: string[] }): string[] {
  const fields = [address, ...topics];
  return chooseUpTo(fields, NUM_FIELDS)
    .map(hash)
    .map(topic => `sub-${topic}`);
}

export function choose(fields: string[], k: number): string[][] {
  if (k === 0) return [];
  if (k === 1) return fields.map((val) => [val]);

  const chosen = fields.map((val, ix) => {
    return choose(fields.slice(0, ix), k - 1)
      .map((subchosen) => [val, ...subchosen]);
  });

  return _.flatten(chosen);
}

export function chooseUpTo(fields: string[], n: number): string[][] {
  const chosen = [];
  for (let i = 1; i <= n; ++i) {
    chosen.push(...choose(fields, i));
  }
  return chosen;
}

export function hash(fields: string[]): string {
  return shajs('sha256').update(Array.isArray(fields) ? fields.join() : fields).digest('hex');
}
