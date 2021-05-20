import Path from 'path';
import FS from 'fs';

import {
  Command,
  InvalidOptionArgumentError,
  OptionValues,
} from 'commander';
import Chalk from 'chalk';
import glob from 'glob';

import { cleanExtension } from './extensions';
import SCNT from './scnt';

const clrDebug = Chalk.gray;
const clrInfo = Chalk.blue;
const clrWarn = Chalk.yellowBright;
const clrErr = Chalk.bgRed.white;

// No-op the debug for now. The setupProgram() function will override this.
console.debug = () => {
  // NOOP
};

export type KeyValue = {[key:string]:string};

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
  // Reading the package.json file to snag variables from there.
  const packagePath = Path.resolve(__dirname, '..', 'package.json');
  const packageData = FS.readFileSync(packagePath, { encoding: 'utf8' });
  const packageJSON = JSON.parse(packageData);

  // Construct the commander program and parse the arguments.
  const program = new Command()
    .version(packageJSON.version, '-v, --version')
    .usage('[options] [<file>|<directory>|<glob>...]')
    .option('-d, --debug', 'extra output info when processing', false)
    .option('-e, --exclude <regex>', 'excludes the files that match the regular expression, stackable with multiple usages', optCollectRegexs, [])
    .option('-a, --alias <extension>=<extension>', 'alias one extension for another, stackable with multiple usages', optAliases, {})
    .option('-p, --parsers <parsers...>', 'list of Parser IDs to use, defaults to all')
    .option('-u, --allow-unknowns', 'allows processing unknown file types with default parser')
    .option('-D, --default <parser>', 'sets the default parser to use for unknowns by Parser ID')
    .option('--dry', 'does not read any files, just outputs all the debug information up to that point')
    .option('--list-ids', 'lists the available parser id keys, only this will be performed if provided')
    .parse(process.argv);

  return [ program.opts(), program.args ];
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
  if(options.listIds) {
    console.log('No IDs yet');
    process.exit(0);
  }

  // Cast the options for TS fun.
  const optionExclude: RegExp[] = options.exclude as RegExp[];

  // Anonymous async function to fake node into being polite about async/await.
  (async() => {
    const files = new Set();
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
  
    for(const file of files)
      console.debug(`Parsing file ${file}`);
  })().catch(err => {
    // Must always catch errors!
    console.log(clrErr('Failed to process folder/files!'));
    console.error(err);
    process.abort();
  });
}
