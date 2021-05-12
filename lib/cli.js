"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const program = new commander_1.Command()
    .option('-v, --verbose', 'extra output logs when processing', false)
    .parse(process.argv);
const options = program.opts();
if (options.verbose)
    console.log('Verbose messages');
console.log('Program is complete');
