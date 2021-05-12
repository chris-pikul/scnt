import { Command } from 'commander';

const program = new Command()
    .option('-v, --verbose', 'extra output logs when processing', false)
    .parse(process.argv);

const options = program.opts();

if(options.verbose)
    console.log('Verbose messages');
console.log('Program is complete');