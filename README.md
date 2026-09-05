# Custom Overlays for CRG

[![Super Linter](https://github.com/rcrderby/crg-overlays/actions/workflows/super-linter.yml/badge.svg)](https://github.com/rcrderby/crg-overlays/actions/workflows/super-linter.yml)
[![Run Tests](https://github.com/rcrderby/crg-overlays/actions/workflows/tests.yml/badge.svg)](https://github.com/rcrderby/crg-overlays/actions/workflows/tests.yml)
[![GitHub Issues](https://img.shields.io/github/issues/rcrderby/crg-overlays?label=Issues)](https://github.com/rcrderby/crg-overlays/issues)
[![GitHub Release (latest by date)](https://img.shields.io/github/v/release/rcrderby/crg-overlays?label=Latest%20Release)](https://github.com/rcrderby/crg-overlays/releases/latest)

## Overview

This repository hosts custom overlays for the [CRG Scoreboard](https://github.com/rollerderby/scoreboard "CRG Scoreboard Git Repository"), created using the tutorial in the [CRG Wiki](https://github.com/rollerderby/scoreboard/wiki/Custom-Screen-Creation-Tutorial "CRG Custom Screen Wiki Page").

After placing custom overlay files on an instance of CRG, a video streaming team can consume them in the same way they do for [CRG's built-in overlays](https://github.com/rollerderby/scoreboard/wiki/Scoreboard-Video-Overlays "CRG Overlay Wiki Page").

## Overlays

Click a link in the table below to access specific overlay details and usage instructions:

| Name                                                   | Description                                                                                  |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| [Penalties](./penalties/README.md "Penalties Overlay") | A viewer-friendly and customizable display of team rosters, penalties, and game information. |

## Tests

The test suite runs with [Deno](https://deno.com "Deno Website") and needs no other tools:

```bash
deno test --allow-read tests/
```

The tests cover the display setting limits in `config.js`, the roster and penalty functions CRG calls through the `sb` bindings, the wiring between `index.html`, `index.js` and `config.js`, and U.S. English spelling.  [GitHub Actions](./.github/workflows "Workflows") runs them, plus [Super Linter](https://github.com/super-linter/super-linter "Super Linter"), on every push and pull request.

## Disclaimer

CRG overlays should render predictably, although different CRG versions, odd or corrupted game states, browsers, video streaming software, etc. may cause overlays to work differently than expected.  Please open an [Issue](https://github.com/rcrderby/crg-overlays/issues "Repository Issues") to report a problem or request features.
