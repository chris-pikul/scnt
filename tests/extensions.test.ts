import {
  hasExtension,
  cleanExtension,
  extractExtension,
} from '../src/extensions';

import { describe } from 'mocha';
import { expect } from 'chai';

describe('Extension Utilities', () => {
  describe('#hasExtension()', () => {
    it('false on non-string types', () => {
      // @ts-ignore
      expect(hasExtension(undefined)).equals(false, 'undefined value');
      // @ts-ignore
      expect(hasExtension(null)).equals(false, 'null value');
      // @ts-ignore
      expect(hasExtension(123)).equals(false, 'number value');
      // @ts-ignore
      expect(hasExtension({ some: 'value' })).equals(false, 'object value');
      // @ts-ignore
      expect(hasExtension(['a', 'r', 'r', 'a', 'y'])).equals(false, 'array value');
    });

    it('false on empty strings', () => {
      expect(hasExtension('')).to.be.a('boolean').and.equal(false);
    });

    it('false on hidden files', () => {
      expect(hasExtension('.gitignore')).to.be.a('boolean').and.equal(false);
      expect(hasExtension('.examp')).to.be.a('boolean').and.equal(false);
    });

    it('false on strings ending with .', () => {
      expect(hasExtension('sometest.')).to.be.a('boolean').and.equal(false);
      expect(hasExtension('some.test.')).to.be.a('boolean').and.equal(false);
      expect(hasExtension('sometes.t')).to.be.a('boolean').and.equal(true);
    });
  });

  describe('#cleanExtension()', () => {
    it('empty on non-string types', () => {
      // @ts-ignore
      expect(cleanExtension(undefined)).equals('', 'undefined value');
      // @ts-ignore
      expect(cleanExtension(null)).equals('', 'null value');
      // @ts-ignore
      expect(cleanExtension(123)).equals('', 'number value');
      // @ts-ignore
      expect(cleanExtension({ some: 'value' })).equals('', 'object value');
      // @ts-ignore
      expect(cleanExtension(['a', 'r', 'r', 'a', 'y'])).equals('', 'array value');
    });

    it('empty on empty strings', () => {
      expect(cleanExtension('')).to.be.a('string').and.equal('');
    });

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
  });

  describe('#extractExtension()', () => {
    it('empty on non-string types', () => {
      // @ts-ignore
      expect(extractExtension(undefined)).equals('', 'undefined value');
      // @ts-ignore
      expect(extractExtension(null)).equals('', 'null value');
      // @ts-ignore
      expect(extractExtension(123)).equals('', 'number value');
      // @ts-ignore
      expect(extractExtension({ some: 'value' })).equals('', 'object value');
      // @ts-ignore
      expect(extractExtension(['a', 'r', 'r', 'a', 'y'])).equals('', 'array value');
    });

    it('empty on empty strings', () => {
      expect(extractExtension('')).to.be.a('string').and.equal('');
    });

    it('empty on hidden files', () => {
      expect(extractExtension('.gitignore')).to.be.a('string').and.equal('');
    });

    it('empty on strings ending with .', () => {
      expect(extractExtension('sometype.')).to.be.a('string').and.equal('');
      expect(extractExtension('some.type.')).to.be.a('string').and.equal('');
      expect(extractExtension('sometyp.e')).to.be.a('string').and.equal('e');
    });

    it('empty on bad characters', () => {
      expect(extractExtension('some.bad\/ext')).to.equal('');
    });

    it('returns as expected for common filenames', () => {
      expect(extractExtension('some.jpg')).to.be.a('string').and.equal('jpg');
      expect(extractExtension('Cased.BmP')).to.be.a('string').and.equal('bmp');
      expect(extractExtension('multi.ext.file')).to.be.a('string').and.equal('file');
    });
  });
});