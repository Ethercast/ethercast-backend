interface Condition {
  type: 'address' | 'topic0' | 'topic1' | 'topic2' | 'topic3';
  value: string; // hex value of the type
}

interface Subscription {
  id: string; // uuid v4
  name: string; // reasonable max length
  description: string; // reasonable max length - longer

  // Conditions in the top-level array are AND-ed, conditions in nested arrays are OR-ed
  logic: Array<Array<Condition>>;
}

type Diff<T extends string, U extends string> = ({[P in T]: P } & {[P in U]: never } & { [x: string]: never })[T];
type Omit<T, K extends keyof T> = Pick<T, Diff<keyof T, K>>;

export async function createSubscription(subcription: Omit<Subscription, 'id'>): Promise<Subscription> {
  throw new Error('not implemented');
}

export async function deleteSubcription(): Promise<void> {
  throw new Error('not implemented');
}
