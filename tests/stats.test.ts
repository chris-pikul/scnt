import {
  makeEmptyLineStatistics,
  makeEmptyCharacterStatistics,
  makeEmptyStatistics,
} from '../src/stats';

import { describe } from 'mocha';
import { expect } from 'chai';

const testEmptyLines = (obj:any) => {
  it('should have a "total" number property', () => {
    expect(obj).to.have.property('total').that.is.a('number').equal(0);
  });

  it('should have a "totalSource" number property', () => {
    expect(obj).to.have.property('total').that.is.a('number').equal(0);
  });

  it('should have a "source" number property', () => {
    expect(obj).to.have.property('source').that.is.a('number').equal(0);
  });

  it('should have a "totalComments" number property', () => {
    expect(obj).to.have.property('totalComments').that.is.a('number').equal(0);
  });

  it('should have a "inlineComments" number property', () => {
    expect(obj).to.have.property('inlineComments').that.is.a('number').equal(0);
  });

  it('should have a "blockComments" number property', () => {
    expect(obj).to.have.property('blockComments').that.is.a('number').equal(0);
  });

  it('should have a "mixed" number property', () => {
    expect(obj).to.have.property('mixed').that.is.a('number').equal(0);
  });

  it('should have a "whitespace" number property', () => {
    expect(obj).to.have.property('whitespace').that.is.a('number').equal(0);
  });

  it('should have a "empty" number property', () => {
    expect(obj).to.have.property('empty').that.is.a('number').equal(0);
  });
};

const testEmptyCharacters = (obj:any) => {
  it('should have a "total" number property', () => {
    expect(obj).to.have.property('total').that.is.a('number').equal(0);
  });

  it('should have a "source" number property', () => {
    expect(obj).to.have.property('source').that.is.a('number').equal(0);
  });

  it('should have a "comment" number property', () => {
    expect(obj).to.have.property('comment').that.is.a('number').equal(0);
  });

  it('should have a "whitespace" number property', () => {
    expect(obj).to.have.property('whitespace').that.is.a('number').equal(0);
  });

  it('should have a "numerical" number property', () => {
    expect(obj).to.have.property('numerical').that.is.a('number').equal(0);
  });

  it('should have a "alphabetical" number property', () => {
    expect(obj).to.have.property('alphabetical').that.is.a('number').equal(0);
  });
};

describe('Statistics Objects', () => {
  describe('#makeEmptyLineStatistics()', () => {
    const obj = makeEmptyLineStatistics();
    testEmptyLines(obj);
  });

  describe('#makeEmptyCharacterStatistics()', () => {
    const obj = makeEmptyCharacterStatistics();
    testEmptyCharacters(obj);
  });

  describe('#makeEmptyStatistics()', () => {
    const obj = makeEmptyStatistics();

    it('should be an array with length of 2', () => {
      expect(obj).to.be.an('array').with.a.lengthOf(2);
    });

    it('should have index 0 match empty line statistics', () => {
      testEmptyLines(obj[0]);
    });

    it('should have index 1 match empty character statistics', () => {
      testEmptyCharacters(obj[1]);
    });
  });
});
