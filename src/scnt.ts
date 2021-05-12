import { getExtensionType } from './extensions';
import {
  LineStats,
  CharacterStats,
  Statistics,
} from './stats';

export interface SCNTOptions {

  /**
   * Whether an extension is required in order to process a file.
   * 
   * If this is true (default), then the extension will be extracted and
   * required in order to parse the file contents properly.
   * 
   * If this is false, then the extension will be extracted and used to parse
   * the file contents if one is found. In the absence of an extension, then it
   * is treated as "plain text".
   */
  requireExtension: boolean;

  /**
   * Declares how to process unknown file types.
   * 
   * When the file is parse, it's extension is used based on the 
   * "requireExtension" property. If an unknown extension, or no extension, is
   * encountered then this value is used in it's place.
   * 
   * If this value is 'reject' (default), then the file is discarded and no
   * statistics are taken.
   */
  parseUnknownAs: string;
};

/**
 * Source Code Counter
 * 
 * This class is the bread-and-butter of the SCNT system and holds the
 * statistics as well as functionality to process files.
 * 
 * It must be fed files to process as it does not contain the code to actually
 * read files (filesystem stuff is external).
 * 
 * The properties returned for filesRead, lineStatistics, characterStatistics,
 * and statistics are immutable copies of the internal private properties.
 */
export default class SCNT {
  static readonly DefaultOptions: SCNTOptions = {
    requireExtension: true,
    parseUnknownAs: 'reject',
  };

  options: SCNTOptions;

  private _filesRead:Map<string, Statistics>;

  private _lineStats: LineStats = {
    total: 0,
    totalSource: 0,
    source: 0,
    totalComments: 0,
    inlineComments: 0,
    blockComments: 0,
    mixed: 0,
    whitespace: 0,
    empty: 0,
  };

  private _charStats: CharacterStats = {
    total: 0,
    source: 0,
    comment: 0,
    whitespace: 0,
    numerical: 0,
    alphabetical: 0,
    special: 0,
  };


  constructor(options?:SCNTOptions) {
    // Apply the options by mixing with the defaults.
    this.options = {
      ...SCNT.DefaultOptions,
      ...(options || {}),
    };

    this._filesRead = new Map();

    this.reset = this.reset.bind(this);
    this.process = this.process.bind(this);

    this.decrement = this.decrement.bind(this);
    this.increment = this.increment.bind(this);
  }

  /**
   * Total files read in completion so far.
   */
  get filesRead():Map<string, Statistics> {
    return new Map(this._filesRead);
  }

  /**
   * The collected statistics on the number of lines processed.
   */
  get lineStatistics():LineStats {
    return { ...this._lineStats };
  }

  /**
   * The collected statistics on the number of characters processed.
   */
  get characterStatistics():CharacterStats {
    return { ...this._charStats };
  }

  /**
   * An array of both the line and character statistics.
   * Useful for destructoring such as:
   * ```
   * const [ files, line, char ] = scnt.statistics;
   * ```
   */
  get statistics():[Map<string, Statistics>, LineStats, CharacterStats] {
    return [
      this.filesRead,
      this.lineStatistics,
      this.characterStatistics,
    ];
  }

  /**
   * Resets (clears) the statistics gathered.
   */
  public reset():void {
    this._filesRead.clear();

    this._lineStats = {
      total: 0,
      totalSource: 0,
      source: 0,
      totalComments: 0,
      inlineComments: 0,
      blockComments: 0,
      mixed: 0,
      whitespace: 0,
      empty: 0,
    };

    this._charStats = {
      total: 0,
      source: 0,
      comment: 0,
      whitespace: 0,
      numerical: 0,
      alphabetical: 0,
      special: 0,
    };
  };

  public process(fileName:string, contents:string):(Statistics|undefined) {
    const lines: LineStats = {
      total: 0,
      totalSource: 0,
      source: 0,
      totalComments: 0,
      inlineComments: 0,
      blockComments: 0,
      mixed: 0,
      whitespace: 0,
      empty: 0,
    };

    const chars: CharacterStats = {
      total: 0,
      source: 0,
      comment: 0,
      whitespace: 0,
      numerical: 0,
      alphabetical: 0,
      special: 0,
    };

    // Reject if the contents are "empty"
    if(contents.length === 0)
      return;

    // Run the extension gambit if we need to
    let ext = '';
    if(this.hasExtension(fileName))
      ext = this.extractExtension(fileName);
    else if(this.options.requireExtension || this.options.parseUnknownAs === 'reject')
      return;
    
    // Find the matching type for the extension
    let fileType = getExtensionType(ext);
    if(fileType.length === 0) {
      // Bail if we don't want to handle unknowns
      if(this.options.parseUnknownAs === 'reject')
        return;

      fileType = this.options.parseUnknownAs;
    }

    // TODO: LEFT OFF HERE. Was going to add "parsers" now using the fileType

    // Make the final stats object for usage with functions and returning.
    const stats: Statistics = [ lines, chars ];

    // Check if we already have this file processed
    if(this._filesRead.has(fileName))
      this.decrement(stats);

    // Add the new stats to the class totals
    this.increment(stats);

    // Push the new statistics object to the map.
    this._filesRead.set(fileName, stats);

    return stats;
  }

  /**
   * Subtracts from this objects statistics using the numbers provided in
   * the parameter.
   * 
   * This is used for "undoing" numbers added.
   * 
   * @param stats Statistics array of numbers to subtract
   */
  private decrement(stats: Statistics):void {
    const [ lines, chars ] = stats;

    for(const [ key, value ] of Object.entries(lines))
      this._lineStats[key] -= value;
    
    for(const [ key, value ] of Object.entries(chars))
      this._charStats[key] -= value;
  }

  /**
   * Adds to this objects statistics using the numbers provided in
   * the parameter.
   * 
   * This is used for "applying" statistics.
   * 
   * @param stats Statistics array of numbers to add
   */
  private increment(stats:Statistics):void {
    const [ lines, chars ] = stats;

    for(const [ key, value ] of Object.entries(lines))
      this._lineStats[key] += value;
    
    for(const [ key, value ] of Object.entries(chars))
      this._charStats[key] += value;
  }

  private hasExtension(fileName:string):boolean {
    if(fileName.length === 0)
      return false;

    return fileName.lastIndexOf('.') >= 1;
  }

  /**
   * Attempts to extract the extension from a given filename.
   * 
   * Will return undefined if the string is empty, there is no period character
   * in the filename, or if the period is the first and only character.
   * 
   * @param fileName string filename
   * @returns string or undefined
   */
  private extractExtension(fileName:string):string {
    if(!this.hasExtension(fileName))
      return '';
    
    // Find the last dot character in the name
    const lastDotPos = fileName.lastIndexOf('.');

    // Return the extension, without the dot
    return fileName.substr(lastDotPos + 1);
  }
}
