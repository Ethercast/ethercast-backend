import { getConditionCombinations } from '../handlers/util/subscribe-to-topics';
import { expect } from 'chai';
import { ConditionType } from '../handlers/util/subscription-crud';

describe('getAndedConditionCombinations', () => {
  it('works with no elements', () => {
    expect(getConditionCombinations([])).to.deep.eq([]);
  });


  it('works with one condition', () => {
    expect(
      getConditionCombinations(
        [
          [
            {
              type: ConditionType.address,
              value: '0x'
            }
          ]
        ]
      )
    ).to.deep.eq([
      [
        {
          type: 'address',
          value: '0x'
        }
      ]
    ]);
  });

  it('works with two and-ed conditions', () => {
    expect(
      getConditionCombinations(
        [
          [
            {
              type: ConditionType.address,
              value: '0xa'
            }
          ],
          [
            {
              type: ConditionType.topic0,
              value: '0xb'
            }
          ]
        ]
      )
    ).to.deep.eq([
      [
        {
          type: ConditionType.address,
          value: '0xa'
        },
        {
          type: ConditionType.topic0,
          value: '0xb'
        }
      ],
      // we have duplicates, that's fine.
      [
        {
          type: ConditionType.topic0,
          value: '0xb'
        },
        {
          type: ConditionType.address,
          value: '0xa'
        }
      ]
    ]);
  });
});
