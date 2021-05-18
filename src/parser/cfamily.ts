import Parser from './';
import {
  LineStats,
  CharacterStats,
  Statistics,
  makeEmptyLineStatistics,
  makeEmptyCharacterStatistics,
} from '../stats';

export default class CFamilyParser extends Parser {
  public readonly id:string = 'cfamily';
  
  public readonly name:string = 'C-Family';

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
      let hadSource = false;
      let inInline = false;
      let inBlock = false;

      const incrementLine = () => {
        if(inInline) {
          if(hadSource)
            lineStats.mixed++;
          else
            lineStats.inlineComments++;
        } else if(inBlock) {
          if(hadSource)
            lineStats.mixed++;
          else
            lineStats.blockComments++;
        } else {
          // Check if the line was totally empty
          if(charIndex === 0)
            lineStats.empty++;

          // Check if there was anything but whitespace
          if(hadChar)
            lineStats.source++;
        }

        if(!hadChar)
          lineStats.whitespace++;

        lineStats.total++;

        charIndex = 0;
        hadSource = false;
        inInline = false;
      };

      // Faster for iterator to simply go through them all.
      for(let ind = 0;ind < contents.length;ind++) {
        const char = contents[ind];

        // Check if already started comment before adding to char stat
        if(inInline || inBlock)
          charStats.comment++;

        // Make a tuple of this character, and the last, to test for comments
        const tuple = (ind > 0 && charIndex > 0) ? (`${contents[ind - 1]}${char}`) : ('');
        if(!inInline && !inBlock && tuple === '//') {
          inInline = true;

          // Correct for over adding special characters
          charStats.source--;
        } else if(tuple === '/*') {
          inInline = false;
          inBlock = true;

          // Correct for over adding special characters
          charStats.source--;
        } else if(inBlock && tuple === '*/') {
          inInline = false;
          inBlock = false;

          // Correct for over adding special characters
          charStats.source--;
        }

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
            if(!inInline && !inBlock)
              charStats.source++;
            hadSource = hadSource || (!inInline && !inBlock);
            break;

          // Check if Alphabetical
          case this.alphabeticalPattern.test(char):
            hadChar = true;
            charStats.alphabetical++;
            if(!inInline && !inBlock)
              charStats.source++;
            hadSource = hadSource || (!inInline && !inBlock);
            break;

          // Remaining must be special character than
          default:
            hadChar = true;
            charStats.special++;
            if(!inInline && !inBlock)
              charStats.source++;

            // Special characters aren't considered for source code confirmation
        }

        charIndex++;
      }

      charStats.total = contents.length;
      
      lineStats.totalSource = lineStats.source + lineStats.mixed;
      lineStats.totalComments = lineStats.inlineComments + lineStats.blockComments + lineStats.mixed;
      
      // Check the results just to double-confirm the totals
      let testTotal = lineStats.source + lineStats.mixed;
      testTotal += lineStats.inlineComments + lineStats.blockComments;
      testTotal += lineStats.whitespace + lineStats.empty;
      if(testTotal !== lineStats.total)
        console.error(`C-Family got inconsistant counts, expected ${lineStats.total} lines but got ${testTotal} instead.`);

      resolve([ lineStats, charStats ]);
    });
  }
}
