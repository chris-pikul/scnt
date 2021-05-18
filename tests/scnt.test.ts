import SCNT, {SCNTOpts } from '../src/scnt';

import {
  makeEmptyLineStatistics,
  makeEmptyCharacterStatistics,
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

  it('will take in an options object and apply it', () => {
    const obj = new SCNT({
      requireExtension: true,
    });
    expect(obj.options).to.have.property('requireExtension').that.equals(true);
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
    it('accepts nothing, but returns default', () => {
      const obj = new SCNT();
      // @ts-ignore
      expect(obj.applyOptions())
        .to.eql(SCNT.DefaultOptions);
    });

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

  describe('#decrement()', () => {
    const obj = new SCNT();
    obj['_lineStats'].total = 10;
    obj['_lineStats'].source = 5;
    obj['_charStats'].total = 20;
    obj['_charStats'].source = 15;

    const ln = makeEmptyLineStatistics();
    ln.total = 10;
    ln.source = 5;

    const char = makeEmptyCharacterStatistics();
    char.total = 20;
    char.source = 15;
    
    it('should set the stats before testing', () => {
      expect(obj.lineStatistics, 'init line stats').to.eql( ln );
      expect(obj.characterStatistics, 'init char stats').eql( char );
    });

    it('should properly decrement', () => {
      obj['decrement']([ ln, char ]);
  
      expect(obj.lineStatistics, 'expected line stats').to.eql( makeEmptyLineStatistics() );
      expect(obj.characterStatistics, 'expected character stats').to.eql( makeEmptyCharacterStatistics() );
    });
  });

  describe('#increment()', () => {
    const obj = new SCNT();

    // these numbers don't make sense. It's ok.
    const ln = {
      total: 20,
      totalSource: 0,
      source: 0,
      totalComments: 10,
      inlineComments: 0,
      blockComments: 0,
      mixed: 0,
      whitespace: 5,
      empty: 0,
    };

    const char = {
      total: 30,
      source: 0,
      comment: 0,
      whitespace: 0,
      numerical: 10,
      alphabetical: 0,
      special: 8,
    };
    
    it('should increment the numbers', () => {
      obj['increment']([ ln, char ]);

      expect(obj.lineStatistics, 'line stats').to.eql( ln );
      expect(obj.characterStatistics, 'char stats').to.eql( char );
    });
  });
});
