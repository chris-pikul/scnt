import {
  LineStats,
  CharacterStats,
  Statistics,
  makeEmptyLineStatistics,
  makeEmptyCharacterStatistics,
} from './stats';

export interface IParser {
  readonly id:string;
  readonly name:string;

  parse(contents:string):Promise<Statistics>;
};

export default class Parser implements IParser {
  readonly id:string = 'plain';

  readonly name:string = 'Plain Text';

  readonly whitespacePattern:RegExp = /\s/g;

  readonly numericalPattern:RegExp = /\d/g;
  
  readonly alphabeticalPattern:RegExp = /[A-Za-z]/g;

  constructor() {
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
