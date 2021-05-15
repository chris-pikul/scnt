import Parser from './';
import {
  LineStats,
  CharacterStats,
  Statistics,
  makeEmptyLineStatistics,
  makeEmptyCharacterStatistics,
} from '../stats';

export default class CFamilyParser extends Parser {
  constructor() {
    super();

    this.extensions = [
      // C, C++ and C#
      'c',
      'cpp',
      'cc',
      'cxx',
      'cs',
      'h',
      'hpp',
      'hx',
      'hxx',

      // JavaScript
      'js',
      'mjs',
      'jsx',
      'ts',
      'tsx',

      // Java / Kotlin
      'java',
      'kt',
      'kts',
      'ktm',

      // PHP
      'php',
      'php5',

      // Apple family
      'm',
      'mm',
      'swift',

      // Scala
      'scala',
      'sc',

      // SASS/SCSS/LESS
      'sass',
      'scss',
      'less',

      // Other singular extensions
      'go',
      'rs',
    ];

    this.parse = this.parse.bind(this);
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

        // Check if there was anything but whitespace
        if(hadChar)
          lineStats.source++;
        else
          lineStats.whitespace++;

        charIndex = 0;
      };

      // Faster for iterator to simply go through them all.
      for(let ind = 0;ind < contents.length;ind++) {
        const char = contents[ind];

        switch(true) {
          // eslint-disable-next-line
          // Check if a Whitespace character
          case this.whitespacePattern.test(char):
            // Additionally check if new-line
            if(char === '\n')
              incrementLine();
            
            charStats.whitespace++;
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

      charStats.source = charStats.numerical + charStats.alphabetical + charStats.special;
      charStats.total = charStats.source + charStats.whitespace;
      
      lineStats.totalSource = lineStats.source;
      lineStats.total = lineStats.source + lineStats.whitespace + lineStats.empty;

      resolve([ lineStats, charStats ]);
    });
  }
}
