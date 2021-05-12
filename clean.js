const Path = require('path');
const RimRaf = require('rimraf');

const cleanPaths = [
    'dist/**',
];

cleanPaths.map(p => Path.resolve(__dirname, p))
    .forEach(p => RimRaf.sync(p));
