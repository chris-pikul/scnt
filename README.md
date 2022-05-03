# SCNT - Source Count

NodeJS utility program for counting source code lines (aka. SLOC).

## Installation

The preferred usage is to install it as a program, ideally globally.

```console
npm install -g scnt
npm i -g scnt

yarn global add scnt
```

If you want to use it as a Node module, or in API mode, then install it locally.

```console
npm install --save scnt
npm i -s scnt

yarn add scnt
```

## Usage

`scnt [options] [<file>|<directory>|<glob>...]`

Running `scnt` with no options will execute with the default configuration. By default,
this will parse the contents of the current working directory with the standard parsers.

Additional help is available using the `-h` or `--help` argument.

### Available Options

| Argument                              | Description                                                                                         |
|:--------------------------------------|:----------------------------------------------------------------------------------------------------|
| `-v, --version`                       | output the version number                                                                           |
| `-D, --debug`                         | extra output info when processing (default: false)                                                  |
| `-i, --ignore-errors`                 | logs IO errors but continues processing (default: false)                                            |
| `-e, --exclude <regex>`               | excludes the files that match the regular expression, stackable with multiple usages (default: [])  |
| `-a, --alias <extension>=<extension>` | alias one extension for another, stackable with multiple usages (default: {})                       |
| `-p, --parsers <parsers...>`          | list of Parser IDs to use, defaults to all                                                          |
| `-d, --default <parser>`              | sets the default parser to use for unknowns by Parser ID (default is none, they are skipped)        |
| `-l, --list-parsers`                  | lists the available parser id keys, only this will be performed if provided                         |
| `--dry-run`                           | does not read any files, just outputs all the debug information up to that point                    |
| `-h, --help`                          | display help for command                                                                            |

### Available Parsers

#### Plain Text

ID: `plain`
Name: "Plain Text"
Supported extensions: `.txt, .md`

#### C-Family

ID: `cfamily`
Name: "C-Family"
Supported extensions: `.c, .cpp, .cc, .cxx, .cs, .h, .hpp, .hx, .js, .mjs, .jsx, .ts, .tsx, .java,
.kt, .kts, .ktm, .php, .php5, .m, .mm, .swift, .scala, .sc, .sass, .scss, .less, .go, .rs`

## License

MIT License.

See file [LICENSE](LICENSE) for full details.
Licensed under the MIT license.
