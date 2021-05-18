import SCNT, {SCNTOpts } from '../src/scnt';

import {
  makeEmptyLineStatistics,
  makeEmptyCharacterStatistics,
  makeEmptyStatistics,
} from '../src/stats';

import { describe } from 'mocha';
import { expect } from 'chai';

describe('SCNT Class', () => {

  it('constructs with empty stats', () => {
    const obj = new SCNT();

    expect(obj.lineStatistics).to.eql( makeEmptyLineStatistics() );
    expect(obj.characterStatistics).to.eql( makeEmptyCharacterStatistics() );
    expect(obj.statistics).to.eql( SCNT.EmptyStatistics );
  });

  it('has the same default options', () => {
    
    const obj = new SCNT();
    expect(obj.options).to.eql(SCNT.DefaultOptions);
  });

  describe('#reset()', () => {
    it('results in empty objects', () => {
      const obj = new SCNT();
      obj['_lineStats'].total = 123;
      obj['_charStats'].total = 456;

      expect(obj.lineStatistics).to.have.property('total', 123);
      expect(obj.characterStatistics).to.have.property('total', 456);

      obj.reset();

      expect(obj.lineStatistics).to.have.property('total', 0);
      expect(obj.characterStatistics).to.have.property('total', 0);
    });
  });

  describe('#applyOptions()', () => {
    it('accepts a given object', () => {
      const obj = new SCNT();
      expect(obj.applyOptions({ requireExtension: true }))
        .to.eql({
          requireExtension: true,
          parseUnknownAs: 'reject',
        });
    });

    it('accepts an empty object', () => {
      const obj = new SCNT();
      expect(obj.applyOptions({}))
        .to.eql(SCNT.DefaultOptions);
    });

    it('accepts an object with unknown properties', () => {
      const obj = new SCNT();
      expect(obj.applyOptions({some: 'example'} as SCNTOpts))
        .to.eql({
          ...SCNT.DefaultOptions,
          some: 'example',
        });
    });
  });

});