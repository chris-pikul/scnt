import Path from 'path';
import FS from 'fs';

import {
  Command,
  InvalidOptionArgumentError,
  OptionValues,
} from 'commander';
import Chalk from 'chalk';
import glob from 'glob';
import Table from 'cli-table';

import { cleanExtension, extractExtension } from './extensions';
import SCNT, { StringKeyValueArray } from './scnt';
import Parser, { ParserClassType } from './parser';
import CFamilyParser from './parser/cfamily';
import { performance } from 'perf_hooks';

const clrDebug = Chalk.gray;
const clrInfo = Chalk.blue;
const clrWarn = Chalk.yellowBright;
const clrErr = Chalk.bgRed.white;

// No-op the debug for now. The setupProgram() function will override this.
console.debug = () => {
  // NOOP
};

// Generic type for string based key-value pair objects
export type KeyValue = {[key:string]:string};

// Holds the total list of available parsers
export const parserMap:{[key:string]:Parser} = {};

// Helper function to add a parser by class, will instantiate as default params.
export function addParser(ParserClass: ParserClassType): void {
  const obj = new ParserClass();
  parserMap[obj.id] = obj;
}

// Adding all the parser classes
addParser(Parser);
addParser(CFamilyParser);

// Performance metrics
let timeStart = 0;
let timeProcStart = 0;
let timeEnd = 0;

/**
 * Attempts to parse incoming regular expression arguments and construct them
 * into `RegExp` objects.
 * 
 * @throws InvalidOptionArgumentError if the `RegExp` cannot be constructed
 * @param value String of a regular expression
 * @param previous The current state of regexs
 * @returns New state of regexs
 */
export function optCollectRegexs(value: string, previous: RegExp[] = []): RegExp[] {
  try {
    if(value[0] !== '/') {
      console.log(clrWarn(`Wrapping regular expression "${value}" in slashes to conform properly!`));
      return [ ...previous, new RegExp(`/${value}/`) ];
    }

    return [ ...previous, new RegExp(value) ];
  } catch (err) {
    throw new InvalidOptionArgumentError(`"${value}" is not a valid regular expression.`);
  }
}

/**
 * Parses an incoming alias option to split the strings from <ext>=<ext> and
 * clean and normalize the extensions.
 * 
 * @throws InvalidOptionArgumentError on invalid formats
 * @param value String of an alias <ext>=<ext> format
 * @param previous The current state of aliases
 * @returns New state of aliases
 */
export function optAliases(value: string, previous: KeyValue = {}): KeyValue {
  if(typeof previous !== 'object' || Array.isArray(previous))
    return {};

  const rtn: KeyValue = { ...previous };
  
  const parts = value.split('=');
  if(parts.length === 2) {
    const first = cleanExtension(parts[0]);
    const second = cleanExtension(parts[1]);
    if(first && second)
      rtn[first] = second;
    else if(second)
      throw new InvalidOptionArgumentError(`First part "${parts[0]}" is not a valid extension.`);
    else if(first)
      throw new InvalidOptionArgumentError(`Second part "${parts[1]}" is not a valid extension.`);
    else
      throw new InvalidOptionArgumentError(`Neither parts of "${value}" are valid extensions.`);
  } else {
    throw new InvalidOptionArgumentError(`Alias requires the format "<ext>=<ext>", but "${value}" was received instead.`);
  }

  return rtn;
}

/**
 * Uses commander to parse the arguments from the command line and return the
 * provided options.
 * 
 * @returns commander.OptionValues of the parsed arguments
 */
export function setupProgram():[OptionValues, string[]] {
  // Start performance
  timeStart = performance.now();

  // Reading the package.json file to snag variables from there.
  const packagePath = Path.resolve(__dirname, '..', 'package.json');
  const packageData = FS.readFileSync(packagePath, { encoding: 'utf8' });
  const packageJSON = JSON.parse(packageData);

  // Construct the commander program and parse the arguments.
  const program = new Command()
    .version(packageJSON.version, '-v, --version')
    .usage('[options] [<file>|<directory>|<glob>...]')
    .option('-D, --debug', 'extra output info when processing', false)
    .option('-i, --ignore-errors', 'logs IO errors but continues processing', false)
    .option('-e, --exclude <regex>', 'excludes the files that match the regular expression, stackable with multiple usages', optCollectRegexs, [])
    .option('-a, --alias <extension>=<extension>', 'alias one extension for another, stackable with multiple usages', optAliases, {})
    .option('-p, --parsers <parsers...>', 'list of Parser IDs to use, defaults to all')
    .option('-d, --default <parser>', 'sets the default parser to use for unknowns by Parser ID (default is none, they are skipped)')
    .option('-l, --list-parsers', 'lists the available parser id keys, only this will be performed if provided')
    .option('--dry-run', 'does not read any files, just outputs all the debug information up to that point')
    .parse(process.argv);

  // Default argument is current directory
  if(program.args.length === 0)
    program.args.push('./*');

  return [ program.opts(), program.args ];
}

function printParsers(): void {
  console.log('Available Parsers:');
  for(const [ id, obj ] of Object.entries(parserMap)) {
    console.log(`- ${id}\t"${obj.name}"`);
    for(const ext of obj.getExtensions())
      console.log(`\t.${ext}`);
  }
}

/**
 * Wraps the Glob library into a promise for async/await usage.
 * 
 * @param pattern Glob pattern
 * @returns Promise resolving to list of filename strings
 */
function globAsPromise(pattern:string):Promise<string[]> {
  return new Promise<string[]>((resolve, reject) => {
    glob(pattern, {
      nodir: true,
      absolute: true,
    }, (err, files) => {
      if(err)
        reject(err);
      else
        resolve(files);
    });
  });
}

/**
 * Executes the glob pattern asynchronously and walks the resulting files
 * yielding each as a string.
 * 
 * @param pattern Glob pattern
 */
async function* walkGlob(pattern:string):AsyncGenerator<string> {
  for await (const file of await globAsPromise(pattern))
    yield file;
}

/**
 * Runs the CLI tool.
 */
export default function CLI(): void {
  const [ options, args ] = setupProgram();

  // Output to console using debug colors if the "debug" option was provided
  console.debug = function() {
    if(options.debug)
      console.log(clrDebug(...arguments));
  };
  console.debug(`Running in verbose debug mode`);

  // Dump the parser IDs if we need to
  if(options.listParsers) {
    printParsers();

    // EXIT program
    return;
  }

  // Setup the main SCNT object so we can prep it for processing
  const scnt = new SCNT();

  // Validate the list of parsers and clean them up. This will exit on error
  if(options.parsers) {
    let hadErr = false;
    options.parsers.forEach((ent: string, ind: number) => {
      const cln = ent.toLocaleLowerCase().trim();
      if(parserMap[cln]) {
        console.debug(`Argument --parsers index ${ind} "${ent}" is valid.`);
        scnt.addParser(parserMap[cln]);
      } else {
        console.log(clrErr(`Argument --parsers index ${ind} "${ent}" is not a valid Parser ID.`));
        hadErr = true;
      }
    });

    if(hadErr) {
      console.log('\n');
      printParsers();

      process.exit(1);
      return;
    }
  } else {
    // Add all the parser's we have (or at least a reasonable default)
    scnt.addParser([ new Parser(), new CFamilyParser() ]);
  }

  console.debug(`Parsers initialized into SCNT:`);
  scnt.getAllParsers().forEach((parser:Parser) => console.debug(` - ${parser.id}: ${parser.name}`));

  // Check the --default option
  if(options.default) {
    const cln = options.default.toLocaleLowerCase().trim();
    if(parserMap[cln]) {
      console.debug(`Argument --default "${cln}" is valid, using as default parser.`);
      scnt.options.defaultParser = parserMap[cln];
    } else {
      console.log(clrErr(`Argument --default "${options.default}" is not a valid Parser ID`));
      console.log('\n');
      printParsers();

      process.exit(1);
      return;
    }
  }

  // Check the --alias option
  if(options.alias) {
    const aliases = Object.entries(options.alias)
      .map((ent:[string, unknown]):string[] => {
        if(typeof ent[1] === 'string') {
          console.debug(`Adding extension alias for "${ent[0]}" => "${ent[1]}"`);
          return [ ent[0] as string, ent[1] as string ];
        }
        throw new Error(`Invalid array entry types, extension aliases should have been in the form of [ ["key", "value"]... ]!`);
      }) as StringKeyValueArray;
      
    try {
      scnt.addExtensionAliases(aliases)
        .forEach(ent => console.debug(`Overwrote extension alias "${ent}"`));
    } catch (err:unknown) {
      if(err instanceof Error)
        console.error(err.message || err);
      
      console.log(clrErr(`Invalid --alias arguments! Please check the options provided and try again.`));
      process.exit(1);
    }
  }

  const extAliases = scnt.getExtensionAliases();
  if(extAliases && extAliases.length > 0) {
    console.log(clrInfo(`Extension Aliases:`));
    extAliases.forEach((ent:[string, string]) => {
      console.log(clrInfo(`- ${ent[0]} => ${ent[1]}`));
    });
  }

  // Cast the options for TS fun.
  const optionExclude: RegExp[] = options.exclude as RegExp[];

  // Grab the perf time for processing to actually start
  timeProcStart = performance.now();

  // Anonymous async function to fake node into being polite about async/await.
  (async() => {
    const files = new Set<string>();
    for(const arg of args) {
      console.log(clrInfo(`Searching paths for ${arg}...`));
      for await (const file of walkGlob(arg)) {
        if(optionExclude && optionExclude.length > 0) {
          let skip = false;
          for(const regex of optionExclude) {
            if(regex.test(file)) {
              console.debug(`File "${file}" passed exclusion regex "${regex.toString()}", will be skipped`);
              skip = true;
              break;
            }
          }
  
          if(skip)
            continue;
        }
  
        console.debug(`Adding file "${file}" for inclusion`);
        files.add(file);
      }
    }

    for(const file of files) {
      console.log(clrInfo(`Processing file ${file}`));
    
      // Do some manual work for debug logging
      if(options.debug) {
        const ext = extractExtension(file);
        console.debug(`Extracted extension for "${file}" => "${ext}"`);

        const symExt = scnt.aliasExtension(ext);
        console.debug(`Post-alias extension for "${file}" = "${symExt}"`);

        const parser = scnt.getParserForExtension(symExt);
        if(parser)
          console.debug(`Using parser "${parser.name}" (${parser.id}) for "${file}"`);
        else if(scnt.options.defaultParser)
          console.debug(`Using default parser "${scnt.options.defaultParser.name}" (${scnt.options.defaultParser.id}) for "${file}"`);
        else
          console.debug(`No parser found to match file "${file}" with extension "${symExt}"!`);
      }

      if(!options.dryRun) {
        try {
          const rawContents = await FS.promises.readFile(file);
          await scnt.process(file, rawContents.toString());
        } catch (err:unknown) {
          if(err instanceof Error) {
            console.log(clrErr(`Error reading file "${file}": ${err.message ?? err}`));

            if(!options.ignoreErrors)
              throw err;
          }
        }
      }
    }

    if(options.dryRun) {
      console.log(clrInfo(`Completed processing, exited due to dry-run option`));
      return;
    }

    const [
      totalFiles,
      lines,
      chars,
    ] = scnt.statistics;

    // Mark the end of all performance metrics
    timeEnd = performance.now();

    console.debug(`\nPerformance metrics:`);
    console.debug(`Startup time: ${(timeProcStart - timeStart).toPrecision(2)}ms`);
    console.debug(`Processing time: ${(timeEnd - timeProcStart).toPrecision(2)}ms`);
    console.debug(`Total time: ${(timeEnd - timeStart).toPrecision(2)}ms`);
    console.debug(`Average time per file: ${((timeEnd - timeProcStart) / totalFiles.size).toPrecision(2)}ms/file`);
    
    console.log(`Completed processing ${totalFiles.size} files\n`);
    
    const lineTable = new Table();
    lineTable.push(
      [ 'Total of All Lines', lines.total ],
      [ 'Total Source Lines', lines.totalSource ],
      [ 'Source Only Lines', lines.source ],
      [ 'Total Comment Lines', lines.totalComments ],
      [ 'Inline Comment Lines', lines.inlineComments ],
      [ 'Block Comment Lines', lines.blockComments ],
      [ 'Mixes Source/Comment Lines', lines.mixed ],
      [ 'Whitespace Only Lines', lines.whitespace ],
      [ 'Empty Lines', lines.empty ],
    );
    console.log(`${lineTable.toString()}\n`);

    const charTable = new Table();
    charTable.push(
      [ 'Total Characters', chars.total ],
      [ 'Source Characters', chars.source ],
      [ 'Comment Characters', chars.comment ],
      [ 'Whitespace Characters', chars.whitespace ],
      [ 'Numerical Characters', chars.numerical ],
      [ 'Alphabetical Characters', chars.alphabetical ],
      [ 'Special Characters', chars.special ],
    );
    console.log(`${charTable.toString()}`);
  })().catch(err => {
    // Must always catch errors!
    console.log(clrErr('Failed to process folder/files!'));
    console.error(err);
    process.abort();
  });
}
