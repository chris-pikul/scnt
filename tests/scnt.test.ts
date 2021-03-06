import SCNT, {SCNTOpts } from '../src/scnt';

import {
  makeEmptyLineStatistics,
  makeEmptyCharacterStatistics,
} from '../src/stats';

import { describe } from 'mocha';
import { expect } from 'chai';
import Parser from '../src/parser';

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
          defaultParser: null,
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

  describe('#hasParser()', () => {
    const obj = new SCNT();
    const parser = new Parser();
    const parser2 = new Parser('plain2');

    it('false as default', () => {
      expect(obj.hasParser('any')).to.equal(false);
    });

    it('true after adding one, using string', () => {
      obj.addParser(parser);
      expect(obj.hasParser('plain')).to.equal(true);
    });

    it('true after adding one, by object', () => {
      obj.addParser(parser);
      expect(obj.hasParser(parser)).to.equal(true);
    });

    it('false after adding, with different string', () => {
      obj.addParser(parser);
      expect(obj.hasParser('test')).to.equal(false);
    });

    it('false after adding one, using another object', () => {
      obj.addParser(parser);
      expect(obj.hasParser(parser2)).to.equal(false);
    });
  });

  describe('#getParser()', () => {
    const obj = new SCNT();
    const parser = new Parser();
    const parser2 = new Parser('plain2');

    it('undefined as default', () => {
      expect(obj.getParser('')).to.be.undefined;
    });

    it('returns one by string', () => {
      obj.addParser(parser);
      expect(obj.getParser('plain')).to.equal(parser);
    });

    it('returns one by object', () => {
      obj.addParser(parser);
      expect(obj.getParser(parser)).to.equal(parser);
    });

    it('undefined on different string', () => {
      obj.addParser(parser);
      expect(obj.getParser('test')).to.be.undefined;
    });

    it('undefined on different object', () => {
      obj.addParser(parser);
      expect(obj.getParser(parser2)).to.be.undefined;
    });
  });

  describe('#addParser()', () => {
    const obj = new SCNT();
    const parser = new Parser();

    it('adds a Parser object', () => {
      obj.addParser(parser);
      expect(obj['_parsers']).to.include(parser);
    });

    it('does not add duplicates', () => {
      obj['_parsers'] = [];

      obj.addParser(parser);
      obj.addParser(parser);

      expect(obj['_parsers']).to.be.an('array').and.have.lengthOf(1);
    });

    it('adds an array of Parsers', () => {
      obj['_parsers'] = [];

      const parser2 = new Parser('plain2');
      const parser3 = new Parser('plain3');

      obj.addParser([ parser2, parser3 ]);
      expect(obj['_parsers']).to.be.an('array').and.have.lengthOf(2);
      expect(obj.hasParser(parser2)).to.be.true;
      expect(obj.hasParser(parser3)).to.be.true;
    });

    it('throws on undefined and null', () => {
      // @ts-ignore
      expect(() => obj.addParser(undefined)).to.throw();

      // @ts-ignore
      expect(() => obj.addParser(null)).to.throw();
    });

    it('throws on other types', () => {
      // @ts-ignore
      expect(() => obj.addParser(123)).to.throw();
      // @ts-ignore
      expect(() => obj.addParser({ some: 'test' })).to.throw();
    });

    it('throws on array of non-Parsers', () => {
      // @ts-ignore
      expect(() => obj.addParser([ { some: test }])).to.throw();
    });
  });

  describe('#hasParserForExtension()', () => {
    const obj = new SCNT();

    it('false on nothing', () => {
      // @ts-ignore
      expect(obj['hasParserForExtension']()).to.equal(false);
    });

    it('false on empty string', () => {
      expect(obj.hasParserForExtension('')).to.equal(false);
    });

    it('false on any string, after construction', () => {
      expect(obj.hasParserForExtension('jpg')).to.equal(false);
    });

    it('true after adding a valid parser', () => {
      const parser = new Parser();
      parser.addExtension('jpg');

      obj.addParser(parser);

      expect(obj.hasParserForExtension('jpg')).to.equal(true);
    });
  });

  describe('#getParserForExtension()', () => {
    const obj = new SCNT();

    it('null on nothing', () => {
      // @ts-ignore
      expect(obj['getParserForExtension']()).to.equal(null);
    });

    it('null on empty string', () => {
      expect(obj.getParserForExtension('')).to.equal(null);
    });

    it('null on any string, after construction', () => {
      expect(obj.getParserForExtension('jpg')).to.equal(null);
    });

    it('ok after adding valid parser', () => {
      const parser = new Parser();
      parser.addExtension('jpg');

      obj.addParser(parser);

      expect(obj.getParserForExtension('jpg')).to.equal(parser);
    });
  });

  
});
