import {
  LineStats,
  CharacterStats,
  Statistics,
  makeEmptyLineStatistics,
  makeEmptyCharacterStatistics,
} from '../stats';

import { cleanExtension } from '../extensions';

/**
 * The base interface for a Parser
 */
export interface IParser {

  /**
   * Readonly ID for this parser. This is primarily used as a unique key for
   * this parser and isn't directly reported by formatters.
   */
  readonly id: string;

  /**
   * A human-friendly name for this parser. This is directly used by formatters
   * for generating reports with friendlier naming.
   */
  readonly name: string;

  /**
   * Given the contents of a file (as a string), it will parse the data and
   * generate a Statistics report of the final tallys. This report is handled
   * asynchrounously using a promise.
   * 
   * @param contents File contents
   */
  parse(contents:string):Promise<Statistics>;

  /**
   * Returns a copy of the current list of extensions.
   * 
   * @returns Array of strings
   */
  getExtensions():string[];

  /**
   * Checks if the given extension is handled by this parser (reported to be).
   * 
   * @param ext String of a file extension
   * @returns True if the extension is present
   */
  hasExtension(ext:string):boolean;

  /**
   * Adds a new extension to the list of those handled by this parser.
   * Will return true if the extension was added, false otherwise. This false
   * case can be because the extension added is invalid (empty, or
   * generally malformed), or because it already existed.
   * 
   * @param ext String of a file extension
   * @returns True if the extension was added
   */
  addExtension(ext:string):boolean;

  /**
   * Removes an existing extension from the list of those handled by this
   * parser. Will return true if the extension exists and was removed, false
   * otherwise. This false case can be because the extension to remove is 
   * invalid (empty, or generally malformed), or because it doesn't exist.
   * 
   * @param ext String of a file extension
   * @returns True if the extension was removed
   */
  removeExtension(ext:string):boolean;
};

export default class Parser implements IParser {
  /**
   * Readonly ID for this parser. This is primarily used as a unique key for
   * this parser and isn't directly reported by formatters.
   */
  public readonly id:string = 'plain';

  /**
   * A human-friendly name for this parser. This is directly used by formatters
   * for generating reports with friendlier naming.
   */
  public readonly name:string = 'Plain Text';

  /**
   * Array of file extensions that are handled by this parser.
   */
  protected extensions:string[] = [];

  protected readonly whitespacePattern:RegExp = /\s/;

  protected readonly numericalPattern:RegExp = /\d/;
  
  protected readonly alphabeticalPattern:RegExp = /[A-Za-z]/;

  /**
   * Creates a new Parser object. All parameters are considered optional and are
   * provided for quickly composing new Parser types using this base class.
   * 
   * @param id Optional ID to override the class default
   * @param name Optional name to override the class default
   * @param extensions Optional single, or array, of file extensions
   */
  constructor(id?:(string|null), name?:(string|null), extensions?:(string|string[]|null)) {
    this.parse = this.parse.bind(this);

    this.getExtensions = this.getExtensions.bind(this);
    this.hasExtension = this.hasExtension.bind(this);
    this.addExtension = this.addExtension.bind(this);
    this.removeExtension = this.removeExtension.bind(this);

    if(typeof id === 'string' && id.length > 0)
      this.id = id;

    if(typeof name === 'string' && name.length > 0)
      this.name = name;

    if(typeof extensions === 'string' || (typeof extensions === 'object' && Array.isArray(extensions)))
      this.addExtension(extensions);
  }

  public parse(contents:string):Promise<Statistics> {
    return new Promise<Statistics>((resolve, reject) => {
      if(contents.length === 0)
        reject(new Error('Parser.parse received empty contents'));

      const lineStats: LineStats = makeEmptyLineStatistics();
      const charStats: CharacterStats = makeEmptyCharacterStatistics();

      let charIndex = 0;
      let hadChar = false;

      const incrementLine = () => {
        // Check if the line was totally empty
        if(charIndex === 0)
          lineStats.empty++;
        else if(hadChar)
          lineStats.source++;
        else
          lineStats.whitespace++;
        
        charIndex = 0;
        hadChar = false;
      };

      // Faster for iterator to simply go through them all.
      for(let ind = 0;ind < contents.length;ind++) {
        const char = contents[ind];

        switch(true) {
          // eslint-disable-next-line
          // Check if a Whitespace character
          case this.whitespacePattern.test(char):
            
            // Additionally check if new-line
            if(char === '\n') {
              // Peek and check if we should correct for CRLF style
              if(ind > 1) {
                const peek = contents[ind - 1];
                if(peek === '\r') {
                  charIndex--;
                  charStats.whitespace--;
                }
              }

              incrementLine();

              continue;
            } else {
              charStats.whitespace++;
            }
            
            break;

          // Check if Numerical
          case this.numericalPattern.test(char):
            hadChar = true;
            charStats.numerical++;
            break;

          // Check if Alphabetical
          case this.alphabeticalPattern.test(char):
            hadChar = true;
            charStats.alphabetical++;
            break;

          // Remaining must be special character than
          default:
            hadChar = true;
            charStats.special++;
        }

        charIndex++;
      }

      // Catch the last leftovers before EOF
      incrementLine();

      // Tally up the numbers
      charStats.source = charStats.numerical + charStats.alphabetical + charStats.special;
      charStats.total = charStats.source + charStats.whitespace;
      
      lineStats.totalSource = lineStats.source;
      lineStats.total = lineStats.source + lineStats.whitespace + lineStats.empty;

      resolve([ lineStats, charStats ]);
    });
  }

  /**
   * Returns a copy of the current list of extensions.
   * 
   * @returns Array of strings
   */
  getExtensions():string[] {
    return [ ...this.extensions ];
  }

  /**
   * Checks if the given extension is handled by this parser (reported to be).
   * 
   * @param ext String of a file extension
   * @returns True if the extension is present
   */
  public hasExtension(ext:string):boolean {
    const cln = cleanExtension(ext);
    return cln !== '' && this.extensions.includes(cln);
  }

  /**
   * Adds a new extension to the list of those handled by this parser.
   * Will return true if the extension was added, false otherwise. This false
   * case can be because the extension added is invalid (empty, or
   * generally malformed), or because it already existed.
   * 
   * @param ext String of a file extension, OR an array of strings
   * @returns True if the extension was added
   */
  public addExtension(ext:(string|string[])):boolean {
    // Process the array if one is provided
    if(typeof ext === 'object' && Array.isArray(ext)) {
      return ext.map(ent => this.addExtension(ent))
        .reduce((acc, cur) => (acc || cur), false);
    }

    if(typeof ext !== 'string')
      throw new TypeError(`Invalid type applied to addExtension, expected either a string or array of strings, instead found "${typeof ext}"!`);
    
    // Otherwise treat as a string
    const cln = cleanExtension(ext);
    if(cln === '' || this.extensions.includes(cln))
      return false;
    return (this.extensions.push(cln) > 0);
  }

  /**
   * Removes an existing extension from the list of those handled by this
   * parser. Will return true if the extension exists and was removed, false
   * otherwise. This false case can be because the extension to remove is 
   * invalid (empty, or generally malformed), or because it doesn't exist.
   * 
   * @param ext String of a file extension
   * @returns True if the extension was removed
   */
  public removeExtension(ext:string):boolean {
    const cln = cleanExtension(ext);
    if(cln === '')
      return false;

    const ind = this.extensions.findIndex(ent => ent === cln);
    if(ind === -1)
      return false;

    return (this.extensions.splice(ind, 1).length > 0);
  }
}

export type ParserClassType =
  new (id?:(string|null), name?:(string|null), extensions?:(string|string[]|null)) => Parser;
