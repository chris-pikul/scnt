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

export type KeyValueArray<K, V> = [ [K, V] ];
export type StringKeyValueArray = KeyValueArray<string, string>;

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

  public options: SCNTOptions;

  private _extensionAliases: {[key:string]:string};

  private _parsers: Array<Parser>;

  private _filesRead: SCNTFileMap;

  private _lineStats: LineStats = makeEmptyLineStatistics();

  private _charStats: CharacterStats = makeEmptyCharacterStatistics();

  constructor(options?:SCNTOpts) {
    this.options = { ...SCNT.DefaultOptions };

    this._extensionAliases = {};
    this._parsers = [];
    this._filesRead = new Map();

    this.reset = this.reset.bind(this);
    this.applyOptions = this.applyOptions.bind(this);
    this.process = this.process.bind(this);

    this.decrement = this.decrement.bind(this);
    this.increment = this.increment.bind(this);

    this.hasParser = this.hasParser.bind(this);
    this.getParser = this.getParser.bind(this);
    this.addParser = this.addParser.bind(this);
    this.replaceParser = this.replaceParser.bind(this);
    this.removeParser = this.removeParser.bind(this);
    this.getAllParsers = this.getAllParsers.bind(this);
    this.clearParsers = this.clearParsers.bind(this);

    this.hasParserForExtension = this.hasParserForExtension.bind(this);
    this.getParserForExtension = this.getParserForExtension.bind(this);

    this.getExtensionAlias = this.getExtensionAlias.bind(this);
    this.getExtensionAliases = this.getExtensionAliases.bind(this);
    this.aliasExtension = this.aliasExtension.bind(this);
    this.addExtensionAlias = this.addExtensionAlias.bind(this);
    this.addExtensionAliases = this.addExtensionAliases.bind(this);
    this.removeExtensionAlias = this.removeExtensionAlias.bind(this);
    this.clearExtensionAliases = this.clearExtensionAliases.bind(this);

    if(options)
      this.applyOptions(options);
  }

  /**
   * Total files read in completion so far.
   * Immutable Map copy.
   */
  get filesRead(): SCNTFileMap {
    return new Map(this._filesRead);
  }

  /**
   * The collected statistics on the number of lines processed.
   * Immutable object copy.
   */
  get lineStatistics():LineStats {
    return { ...this._lineStats };
  }

  /**
   * The collected statistics on the number of characters processed.
   * Immutable object copy.
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
   * Immutable object copy.
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

    // Check for extension aliases
    ext = this.aliasExtension(ext);

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
   * Checks if the given Parser, or Parser ID, is registered.
   * 
   * @param parser Either a Parser object, or string matching Parser.id
   * @returns boolean true if a match is found
   */
  public hasParser(parser:(string|Parser)):boolean {
    if(typeof parser === 'string' || (typeof parser === 'object' && parser instanceof Parser)) {
      const id = typeof parser === 'string' ? parser : parser.id;
      if(id === '')
        return false;
      return this._parsers.findIndex(ent => ent.id === id) !== -1;
    }
    return false;
  }

  /**
   * Attempts to return a registered Parser.
   * 
   * - If a Parser object is supplied, it's ID is used to match.
   * - If a string is given, it is used as an ID matcher.
   * 
   * @param parser Either a Parser object, or a string matching Parser.id
   * @returns Parser if found, undefined otherwise
   */
  public getParser(parser:(string|Parser)):(Parser|undefined) {
    if(typeof parser === 'string' || (typeof parser === 'object' && parser instanceof Parser)) {
      const id = typeof parser === 'string' ? parser : parser.id;
      return this._parsers.find(ent => ent.id === id);
    }
  }

  /**
   * Adds a new parser, or array of parsers, to this SCNT object for processing.
   * 
   * An array of parsers will be reduced down to Parser objects
   * (if nested arrays).
   * 
   * Individual Parser objects must inherit from Parser class.
   * Duplicate parser objects will be skipped, these are determined by the
   * `Parser.id` property.
   * 
   * To overwrite parsers see `SCNT.replaceParser()`
   * 
   * @param parser Single, or array, of Parser objects
   */
  public addParser(parser:(Parser|Parser[])):void {
    if(typeof parser === 'undefined' || parser == null) {
      throw new TypeError('Attempted to call SCNT.addParser() with an undefined|null parameter');
    } else if(typeof parser === 'object') {
      if(Array.isArray(parser)) {
        parser.forEach(this.addParser);
      } else if(parser instanceof Parser) {
        const exists = this._parsers.findIndex(ent => ent.id === parser.id);
        if(exists === -1)
          this._parsers.push(parser);
      } else {
        throw new TypeError(`Called SCNT.addParser() with an object that is not an instance of Parser, found "${typeof parser}" instead`);
      }
    } else {
      throw new TypeError('Must call SCNT.addParser() with an array, or a Parser object');
    }
  }

  /**
   * Replaces all occurances of a Parser registered with a newly provided one.
   * They are searched by either ID, or Parser object. When arrays are provided
   * it is done recursively.
   * 
   * If both the parser, and replacement, parameters are single Parser objects
   * they are replaced as stands 1 for 1.
   * 
   * By all occurances, I mean all, it is recursively searched for all matches
   * and each is replaced. This matching is done by ID property.
   * 
   * If the provided parser parameter is an array, it will be recursivly used to
   * replace parsers. The replacement parameter can than either be an array of
   * matching dimensions in which the replacement is done 1:1, or can be
   * singular to replace all occurances in the parser array with the single
   * replacement.
   * 
   * @param parser Single, or array, of Parser objects
   */
  public replaceParser(parser:(string|Parser|string[]|Parser[]), replacement:(Parser|Parser[])):void {
    if(typeof parser === 'undefined' || parser == null)
      throw new TypeError('Attempted to call SCNT.replaceParser() with a null or undefined parser parameter');

    if(typeof replacement !== 'object' || replacement == null)
      throw new TypeError('Attempted to call SCNT.replaceParser() with a null or non-object replacement parameter');

    if(Array.isArray(parser)) {
      if(Array.isArray(replacement)) {
        if(replacement.length < parser.length)
          throw new TypeError('The supplied replacement array for SCNT.replaceParser() is smaller than the parser array supplied');
        parser.forEach((ent:(string|Parser), ind:number) => this.replaceParser(ent, replacement[ind]));
      } else {
        parser.forEach((ent:(string|Parser)) => this.replaceParser(ent, replacement));
      }
    }

    if((replacement instanceof Parser) === false)
      throw new TypeError('SCNT.replaceParser() cannot replace a Parser with an object that is NOT a Parser');

    if(typeof parser !== 'string' && !(parser instanceof Parser))
      throw new TypeError(`Called SCNT.replaceParser() with an object that is not an instance of Parser`);

    const id = typeof parser === 'string' ? parser : parser.id;
    let ind = 0;
    while(ind !== -1) {
      ind = this._parsers.findIndex(ent => ent.id === id);
      if(ind !== -1)
        this._parsers[ind] = replacement as Parser;
    }
  }

  /**
   * Removes any matching parsers from the list of registered ones.
   * 
   * - If an array is provided, this function is called recursively.
   * - When a string is provided it is used directly to match against the IDs.
   * - If a Parser object is provided, then the ID is taken from it to match
   * against.
   * 
   * @param parser string|Parser|string[]|Parser[] Parser ID(s) or Parser(s)
   */
  public removeParser(parser:(string|Parser|string[]|Parser[])):void {
    if(typeof parser === 'undefined' || parser == null)
      throw new TypeError('Attempted to call SCNT.removeParser() with an undefined|null parameter');

    if(typeof parser === 'object' && Array.isArray(parser))
      parser.forEach(this.removeParser);

    if(typeof parser === 'string')
      this._parsers = this._parsers.filter(ent => ent.id !== parser);
    else if(typeof parser === 'object' && parser instanceof Parser)
      this._parsers = this._parsers.filter(ent => ent.id !== parser.id);
    else
      throw new TypeError('Invalid object type supplied to SCNT.removeParser()');
  }

  /**
   * Returns all the registered parsers.
   * This is an immutable copy.
   * @returns Array of Parser objects
   */
  public getAllParsers():Parser[] {
    return [ ...this._parsers ];
  }

  /**
   * Removes all parsers from the list of registered ones.
   */
  public clearParsers():void {
    this._parsers = [];
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
  public hasParserForExtension(ext: string): boolean {
    const clean = cleanExtension(ext);
    if(!clean || clean === '')
      return false;

    return this._parsers.findIndex(ent => ent.hasExtension(clean)) !== -1;
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
  public getParserForExtension(ext: string): (Parser|null) {
    const clean = cleanExtension(ext);
    if(!clean || clean === '')
      return null;

    return this._parsers.find(ent => ent.hasExtension(clean)) || null;
  }

  /**
   * Checks if an extension alias exists and returns it if so.
   * 
   * @param ext string file extension
   * @returns new file extension if found, otherwise undefined
   */
  public getExtensionAlias(ext: string): (string|undefined) {
    return this._extensionAliases[cleanExtension(ext)];
  }

  /**
   * Returns the current extension alias records as an array of 2-index
   * key-value arrays.
   * 
   * This is in the form of `[ [key, value]... ]`
   * 
   * @returns array of 2-index arrays
   */
  public getExtensionAliases(): StringKeyValueArray {
    return Object.entries(this._extensionAliases) as StringKeyValueArray;
  }

  /**
   * Takes an incoming extension and applies aliasing and cleaning if necessary.
   * 
   * Will keep replacing extensions as long as there are matches. The
   * infinite-loop scenerio is prevented by only aliasing each extension once.
   * 
   * @param ext string file extension
   * @returns final file extension
   */
  public aliasExtension(ext:string):string {
    const used = new Set<string>();
    let repl = cleanExtension(ext);
    
    // eslint-disable-next-line
    while(true) {
      if(this._extensionAliases[repl] && !used.has(repl)) {
        used.add(repl);
        repl = this._extensionAliases[repl];
      }
      break;
    };
    
    return repl;
  }

  /**
   * Creates a new extension alias that replaces all occurances of the `oldExt`
   * with the `newExt` value during processing.
   * 
   * If this entry replaces an existing mapping for `oldExt` then the previous
   * value is returned. Otherwise it's `undefined` if this is a new record.
   * 
   * @param oldExt string of the old extension
   * @param newExt string of the new extension
   * @returns string if this new record replaces an existing
   */
  public addExtensionAlias(oldExt: string, newExt: string): (string|undefined) {
    const oldCln = cleanExtension(oldExt);
    const newCln = cleanExtension(newExt);

    if(!oldCln)
      throw new TypeError(`SCNT.addExtensionAlias() received invalid extension "${oldExt}" for the oldExt parameter.`);

    if(!newCln)
      throw new TypeError(`SCNT.addExtensionAlias() received invalid extension "${newExt}" for the newExt parameter.`);

    const existing = this._extensionAliases[oldCln];

    this._extensionAliases[oldCln] = newCln;

    return existing;
  }

  /**
   * Recursively adds the alias pairs provided, returning an array of extensions
   * that where overwritten by this process.
   * 
   * The aliases parameter follows the form of `[ [key, value]... ]`
   * 
   * @param aliases Array of 2-index arrays for key-value pairs
   * @returns array of extensions that where overwritten
   */
  public addExtensionAliases(aliases: StringKeyValueArray): string[] {
    return aliases.map((ent:string[], ind:number):(string|null) => {
      if(typeof ent !== 'object' || !Array.isArray(ent))
        throw new Error(`SCNT.addExtensionAliases() parameter index ${ind} is not an Array!`);

      if(ent.length < 2)
        throw new Error(`SCNT.addExtensionAliases() parameter index ${ind} does not have a length of 2!`);

      if(typeof ent[0] !== 'string')
        throw new Error(`SCNT.addExtensionAliases() parameter index ${ind} does not have a string for the first index!`);

      if(typeof ent[1] !== 'string')
        throw new Error(`SCNT.addExtensionAliases() parameter index ${ind} does not have a string for the second index!`);

      const oldExt = cleanExtension(ent[0]);
      if(!oldExt)
        throw new Error(`SCNT.addExtensionAliases() parameter index ${ind} does not have a valid string extension for the first index!`);

      const newExt = cleanExtension(ent[1]);
      if(!newExt)
        throw new Error(`SCNT.addExtensionAliases() parameter index ${ind} does not have a valid string extension for the second index!`);

      const existing = this._extensionAliases[oldExt];

      this._extensionAliases[oldExt] = newExt;

      return (existing || null);
    }).filter(ent => (typeof ent === 'string' && ent.length > 0)) as string[];
  }

  /**
   * Removes an extension alias record
   * 
   * @param ext string of the file extension alias
   * @returns true if something was removed
   */
  public removeExtensionAlias(ext: string): boolean {
    const cln = cleanExtension(ext);
    if(!cln)
      throw new TypeError(`SCNT.removeExtensionAlias() received invalid extension "${ext}" as it's parameter.`);

    if(this._extensionAliases[cln]) {
      delete this._extensionAliases[cln];
      return true;
    }

    return false;
  }

  /**
   * Removes all extension aliases
   */
  public clearExtensionAliases(): void {
    this._extensionAliases = {};
  }
}
