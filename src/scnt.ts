import {
  hasExtension,
  extractExtension,
  cleanExtension,
} from './extensions';
import Parser from './parser';

import {
  LineStats,
  CharacterStats,
  Statistics,
  makeEmptyLineStatistics,
  makeEmptyCharacterStatistics,
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
   * Specifies the default parsing unit for processing data.
   * 
   * When the extension of a file does not result in another parser being used
   * then this is the one that is defaulted to. If this value is null (default),
   * then the file is rejected in general.
   */
  defaultParser: (Parser | null);
};

export interface OptionalSCNTOptions {
  requireExtension?: boolean;
  defaultParser?: (Parser | null);
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
    defaultParser: null,
  };

  static readonly EmptyStatistics: SCNTStatistics = [
    new Map<string, Statistics>(),
    makeEmptyLineStatistics(),
    makeEmptyCharacterStatistics(),
  ];

  options: SCNTOptions;

  parsers: Array<Parser>;

  private _filesRead: SCNTFileMap;

  private _lineStats: LineStats = makeEmptyLineStatistics();

  private _charStats: CharacterStats = makeEmptyCharacterStatistics();

  constructor(options?:SCNTOpts) {
    this.options = { ...SCNT.DefaultOptions };

    this.parsers = [];

    this._filesRead = new Map();

    this.reset = this.reset.bind(this);
    this.applyOptions = this.applyOptions.bind(this);
    this.process = this.process.bind(this);

    this.decrement = this.decrement.bind(this);
    this.increment = this.increment.bind(this);

    this.hasParserForExtension = this.hasParserForExtension.bind(this);
    this.getParserForExtension = this.getParserForExtension.bind(this);
    this.addParserForExtension = this.addParserForExtension.bind(this);

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

  public async process(fileName:string, contents:string):Promise<Statistics> {
    // Reject if the contents are "empty"
    if(contents.length === 0)
      throw new Error('Contents are empty');

    // Run the extension gambit if we need to
    let ext = '';
    if(hasExtension(fileName))
      ext = extractExtension(fileName);
    else if(this.options.requireExtension || this.options.defaultParser == null)
      throw new Error('No file extension was found in the file name, or no defaultParser was set');

    // Try to match the extension to a parser now.
    let parser:(Parser|null) = this.options.defaultParser;
    if(ext !== '')
      parser = this.getParserForExtension(ext);

    // If we didn't find a parser that will work, then shortcut out.
    if(!parser)
      throw new Error(`No matching Parser was found registered to the extension "${ext}" and no default available`);

    // Run the parser (async)
    const stats: Statistics = await parser.parse(contents);

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

  /**
   * Searches the list of registered parsers for the first one that matches
   * the given extension. Returns true if one is found. Will use the
   * `cleanExtension()` utility to normalize the extension before usage.
   * Will NOT use the defaultParser option if nothing was found.
   * 
   * @param ext file extension
   * @returns boolean true if the extension matches a registered parser
   */
  public hasParserForExtension(ext:string):boolean {
    const clean = cleanExtension(ext);
    if(!clean || clean === '')
      return false;

    return this.parsers.findIndex(ent => ent.hasExtension(clean)) !== -1;
  }

  /**
   * Searches the list of registered parsers for the first one that matches
   * the given extension. Returns the Parser if one is found. Will use the
   * `cleanExtension()` utility to normalize the extension before usage.
   * Will NOT use the defaultParser option if nothing was found.
   * 
   * @param ext file extension
   * @returns The matching Parser object, or undefined
   */
  public getParserForExtension(ext:string):(Parser|null) {
    const clean = cleanExtension(ext);
    if(!clean || clean === '')
      return null;

    return this.parsers.find(ent => ent.hasExtension(clean)) || null;
  }

  /**
   * Adds a parser for a given extension.
   * 
   * If a parser already exists with the given extension registered, the
   * "override" parameter is used to determine if:
   *  - Override is `true`, then the extension is removed from the existing
   *  parser, and added to the new one. If this removal causes the parser to
   *  have no registered extensions, it is removed outright from the list.
   *  - Override is `false`, then nothing is altered and the parser is not
   *  adde or modified.
   * 
   * If the parser being added already exists (checked by `id`) than the
   * parser is told to add the extension provided (it should de-dupe on its own)
   * and is then added to the list of accepted parsers.
   *  
   * @param ext file extension
   * @param parser Parser class object
   * @param override boolean if this parser should take over for the extension
   */
  public addParserForExtension(ext:string, parser:Parser, override = false):void {
    if(!parser)
      return;

    const clean = cleanExtension(ext);
    if(!clean || clean === '')
      return;

    // Check if this extension is already parsed
    const ind = this.parsers.findIndex(ent => ent.hasExtension(clean));
    if(ind !== -1) {
      // If we allow overriding, we can do that, otherwise skip it.
      if(override) {
        // Use the immutable version so the extension get's removed
        this.parsers[ind].removeExtension(clean);

        // Check if the parser is empty, if so, remove it.
        if(this.parsers[ind].getExtensions().length === 0)
          this.parsers.splice(ind, 1);
      } else {
        // Shortcut out
        return;
      }
    }

    // Check if the parser is already added
    const exists = this.parsers.findIndex(ent => ent.id === parser.id);
    if(exists === -1) {
      // Push the new one so it's in the list
      parser.addExtension(clean);
      this.parsers.push(parser);
    } else {
      // Just add the extension, the parser should de-dupe it.
      this.parsers[exists].addExtension(clean);
    }
  }
}
