/**
 * Defines the numbered statistics for how many lines are in each category.
 */
export interface LineStats {
    [key:string] : number;

    /**
     * Sum total of all lines, including: source, comments, and empty.
     */
    total: number;

    /**
     * Number of lines containing source code.
     * 
     * This includes lines that feature inline comments besides source lines,
     * but excludes block comments and empty lines (whitespace).
     */
    totalSource: number;

    /**
     * Number of lines ONLY containing source code.
     * 
     * This excludes mixed lines where comments are besides source code.
     */
    source: number;

    /**
     * Number of lines featuring either inline comments, mixed source, and
     * block comments.
     */
    totalComments: number;

    /**
     * Number of lines containing inline comments only.
     * This number does not include mixed lines where comments are besides
     * source code.
     */
    inlineComments: number;

    /**
     * Number of comment lines that are within block comments.
     */
    blockComments: number;

    /**
     * Number of lines that feature a mix of source code, and inline comments
     * besides them.
     */
    mixed: number;

    /**
     * Number of lines that only feature whitespace.
     */
    whitespace: number;

    /**
     * Number of lines that are completely empty.
     */
    empty: number;
};

export const makeEmptyLineStatistics = ():LineStats => ({
  total: 0,
  totalSource: 0,
  source: 0,
  totalComments: 0,
  inlineComments: 0,
  blockComments: 0,
  mixed: 0,
  whitespace: 0,
  empty: 0,
});

/**
 * Defines the numbered statistics for the individual characters (bytes) read
 * within the source files.
 */
export interface CharacterStats {
    [key:string] : number;
    
    /**
     * The total number of characters read.
     * 
     * New-line combinations (CRLF or just LF) are NOT counted!
     */
    total: number;

    /**
     * Total characters that are considered source code.
     */
    source: number;

    /**
     * Total characters that are considered, or within, comments.
     * This includes both inline and block comments.
     */
    comment: number;

    /**
     * Total whitespace characters. This includes spaces, tabs, carriage-returns
     * and line-feeds. These can be in comments, or outside of them.
     */
    whitespace: number;

    /**
     * Total characters that are numerical 0-9.
     * These can be in comments, or outside of them.
     */
    numerical: number;

    /**
     * Total characters that are alphabetical A-Z, case independent.
     * These can be in comments, or outside of them.
     */
    alphabetical: number;

    /**
     * Total "special" characters. These are the remaining characters that are
     * not considered alpha-numerical.
     * These can be in comments, or outside of them.
     */
    special: number;
};

export const makeEmptyCharacterStatistics = ():CharacterStats => ({
  total: 0,
  source: 0,
  comment: 0,
  whitespace: 0,
  numerical: 0,
  alphabetical: 0,
  special: 0,
});

/**
 * An array holding the total statistics into one value.
 * This is intended for array destructuring, such that:
 * ```
 * const [ lines, characters ] = Statistics
 * ```
 */
export type Statistics = [ LineStats, CharacterStats ];

export const makeEmptyStatistics = ():Statistics => ([ makeEmptyLineStatistics(), makeEmptyCharacterStatistics() ]);
