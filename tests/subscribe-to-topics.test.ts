import { getAndedConditionCombinations, generateTopics, hash } from '../handlers/util/subscribe-to-topics';
import { expect } from 'chai';
import { ConditionType } from '../handlers/util/subscription-crud';

describe('getAndedConditionCombinations', () => {
  it('works with no elements', () => {
    expect(getAndedConditionCombinations([])).to.deep.eq([]);
    expect(generateTopics([])).to.deep.eq([]);
  });


  it('works with one condition', () => {
    const logic = [
      [
        {
          type: ConditionType.address,
          value: '0x'
        }
      ]
    ];
    expect(getAndedConditionCombinations(logic)).to.deep.eq([
      [
        {
          type: 'address',
          value: '0x'
        }
      ]
    ]);
    expect(generateTopics(logic)).to.deep.eq([
      `sub-${hash(['0x'])}`
    ]);
  });

  it('works with two and-ed conditions', () => {
    const logic = [
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
    ];
    expect(getAndedConditionCombinations(logic)).to.deep.eq([
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
    expect(generateTopics(logic)).to.deep.eq([
      `sub-${hash(['0xa', '0xb'])}`
    ]);
  });

  it('works with two or-ed conditions', () => {
    const logic = [
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
    ];
    expect(getAndedConditionCombinations(logic)).to.deep.eq([
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
    expect(generateTopics(logic)).to.deep.eq([
      `sub-${hash(['0xa'])}`,
      `sub-${hash(['0xb'])}`,
    ]);
  });

  it('works with two and-ed and two or-ed conditions', () => {
    const logic = [
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
    ];
    expect(getAndedConditionCombinations(logic)).to.deep.eq([
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
    expect(generateTopics(logic)).to.deep.eq([
      `sub-${hash(['0xa', '0xc'])}`,
      `sub-${hash(['0xa', '0xd'])}`,
      `sub-${hash(['0xb', '0xc'])}`,
      `sub-${hash(['0xb', '0xd'])}`,
    ]);
  });
});
