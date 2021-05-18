import Parser, { cleanExtension } from '../../src/parser';

import { describe } from 'mocha';
import { expect, assert } from 'chai';

describe('Parser', () => {
  const obj = new Parser();

  it('has the known "plain" id', () => expect(obj).to.have.property('id', 'plain'));
  it('has the known "Plain Test" name', () => expect(obj).to.have.property('name', 'Plain Text'));

  describe('#cleanExtension()', () => {
    it('rejects bad characters', () => {
      expect(cleanExtension('bad\/ext')).to.equal('');
    });

    it('crops dots', () => {
      expect(cleanExtension('some.jpg')).to.equal('jpg');
    });

    it('normalizes them', () => {
      expect(cleanExtension('JpEg ')).to.equal('jpeg');
    });

    it('allows standards', () => {
      expect(cleanExtension('jpeg')).to.equal('jpeg');
    });
  })

  describe('has/add/remove extensions', () => {
    it('returns false to empty string', () => {
      expect(obj.hasExtension('')).to.equal(false)
    });

    it('returns true to "test"', () => {
      const rtn = obj.addExtension('test');
      expect(rtn).to.equal(true);
    });

    it('returns false to "test" again', () => {
      const rtn = obj.addExtension('test');
      expect(rtn).to.equal(false);
    });

    it('returns true when hasExtension() is asked about test', () => {
      const rtn = obj.hasExtension('test');
      expect(rtn).to.equal(true);
    });

    it('returns false to "none"', () => {
      const rtn = obj.removeExtension('none');
      expect(rtn).to.equal(false);
    });

    it('returns true from hasExtension for ".test"', () => {
      const rtn = obj.hasExtension('.test');
      expect(rtn).to.equal(true);
    })

    it('returns true to ".test" (from earlier)', () => {
      const rtn = obj.removeExtension('.test');
      expect(rtn).to.equal(true);
    });

    it('returns false from hasExtension now for "test"', () => {
      const rtn = obj.hasExtension('test');
      expect(rtn).to.equal(false);
    });

    it('will not use illegal extensions', () => {
      expect(obj.hasExtension('bad\/ext'), 'hasExtension').to.equal(false);
      expect(obj.addExtension('bad\/ext'), 'addExtension').to.equal(false);
      expect(obj.hasExtension('bad\/ext'), 'hasExtension after add').to.equal(false);
      expect(obj.removeExtension('bad\/ext'), 'removeExtension').to.equal(false);
    })
  });

  it('rejects if empty contents', () => {
    return obj.parse('')
      .then(
        () => Promise.reject(new Error('Expected method to reject')),
        err => assert.instanceOf(err, Error)
      );
  });

  it('processes the results as expected', async () => {
    const content = `123\nabc\n!@#\n\t\r\n\r\n\tdef`;
    const res = await obj.parse(content);
    
    expect(res).to.be.a('array', 'results where not an array')
      .and.have.lengthOf(2, 'incorrect length of array');

    const [ lines, chars ] = res;

    expect(lines).to.eql({
      total: 6,
      totalSource: 4,
      source: 4,
      totalComments: 0,
      inlineComments: 0,
      blockComments: 0,
      mixed: 0,
      whitespace: 1,
      empty: 1,
    }, 'lines had the wrong information');

    expect(chars).to.eql({
      total: 14,
      source: 12,
      comment: 0,
      whitespace: 2,
      numerical: 3,
      alphabetical: 6,
      special: 3,
    }, 'characters had the wrong information');
  });
});
