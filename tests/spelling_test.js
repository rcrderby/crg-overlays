// The overlay is written in U.S. English.
// Super-Linter's natural language check reads Markdown only.
// This test checks the remainder of the repository

import assert from 'node:assert/strict';

const SCANNED_EXTENSIONS = ['.js', '.mjs', '.css', '.html', '.md', '.yml', '.yaml', '.textlintrc'];

// The trees this repository owns.  Everything else in a working copy is either
// ignored, downloaded from CRG, or a font, image or logo.
const SCANNED_PATHS = ['penalties/', '.github/', 'tests/', 'README.md'];
const SKIPPED_DIRECTORIES = ['fonts', 'images', 'logos'];

// These two name British spellings on purpose, to rule them out
const SPELLING_SOURCES = ['spelling_test.js', '.textlintrc'];

// British spellings and the U.S. forms to use instead
const BRITISH_SPELLINGS = [
  [/\b(colour|behaviour|favour|honour|labour|neighbour)(s|ed|ing|able)?\b/gi, 'drop the u'],
  [/\b(centre|metre|litre|theatre)(s|d)?\b/gi, 'end in -er'],
  [/\bgrey(s|ed|ing|ish)?\b/gi, 'gray'],
  [/\b\w*(organis|recognis|customis|initialis|normalis|optimis|prioritis)(e|es|ed|ing|ation|able)\b/gi, '-ize'],
  [/\b(analyse|analysed|analysing|paralyse|paralysed|paralysing)\b/gi, '-yze'],
  [/\b(licence|defence|offence|pretence)(s)?\b/gi, 'end in -se'],
  [/\bpractise(s|d|ing)?\b/gi, 'practice'],
  [/\b(programme|catalogue|dialogue|analogue)(s)?\b/gi, 'the shorter U.S. form'],
  [/\b\w*(travell|modell|labell|signall|counsell)(ed|ing|er|ers)\b/gi, 'one l'],
  [/\b(jewellery|aluminium|storey|mould|smoulder|sceptic)(s|al)?\b/gi, 'the U.S. form']
];

const REPO = new URL('../', import.meta.url);

// Every file this repository owns that should be read as English
async function* sourceFiles(directory) {
  for await (const entry of Deno.readDir(directory)) {
    const path = new URL(entry.name + (entry.isDirectory ? '/' : ''), directory);
    if (entry.isDirectory) {
      if (!SKIPPED_DIRECTORIES.includes(entry.name)) {
        yield* sourceFiles(path);
      }
    } else if (SCANNED_EXTENSIONS.some((extension) => entry.name.endsWith(extension))) {
      yield path;
    }
  }
}

// Check the owned paths and read files directly
async function* scannedFiles() {
  for (const path of SCANNED_PATHS) {
    const target = new URL(path, REPO);
    if (path.endsWith('/')) {
      yield* sourceFiles(target);
    } else {
      yield target;
    }
  }
}

Deno.test('the repository is written in U.S. English', async () => {
  const found = [];

  for await (const file of scannedFiles()) {
    if (SPELLING_SOURCES.some((source) => file.pathname.endsWith(source))) {
      continue;
    }

    const lines = (await Deno.readTextFile(file)).split('\n');

    for (const [pattern, correction] of BRITISH_SPELLINGS) {
      for (const [index, line] of lines.entries()) {
        for (const match of line.matchAll(pattern)) {
          const name = file.pathname.split('/').slice(-2).join('/');
          found.push(`${name}:${index + 1} "${match[0]}" (${correction})`);
        }
      }
    }
  }

  assert.deepEqual(found, [], `British spellings found:\n${found.join('\n')}`);
});
