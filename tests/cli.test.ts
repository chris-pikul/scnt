import {
  optCollectRegexs,
  optAliases,
} from '../src/cli';

import { describe } from 'mocha';
import { expect } from 'chai';

describe('Command Line Interface', () => {
  describe('#optCollectRegexs()', () => {
    it('accepts a regular regex', () => {
      expect(optCollectRegexs('/test/')).to.eql([/test/]);
    });

    it('wraps in slashes for validity', () => {
      expect(optCollectRegexs('test')).to.eql([/test/]);
    });

    it('throws on invalid regex', () => {
      expect(() => optCollectRegexs('\\')).to.throw();
    });
  });
});
