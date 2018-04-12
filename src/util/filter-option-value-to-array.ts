import { FilterOptionValue } from '@ethercast/backend-model';

export default function filterOptionValueToArray(value?: FilterOptionValue): string[] {
  if (typeof value === 'undefined' || value === null) {
    return [];
  } else if (typeof value === 'string') {
    return [ value ];
  } else {
    return value;
  }
}
