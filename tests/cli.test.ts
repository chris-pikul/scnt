import {
  optCollectRegexs,
  optAliases,
} from '../src/cli';

import { describe } from 'mocha';
import { expect } from 'chai';

describe('Command Line Interface', () => {
  describe('#optCollectRegexs()', () => {
    it('accepts a regular regex', () => {
      const res = optCollectRegexs('/test/');
      expect(res).to.be.an('Array').with.lengthOf(1);
      expect(res[0]).to.be.a('RegExp');
    });
    
    it('throws on invalid regex', () => {
      expect(() => optCollectRegexs('(')).to.throw();
    });
  });
});
