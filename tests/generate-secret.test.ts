import generateSecret from '../src/util/generate-secret';
import { expect } from 'chai';
import * as _ from 'underscore';
import * as Joi from 'joi';

describe('#generateSecret', () => {

  _.each([ 1, 2, 3, 8, 16, 64 ], length => {
    it(`generates of appropriate length: ${length}`, async () => {
      expect((await generateSecret(length)).length).to.eq(length);
    });
  });

  it('generates default length 64', async () => {
    expect((await generateSecret()).length).to.eq(64);
  });

  it('is alphanumeric', async () => {
    const hex = await generateSecret(64);

    expect(Joi.string().validate(hex).error).to.be.null;
  });
});