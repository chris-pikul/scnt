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

/**
 * Defines the numbered statistics for the individual characters (bytes) read
 * within the source files.
 */
export interface CharacterStats {
    [key:string] : number;
    
    /**
     * The total number of characters read.
     * 
     * This is effectively the byte size of the files read.
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
     * and line-feeds.
     */
    whitespace: number;

    /**
     * Total characters that are numerical 0-9.
     */
    numerical: number;

    /**
     * Total characters that are alphabetical A-Z, case independent.
     */
    alphabetical: number;

    /**
     * Total "special" characters. These are the remaining characters that are
     * not considered alpha-numerical.
     */
    special: number;
};

/**
 * An array holding the total statistics into one value.
 * This is intended for array destructuring, such that:
 * ```
 * const [ lines, characters ] = Statistics
 * ```
 */
export type Statistics = [ LineStats, CharacterStats ];
