import { getCombinations } from '../handlers/util/subscribe-to-topics';
import { expect } from 'chai';
import { ConditionType } from '../handlers/util/subscription-crud';

describe('getCombinations', () => {
  it('works with no elements', () => {
    expect(getCombinations([])).to.deep.eq([]);
  });


  it('works with one condition', () => {
    expect(
      getCombinations(
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
      getCombinations(
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
      ]
    ]);
  });

  it('works with two or-ed conditions', () => {
    expect(
      getCombinations(
        [
          [
            {
              type: ConditionType.address,
              value: '0xa'
            },
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
          }
        ],
        [
          {
            type: ConditionType.topic0,
            value: '0xb'
          }
        ]
    ]);
  });

  it('works with two and-ed and two or-ed conditions', () => {
    expect(
      getCombinations(
        [
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
          [
            {
              type: ConditionType.topic1,
              value: '0xc'
            },
            {
              type: ConditionType.topic1,
              value: '0xd'
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
          type: ConditionType.topic1,
          value: '0xc'
        }
      ],
      [
        {
          type: ConditionType.address,
          value: '0xa'
        },
        {
          type: ConditionType.topic1,
          value: '0xd'
        }
      ],
      [
        {
          type: ConditionType.topic0,
          value: '0xb'
        },
        {
          type: ConditionType.topic1,
          value: '0xc'
        }
      ],
      [
        {
          type: ConditionType.topic0,
          value: '0xb'
        },
        {
          type: ConditionType.topic1,
          value: '0xd'
        }
      ],
    ]);
  });
});