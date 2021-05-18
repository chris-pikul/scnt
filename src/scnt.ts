import {
  hasExtension,
  extractExtension,
} from './extensions';

import {
  LineStats,
  CharacterStats,
  Statistics,
  makeEmptyLineStatistics,
  makeEmptyCharacterStatistics,
  makeEmptyStatistics,
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

export interface OptionalSCNTOptions {
  requireExtension?: boolean;
  parseUnknownAs?: string;
};

export type SCNTOpts = (SCNTOptions | OptionalSCNTOptions);

export type SCNTFileMap = Map<string, Statistics>;

export type SCNTStatistics = [SCNTFileMap, LineStats, CharacterStats];

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

  static readonly EmptyStatistics: SCNTStatistics = [
    new Map<string, Statistics>(),
    makeEmptyLineStatistics(),
    makeEmptyCharacterStatistics(),
  ];

  options: SCNTOptions;

  private _filesRead: SCNTFileMap;

  private _lineStats: LineStats = makeEmptyLineStatistics();

  private _charStats: CharacterStats = makeEmptyCharacterStatistics();

  constructor(options?:SCNTOpts) {
    this.options = { ...SCNT.DefaultOptions };

    this._filesRead = new Map();

    this.reset = this.reset.bind(this);
    this.applyOptions = this.applyOptions.bind(this);
    this.process = this.process.bind(this);

    this.decrement = this.decrement.bind(this);
    this.increment = this.increment.bind(this);

    if(options)
      this.applyOptions(options);
  }

  /**
   * Total files read in completion so far.
   */
  get filesRead(): SCNTFileMap {
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
  get statistics(): SCNTStatistics {
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

    this._lineStats = makeEmptyLineStatistics();

    this._charStats = makeEmptyCharacterStatistics();
  };

  /**
   * Applies the properties within the provided opts parameter to the objects
   * options.
   * 
   * Basically, just sets the options by mixing the defaults with your provided
   * overrides to form a complete options object.
   * 
   * Any properties not considered a "valid" option key are still added.
   * 
   * @param opts Object of options
   * @returns The resulting options applied
   */
  public applyOptions(opts:SCNTOpts):SCNTOptions {
    if(!opts)
      return this.options;

    this.options = {
      ...SCNT.DefaultOptions,
      ...(opts || {}),
    };

    return this.options;
  }

  public process(fileName:string, contents:string):(Statistics|undefined) {
    // Reject if the contents are "empty"
    if(contents.length === 0)
      return;

    // Run the extension gambit if we need to
    let ext = '';
    if(hasExtension(fileName))
      ext = extractExtension(fileName);
    else if(this.options.requireExtension || this.options.parseUnknownAs === 'reject')
      return;

    // TODO: LEFT OFF HERE. Was going to add "parsers" now using the fileType

    // Make the final stats object for usage with functions and returning.
    const stats: Statistics = makeEmptyStatistics();

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

    for(const [ key, value ] of Object.entries(lines)) {
      if(typeof this._lineStats[key] === 'number')
        this._lineStats[key] -= value;
    }
    
    for(const [ key, value ] of Object.entries(chars)) {
      if(typeof this._charStats[key] === 'number')
        this._charStats[key] -= value;
    }
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

    for(const [ key, value ] of Object.entries(lines)) {
      if(typeof this._lineStats[key] === 'number')
        this._lineStats[key] += value;
    }
    
    for(const [ key, value ] of Object.entries(chars)) {
      if(typeof this._charStats[key] === 'number')
        this._charStats[key] += value;
    }
  }
}
