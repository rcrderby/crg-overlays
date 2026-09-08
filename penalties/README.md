# Penalties Overlay

## Contents

- [Overview](#overview "Overlay Overview")
- [Features](#features "Overlay Features")
- [Compatibility](#compatibility "Overlay CRG Compatibility")
- [Usage](#usage "Overlay Usage Instructions")
- [Admin Page](#admin-page "Overlay Admin Page")
- [Configuration File](#configuration-file "Overlay Configuration File")
- [Configuration Reference](#configuration-reference "Configuration File Reference")
- [Upgrading from 3.x](#upgrading-from-3x "Upgrade Notes")

## Preview

![Penalties Overlay Image](./images/penalties-preview.png "Penalties Overlay Image")

## Overview

Video streaming teams often display an overlay with penalty data during timeouts, although it isn't always easy for viewers to understand what all of the data means.  This is especially true when a penalty overlay might only be visible for a few seconds.  The intent of this overlay is to provide a simple view of penalty and game status information in a format that makes it easy to see:

- Which teams are playing each other.
- The score, period number, and game clock.
- Which team is on which side of the screen.
- Which players have penalties, and how many they have.
- Which players have high penalty counts, have fouled out, or have been expelled/removed.
- How many penalties each team has.
- Tournament information, if applicable.
- The status of any active timeout.
- Optionally, the host league, tournament, or sanctioning body's logo.

## Features

The overlay gets the information and settings it needs from CRG, so you can prepare a game and expect the overlay to work.  The overlay displays information from CRG in two separate areas: one for rosters and penalties, and one for game information.

### Rosters & Penalties Area

- Displays team logos.
  - Logos automatically resize to fit a 100px tall container, up to 300px wide.
  - Shrinks the logos and the space they occupy when a full roster and a timeout banner need the room.
- Displays rosters for each team that include player numbers, names, assigned penalty codes, and total penalty count for each player.
  - Indicates team captains with a "C" and alternate captains with an "A".
  - Hides roster names that are marked as:
    - "Bench Alt Captain"
    - "Bench Staff".
    - "Not Skating"
  - Uses each team's custom "whiteboard" background, text, and glow colors if set.
    - Defaults to black backgrounds with white text if not set.
- Highlights player penalty counts with different color backgrounds as a player approaches a foul out.
  - Two penalties before a foul out in yellow :yellow_square:
  - One penalty before a foul out in orange :orange_square:
  - Foul outs, expulsions, and removals in red :red_square:
  - Reads the number of penalties that cause a foul out from the active ruleset, so the colors follow the ruleset a game uses.
- Changes player numeric penalty counts to:
  - "FO" for foul outs.
  - "EXP" for expulsions.
  - "RE" for head official removals.
- Displays up to nine penalty codes for each player (CRG maximum).
- Displays the total count of penalties for each team.
- Displays a key of the penalty codes in play below the rosters.
  - Reads the code definitions from the active ruleset, so a code with no definition does not appear, nor does the unknown code ("?"), which says only that a penalty has not been identified.
  - Keeps the key on one line, reducing its text size as needed, so every code fits.

### Game Information Area

- Displays the tournament name if set.
  - Displays the game number if it and the tournament name are set.
- Displays team names if set.
  - Uses the "whiteboard" alternate name text for each team if set.
  - Uses the "Team" fields in the "Teams" tab for a game if the "whiteboard" name is not set.
  - Defaults to "Team 1" and "Team 2" if neither the "whiteboard" nor "Team" names are set.
- Displays each team's score.
- Displays the game clock.
- Displays a game status label:
  - Uses the appropriate label set by clicking the "Intermission Labels" button section on CRG's "Settings" page:
    - **Pre Game** - defaults to "Time to Derby".
    - **Intermission** - defaults to "Intermission".
    - **Unofficial Score** - defaults to "Unofficial Score".
    - **Official Score** - defaults to "Official Score".
    - **Official Score with Clock** - defaults to "Official Score".
  - Uses default game clock labels for other game statuses:
    - "Period N" - during each period.
    - "Overtime" - during overtime jams.
- Displays a timeout banner to indicate the type of timeout.
- Optionally displays a custom logo to provide league, tournament, or sanctioning body branding.
  - Automatically resized to fit a 170px x 92px container.

## Compatibility

| CRG Version | Description        |
| ----------- | -------------------|
| 2027.x      | :white_check_mark: |
| 2025.x      | :white_check_mark: |
| 2023.x      | Not Tested         |
| Other       | :x:                |

## Usage

To make this overlay available to your video streaming team, you need to download the overlay files from this repository and place them in a specific folder within your instance of CRG.  There are several ways to download the overlay files, and the following steps detail one method.

**Download the overlay files:**

1. Navigate to the [Releases page](https://github.com/rcrderby/crg-overlays/releases "Releases Page") of this repository.
2. From the **Assets** section of the latest release, download `penalties.zip`.
3. Optionally, download `SHA256SUMS` from the same section and confirm the download matches the checksum:

    | Platform | Command |
    | - | - |
    | Linux | `sha256sum -c SHA256SUMS` |
    | macOS | `shasum -a 256 -c SHA256SUMS` |
    | Windows | `Get-FileHash penalties.zip -Algorithm SHA256` |

4. Extract `penalties.zip`, which contains the `penalties` folder you will copy to your instance of CRG.

**Copy the overlay files to CRG:**

1. Open the folder on your scoreboard computer that contains your instance of CRG (e.g., `crg-scoreboard_v202N.x`).
2. Open the `html` folder.
3. Open the `custom` folder.
4. Open the `overlay` folder.
5. Copy and paste or move the `penalties` folder you downloaded into the `overlay` folder.

**Verify the availability of the penalties overlay:**

1. Access your running instance of CRG using your web browser (`https://<crg-ip-address>:8000`).[^1]
2. In the **BROADCAST OVERLAYS** section on the left side of the main page, click the **Custom Overlays** link.
3. From the displayed list of files and directories, click the **penalties** link to display the overlay.

### Open Broadcaster Software (OBS) Details

Provide this information to your video streaming team to give them access to the overlay by adding a "Browser" source in OBS:

| Setting | Value |
| - | - |
| URL | `https://<crg-ip-address>:8000/custom/overlay/penalties`[^1] |
| Width | `1920` |
| Height | `1080` |
| Control audio via OBS | Unchecked |
| Use custom frame rate | Unchecked |
| Custom CSS | Blank |
| Shutdown source when not visible | Unchecked |
| Refresh browser when scene becomes active | Unchecked |
| Page permissions | `Read access to OBS status information` |

### Optional Custom Logo

To add a custom logo to the left side game information area of the overlay:

1. Create a logo file with the name `banner-logo.png`.[^2]
2. Open the folder on your scoreboard computer that contains your instance of CRG (e.g., `crg-scoreboard_v202N.x`).
3. Open the `html` folder.
4. Open the `custom` folder.
5. Open the `overlay` folder.
6. Open the `logos` folder.
7. Copy and paste or move the `banner-logo.png` file into the `logos` folder.

The logo will display in the game information area of the overlay after a browser refresh.

### Fonts

The overlay bundles four font pairings and loads them from its own `fonts` folder rather than from a web font service, so they work on a scoreboard computer with no internet connection.

> [!NOTE]
> All of the fonts use the SIL Open Font License; see [`fonts/OFL.txt`](./fonts/OFL.txt) for details.

### Troubleshooting

The overlay logs the settings it reads and the decisions it makes during a game to the browser console.  Add the `debug` URL parameter to a browser source to turn logging on for that source:

| Debug logging | URL |
| - | - |
| Off (default) | `https://<crg-ip-address>:8000/custom/overlay/penalties`[^1] |
| On | `https://<crg-ip-address>:8000/custom/overlay/penalties?debug=true`[^1] |

> [!TIP]
> Open your browser's developer tools to read the console.  Warnings about invalid settings always appear, whether debug logging is on or off.  To log from every browser source, set `debug.enabled` to `true` in [config.js](./config.js) instead.

## Admin Page

The overlay has an admin page that allows you to adjust configurable options at `https://<crg-ip-address>:8000/custom/overlay/penalties/admin`.[^1]

There are several animation options available for the overlay background and timeout banner, browsers that request reduced motion will show no animation for either.

## Configuration File

A configuration file named [config.js](./config.js) allows you to customize various overlay settings.  Some settings are safe to change, and others are best left at their default values.

The configuration file values are a starting point.  A setting saved on the [Admin Page](#admin-page "Admin Page Section") takes precedence over this file, as does the `debug` URL parameter described in [Troubleshooting](#troubleshooting "Troubleshooting Section").

> [!WARNING]
> Changes to `config.js` require a page refresh to take effect.

## Configuration Reference

Expand `Configuration File Details` to review the parameters in [config.js](./config.js).

<details>
  <summary>
    Configuration File Details
  </summary>

  The **Adjustable** column says how safe a setting is to change:

- :white_check_mark: - Safe to change
- :warning: - Proceed with caution
- :x: - Not recommended

  ---

  ***debug*** **Section**

  | Setting | Description | Type | Default | Adjustable |
  | - | - | - | - | - |
  | `enabled` | Enable debug logging to browser console (set to `true` for troubleshooting) | boolean | `false` | :white_check_mark: |

  ---

  ***config*** **Section**

  | Setting | Description | Type | Default | Adjustable |
  | - | - | - | - | - |
  | `bannerLogoPath` | Path to an optional custom logo in the game information section | string | `logos/banner-logo.png` | :warning: |
  | `filteredSkaterFlags` | Skater flags to filter from roster display (Not Skating, Bench Alt Captain, Bench Staff) | array of strings | `['ALT', 'B', 'BA']` | :x: |
  | `defaultRosterShadowProperties` | Default roster shadow properties | string | `.5px .5px 1px` | :x: |
  | `loadingOverlayText` | Text displayed on the "loading" screen | string | `Loading game data...` | :white_check_mark: |
  | `titleBannerText` | Title text | string | `PENALTIES` | :white_check_mark: |
  | `titleBannerVisible` | Title visibility | boolean | `true` | :white_check_mark: |
  | `backgroundAnimation` | Background animation: `trace`, `organic`, `shine`, or `off` | string | `trace` | :white_check_mark: |
  | `overlayAnchor` | Point the overlay scales from: `top`, `center`, or `bottom` | string | `top` | :white_check_mark: |
  | `overlayFont` | Font pairing: `saira`, `league-gothic`, `anton`, or `bricolage` | string | `saira` | :white_check_mark: |
  | `overlayOpacity` | Overlay background opacity percentage: 100 is solid, 0 is invisible (0 to 100) | int or float | `98` | :white_check_mark: |
  | `overlayScale` | Overlay scale percentage: 100  = full scale, 90 = 90% scale, etc. (1 to 100) | int or float | `100` | :white_check_mark: |
  | `overlayWidth` | Overlay width percentage of the video frame (70 to 100) | int or float | `85` | :white_check_mark: |
  | `penaltyCodeKey` | Penalty code key visibility below the rosters | boolean | `true` | :white_check_mark: |
  | `timeoutAnimation` | Timeout banner animation: `glow`, `pulse`, `shine`, or `off` | string | `glow` | :white_check_mark: |

  ---

  ***storage*** **Section**

  | Setting | Description | Type | Default | Adjustable |
  | - | - | - | - | - |
  | `settingChannelPrefix` | Channel prefix CRG stores the overlay's settings under | string | `ScoreBoard.Settings.Setting(Penalties.Overlay.` | :x: |

  ---

  ***validation*** **Section**

  Allowed values and defaults for the ***config*** settings.

  | Setting | Description | Type | Default | Adjustable |
  | - | - | - | - | - |
  | `anchor` | Default for `overlayAnchor` | object | `top` | :warning: |
  | `backgroundAnimation` | Default for `backgroundAnimation` | object | `trace` | :warning: |
  | `debug` | Default for `debug.enabled` | object | `false` | :warning: |
  | `font` | Default for `overlayFont` | object | `saira` | :warning: |
  | `opacity` | Allowed range and default for `overlayOpacity` | object | `0` to `100`, default `98` | :warning: |
  | `penaltyCodeKey` | Default for `penaltyCodeKey` | object | `true` | :warning: |
  | `penaltyCodes.max` | Most penalty codes a roster row displays | integer | `9` | :warning: |
  | `scale` | Allowed range and default for `overlayScale` | object | `1` to `100`, default `100` | :warning: |
  | `timeoutAnimation` | Default for `timeoutAnimation` | object | `glow` | :warning: |
  | `title` | Default for `titleBannerText` | object | `PENALTIES` | :warning: |
  | `titleVisible` | Default for `titleBannerVisible` | object | `true` | :warning: |
  | `width` | Allowed range and default for `overlayWidth` | object | `70` to `100`, default `85` | :warning: |

  ---

  ***classes*** **Section**

  | Setting | Description | Type | Default | Adjustable |
  | - | - | - | - | - |
  | `customLogoSelector` | CSS Selector for the custom logo container | string | `#custom-logo` | :x: |
  | `customLogoSpaceSelector` | CSS Selector for the custom logo space container | string | `#custom-logo-space` | :x: |
  | `customLogoSpaceVisibleSelectorSuffix` | CSS Selector for the visible custom logo space container | string | `visible` | :x: |
  | `loadingOverlayFadeOutSuffixSelector` | CSS Selector for the loading overlay fade out | string | `fade-out` | :x: |
  | `loadingOverlaySelector` | CSS Selector for the loading overlay | string | `#loading-overlay` | :x: |
  | `loadingOverlayTextSelector` | CSS Selector for the loading overlay text | string | `.loading-text` | :x: |
  | `penaltyCodeKeySelector` | CSS Selector for the penalty code key container | string | `#penalty-code-key` | :x: |
  | `penaltyCodeKeyItemsSelector` | CSS Selector for the penalty code key items | string | `.code-key-items` | :x: |
  | `penaltyCodeKeyVisibleSelectorSuffix` | CSS Selector for the visible penalty code key | string | `visible` | :x: |
  | `penaltiesTitleSelector` | CSS Selector for the penalties title container | string | `#penalties-title` | :x: |
  | `penaltiesTitleH1Selector` | CSS Selector for the penalties title H1 text | string | `#penalties-title h1` | :x: |
  | `penaltiesTitleVisibleSelectorSuffix` | CSS Selector for the visible penalties title | string | `visible` | :x: |
  | `textShadow` | CSS Variable for text shadows | string | `var(--team-penalties-default-text-shadow)` | :x: |

  ---

  ***labels*** **Section**

  | Setting | Description | Type | Default | Adjustable |
  | - | - | - | - | - |
  | `altCaptainFlag` | Character displayed next to alternate captain names | string | `A` | :warning: |
  | `captainFlag` | Character displayed next to team captain names | string | `C` | :warning: |
  | `defaultTeamNamePrefix` | Prefix used for default team names | string | `Team` | :warning: |
  | `defaultPeriodLabelPrefix` | Prefix used for default period label | string | `Period` | :warning: |
  | `expelledDisplay` | Text displayed for expelled skaters | string | `EXP` | :warning: |
  | `fouloutDisplay` | Text displayed for fouled out skaters | string | `FO` | :warning: |
  | `removedDisplay` | Text displayed for removed skaters | string | `RE` | :warning: |
  | `timeout.untyped` | Label for untyped timeout | string | `Timeout` | :white_check_mark: |
  | `timeout.official` | Label for official timeout | string | `Official Timeout` | :white_check_mark: |
  | `timeout.team` | Label for team timeout | string | `Team Timeout` | :white_check_mark: |
  | `timeout.review` | Label for official review | string | `Official Review` | :white_check_mark: |
  | `timeoutOwner.official` | Timeout owner indicator for official | string | `O` | :x: |
  | `timeoutOwner.team1` | Timeout owner indicator for team 1 | string | `_1` | :x: |
  | `timeoutOwner.team2` | Timeout owner indicator for team 2 | string | `_2` | :x: |

  ---

  ***rules*** **Section**

  | Setting | Description | Type | Default | Adjustable |
  | - | - | - | - | - |
  | `warningPenaltyOffsets.first` | Number of penalties before the first foulout warning color | integer | `2` | :warning: |
  | `warningPenaltyOffsets.second` | Number of penalties before the second foulout warning color | integer | `1` | :warning: |

  ---

  ***penalties*** **Section**

  | Setting | Description | Type | Default | Adjustable |
  | - | - | - | - | - |
  | `fouloutCode` | Penalty code for fouled out players | string | `FO` | :x: |
  | `removedCode` | Penalty code for players removed by the head referee | string | `RE` | :x: |
  | `unknownCode` | Penalty code CRG uses when the code is not known | string | `?` | :x: |

  ---

  ***timing*** **Section**

  | Setting | Description | Type | Default | Adjustable |
  | - | - | - | - | - |
  | `initWebSocket` | Delay before initializing display after WebSocket connects (ms) | integer | `100` | :x: |
  | `loadCheckInterval` | How often to check if the game rules arrived (ms) | integer | `100` | :x: |
  | `maxLoadWaitMs` | Longest time to wait for the game rules to arrive (ms) | integer | `5000` | :warning: |
  | `minLoadDisplayMs` | Minimum time to show loading screen (ms) | integer | `500` | :x: |
  | `penaltyCodeKeyRebuild` | Delay before rebuilding the penalty code key after an update (ms) | integer | `50` | :x: |

</details>

## Upgrading from 3.x

Replace the entire `penalties` folder rather than copying individual files into it.

> [!IMPORTANT]
> Do not keep a `config.js` file from 3.x.  Version 4.x adds a `validation` section that the overlay requires, and an older file will produce a configuration error.

Version 4.x reads more of its behavior from CRG, so these settings no longer exist:

| Removed setting | Replacement |
| - | - |
| `config.titleBannerBackgroundColor` | The title banner has no background box to color. |
| `config.titleBannerForegroundColor` | The title banner has no background box to color. |
| `config.titleBannerShadow` | The title banner has no background box to shadow. |
| `rules.fouloutPenaltyCount` | Read from the active ruleset, so penalty colors follow the ruleset a game uses. |
| `rules.warningPenaltyCount5` | `rules.warningPenaltyOffsets.first`, counted back from the foul out count. |
| `rules.warningPenaltyCount6` | `rules.warningPenaltyOffsets.second`, counted back from the foul out count. |
| `rules.numPeriods` | Read from the active ruleset. |
| `rules.numTeams` | No longer used. |
| `classes.teamsScoresSelector` | Removed with the game information area redesign. |
| `classes.teamsScoresHasLogoSelectorSuffix` | Removed with the game information area redesign. |

See the [Configuration Reference](#configuration-reference "Configuration Reference Section") for the settings a 4.x `config.js` holds.

<!-- Footnotes -->

[^1]: Replace `<crg-ip-address>` with the IP address of your CRG instance.
[^2]: The overlay will constrain your logo to a 170px x 92px container and apply a drop shadow.  
Logos with a transparent background will produce the best appearance.
