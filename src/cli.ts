import Path from 'path';
import FS from 'fs';

import { Command } from 'commander';
import Chalk from 'chalk';

const packagePath = Path.resolve(__dirname, '..', 'package.json');
const packageData = FS.readFileSync(packagePath, { encoding: 'utf8' });
const Package = JSON.parse(packageData);

const clrDebug = Chalk.gray;
const clrInfo = Chalk.blue;
const clrErr = Chalk.bgRed.white;

// Construct the commander program and parse the arguments
const program = new Command()
  .version(Package.version, '-v, --version')
  .usage('[options] <file>|<directory>')
  .option('-d, --debug', 'extra output info when processing', false)
  .parse(process.argv);

const options = program.opts();

// Ensure that there is an actual target supplied
if (program.args.length < 1) {
  console.log(clrErr('You must provide a valid target, either a file or directory!'));
  program.help();
  process.exit(0);
}

if (options.verbose)
  console.log(clrDebug('Verbose messages'));

console.log(clrInfo('Program is complete'));
