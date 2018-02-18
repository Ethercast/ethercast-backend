import * as _ from 'underscore';
import * as shajs from 'sha.js';

const NUM_FIELDS = 5;

export function choose(fields: string[], k: number): string[][] {
  if (k === 0) return [];
  if (k === 1) return fields.map((val) => [val]);

  const chosen = fields.map((val, ix) => {
    const subfields = fields.slice(ix + 1);
    return choose(subfields, k - 1)
      .map((subchosen) => [val, ...subchosen]);
  });

  return _.flatten(chosen);
}

export function chooseUpTo(fields: string[], n: number): string[][] {
  let chosen: string[][] = [];
  for (let i = 1; i <= n; ++i) {
    chosen = chosen.concat(choose(fields, i));
  }
  return chosen;
}

export function hash(fields: string[]): string {
  return shajs('sha256').update(fields).digest('hex');
}

export function generateTopics(fields: string[]): string[] {
  return chooseUpTo(fields, NUM_FIELDS)
    .map(hash)
    .map((topic) => `sub-${topic}`);
}
