import Path from 'path';
import FS from 'fs';

import { Command, InvalidOptionArgumentError } from 'commander';
import Chalk from 'chalk';
import glob from 'glob';

import { cleanExtension } from './extensions';

// Reading the package.json file to snag variables from there.
const packagePath = Path.resolve(__dirname, '..', 'package.json');
const packageData = FS.readFileSync(packagePath, { encoding: 'utf8' });
const Package = JSON.parse(packageData);

const clrDebug = Chalk.gray;
const clrInfo = Chalk.blue;
const clrWarn = Chalk.yellowBright;
const clrErr = Chalk.bgRed.white;

type KeyValue = {[key:string]:string};

function optKeyValue(value: string, previous: KeyValue): KeyValue {
  if(typeof previous !== 'object' || Array.isArray(previous))
    return {};

  const rtn: KeyValue = { ...previous };
  
  const parts = value.split('=');
  if(parts.length === 2) {
    const first = cleanExtension(parts[0]);
    const second = cleanExtension(parts[1]);
    if(first && second)
      rtn[first] = second;
  }

  return rtn;
}

function optCollect(value: string, previous: string[]): string[] {
  if(typeof previous !== 'object' || !Array.isArray(previous))
    return [];

  const rtn: string[] = [ ...previous ];
  const val = value.trim();

  if(!rtn.includes(val))
    rtn.push(val);

  return rtn;
}

function optCollectRegexs(value: string, previous: RegExp[]): RegExp[] {
  try {
    if(value[0] !== '/') {
      console.log(clrWarn(`Wrapping regular expression "${value}" in slashes to conform properly!`));
      return [ ...previous, new RegExp(`/${value}/`) ];
    }
    return [ ...previous, new RegExp(value) ];
  } catch (err) {
    throw new InvalidOptionArgumentError(`"${value}" is not a valid regular expression`);
  }
}

// Construct the commander program and parse the arguments.
const program = new Command()
  .version(Package.version, '-v, --version')
  .usage('[options] [<file>|<directory>|<glob>...]')
  .option('-d, --debug', 'extra output info when processing', false)
  .option('-e, --exclude <regex>', 'excludes the files that match the regular expression, stackable with multiple usages', optCollectRegexs, [])
  .option('-a, --alias <extension>=<extension>', 'alias one extension for another, stackable with multiple usages', optKeyValue, {})
  .option('-p, --parsers <parsers...>', 'list of Parser IDs to use, defaults to all')
  .option('-u, --allow-unknowns', 'allows processing unknown file types with default parser')
  .option('-D, --default <parser>', 'sets the default parser to use for unknowns by Parser ID')
  .option('--dry', 'does not read any files, just outputs all the debug information up to that point')
  .option('--list-ids', 'lists the available parser id keys, only this will be performed if provided')
  .parse(process.argv);

const options = program.opts();

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

const optionExclude: RegExp[] = options.exclude as RegExp[];

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

async function* walkGlob(pattern:string):AsyncGenerator<string> {
  for await (const file of await globAsPromise(pattern))
    yield file;
}

(async() => {
  const files = new Set();
  for(const arg of program.args) {
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
  console.log(clrErr('Failed to process folder/files!'));
  console.error(err);
  process.abort();
});
