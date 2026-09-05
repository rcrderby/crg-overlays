# Penalties Overlay

## Contents

- [Features](#features "Overlay Features")
- [Compatibility](#compatibility "Overlay CRG Compatibility")
- [Usage](#usage "Overlay Usage Instructions")
- [Configuration](#configuration "Configuration File Reference")

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

The overlay gets the information and settings it needs from CRG, so you can just set up your game(s) and expect the overlay to work.  The overlay displays information from CRG in two separate areas: one for rosters and penalties, and one for game information.

### Rosters & Penalties Area

- Displays team logos.
  - Logos automatically resize to fit 100px x 100px containers.
- Displays rosters for each team that include player numbers, names, assigned penalty codes, and total penalty count for each player.
  - Indicates team captains with a "C" and alternate captains with an "A".
  - Hides roster names that are marked as:
    - "Bench Alt Captain"
    - "Bench Staff".
    - "Not Skating"
  - Uses each team's custom "whiteboard" background, text, and glow colors if set.
    - Defaults to black backgrounds with white text if not set.
- Highlights player penalty counts with different color backgrounds at specific thresholds.
  - 5 penalties in yellow :yellow_square:
  - 6 penalties in orange :orange_square:
  - 7+ penalties, foul outs, expulsions, and removals in red :red_square:
- Changes player numeric penalty counts to:
  - "FO" for foul outs.
  - "EXP" for expulsions.
  - "RE" for head official removals.
- Displays the total count of penalties for each team.

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
  - Automatically resized to fit a 70px x 70px container.

## Compatibility

| CRG Version | Description        |
| ----------- | -------------------|
| 2027.x      | Not Tested         |
| 2025.x      | :white_check_mark: |
| 2023.x      | Not Tested         |
| Other       | :x:                |

## Usage

To make this overlay available to your video streaming team, you need to download the overlay files from this repository and place them in a specific folder within your instance of CRG.  There are several ways to download the overlay files, and the following steps detail one method.

**Download the overlay files:**

1. Navigate to the [Releases page](https://github.com/rcrderby/crg-overlays/releases "Releases Page") of this repository.
2. Click on one of the **Source code** links in the **Assets** section of the latest release to download a compressed/zipped copy of the overlay files.
3. Extract the `.zip` or `tar.gz` file you downloaded.
4. From the extracted files, locate the `penalties` folder; you will copy this folder to your instance of CRG.

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

Provide this information to your video streaming team to give them access to the overlay:

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

#### Scale Adjustments

You can adjust the scale of the overlay to fit your broadcast display with the `scale` URL parameter.  For example:

| Scale | URL |
| - | - |
| Default scale (100%) | `https://<crg-ip-address>:8000/custom/overlay/penalties?scale=100` |
| Scale down 5% (95%) | `https://<crg-ip-address>:8000/custom/overlay/penalties?scale=95` |
| Scale down 10% (90%) | `https://<crg-ip-address>:8000/custom/overlay/penalties?scale=90` |

> [!TIP]
> The allowed `scale` parameter range is `1` to `100`.  See the `overlayScale` setting in the [Configuration Section](#configuration "Configuration Section") for details.

#### Width Adjustments

The overlay is narrower than the video frame so it doesn't crowd the edges.  Use the `width` URL parameter to adjust the overlay width.

| Width | URL |
| - | - |
| Default (85%) | `https://<crg-ip-address>:8000/custom/overlay/penalties?width=85` |
| Wider (95%) | `https://<crg-ip-address>:8000/custom/overlay/penalties?width=95` |
| Narrower (75%) | `https://<crg-ip-address>:8000/custom/overlay/penalties?width=75` |

> [!TIP]
> The allowed `width` parameter range is `50` to `100`.  Narrowing the overlay takes space from the player name column, so long player names may begin to truncate below about `75`.  See the `overlayWidth` setting in the [Configuration Section](#configuration "Configuration Section") for details.

#### Position Adjustments

The overlay scales from the top of the frame by default, so scaling down leaves empty space at the bottom.  Use the `anchor` URL parameter to change the point it scales from.  For example:

| Anchor | URL |
| - | - |
| Top of the frame (default) | `https://<crg-ip-address>:8000/custom/overlay/penalties?anchor=top` |
| Middle of the frame | `https://<crg-ip-address>:8000/custom/overlay/penalties?anchor=center` |
| Bottom of the frame | `https://<crg-ip-address>:8000/custom/overlay/penalties?anchor=bottom` |

You can combine the `anchor` and `scale` parameters to fit your needs:

`https://<crg-ip-address>:8000/custom/overlay/penalties?scale=90&anchor=bottom`

> [!TIP]
> The allowed `anchor` parameter values are `top`, `center`, and `bottom`. See the `overlayAnchor` setting in the [Configuration Section](#configuration "Configuration Section") for details.

#### Background Opacity

Use the `opacity` URL parameter to adjust how visible the video stream is through the overlay background:

| Opacity | URL |
| - | - |
| Default (98%) | `https://<crg-ip-address>:8000/custom/overlay/penalties?opacity=98` |
| Lightly translucent (85%) | `https://<crg-ip-address>:8000/custom/overlay/penalties?opacity=85` |
| Heavily translucent (60%) | `https://<crg-ip-address>:8000/custom/overlay/penalties?opacity=60` |

> [!TIP]
> The allowed `opacity` parameter range is `0` to `100`, where `100` is solid and `0` is invisible.  This affects the overlay background only; player names and penalty codes stay fully opaque.  See the `overlayOpacity` setting in the [Configuration Section](#configuration "Configuration Section") for details.

#### Font Selection

The overlay bundles four font pairings and uses `saira` as its default.  Use the `font` URL parameter to choose another font:

| Pairing | Headings | Body text | URL |
| - | - | - | - |
| `saira` (default) | Saira Condensed | Saira | `https://<crg-ip-address>:8000/custom/overlay/penalties?font=saira` |
| `league-gothic` | League Gothic | Barlow | `https://<crg-ip-address>:8000/custom/overlay/penalties?font=league-gothic` |
| `anton` | Anton | Chivo | `https://<crg-ip-address>:8000/custom/overlay/penalties?font=anton` |
| `bricolage` | Bricolage Grotesque | Barlow Condensed | `https://<crg-ip-address>:8000/custom/overlay/penalties?font=bricolage` |

> [!NOTE]
> The overlay loads these fonts from its own `fonts` folder rather than from a web font service, so the fonts work correctly on a scoreboard computer with no Internet connection.  All of the fonts use the SIL Open Font License; see [`fonts/OFL.txt`](./fonts/OFL.txt) for details.

#### Animation Options

The overlay has animation for its background and timeout banner.  Use the `background` and `timeout` URL parameters to change or disable either one:

| Background | Effect | URL |
| - | - | - |
| `trace` (default) | A gradient travels around the overlay border | `https://<crg-ip-address>:8000/custom/overlay/penalties?background=trace` |
| `organic` | Soft pools of light drift across the panel | `https://<crg-ip-address>:8000/custom/overlay/penalties?background=organic` |
| `shine` | A single band of light crosses diagonally | `https://<crg-ip-address>:8000/custom/overlay/penalties?background=shine` |
| `off` | No background animation | `https://<crg-ip-address>:8000/custom/overlay/penalties?background=off` |

| Timeout banner | Effect | URL |
| - | - | - |
| `glow` (default) | The banner color breathes | `https://<crg-ip-address>:8000/custom/overlay/penalties?timeout=glow` |
| `pulse` | An outline expands away from the banner | `https://<crg-ip-address>:8000/custom/overlay/penalties?timeout=pulse` |
| `shine` | A band of light crosses the banner | `https://<crg-ip-address>:8000/custom/overlay/penalties?timeout=shine` |
| `off` | No timeout banner animation | `https://<crg-ip-address>:8000/custom/overlay/penalties?timeout=off` |

> [!NOTE]
> Browsers that request reduced motion will see no overlay or timeout banner animation.

#### Penalty Code Key

The overlay lists definitions for any penalty codes in use during a game.  Use the `key` URL parameter to hide it:

| Key | URL |
| - | - |
| Visible (default) | `https://<crg-ip-address>:8000/custom/overlay/penalties?key=true` |
| Hidden | `https://<crg-ip-address>:8000/custom/overlay/penalties?key=false` |

> [!NOTE]
> CRG provides penalty code definitions from the active ruleset.  Codes with no definition do not appear in the key, nor does the unknown penalty code (`?`), which says only that a penalty has not been identified.  The key always occupies one line, reducing its text size as needed, so every code fits.

### Optional Custom Logo

To add a custom logo to the left side game information area of the overlay:

1. Create a logo file with the name `banner-logo.png`.[^2]
2. Open the folder on your scoreboard computer that contains your instance of CRG (e.g., `crg-scoreboard_v202N.x`).
3. Open the `html` folder.
4. Open the `custom` folder.
5. Open the `overlay` folder.
6. Open the `logos` folder.
7. Copy and paste or move the `banner-logo.png` file into the `logos` folder.

The logo will display in the game information area of the overlay once you refresh your browser.

## Configuration

A configuration file named [config.js](./config.js) allows you to customize various overlay settings.  Please note that some settings are safe to change, and others are best left at their default values:

- :white_check_mark: - Safe to change
- :warning: - Proceed with caution
- :x: - Not recommended

### Common Customizations

- `config.overlayScale` to adjust the overlay scale - between 1 and 100 (default is `100`).
- `config.overlayWidth` to adjust the overlay width - between 50 and 100 (default is `85`).
- `config.overlayAnchor` to set the point the overlay scales from - `top`, `center`, or `bottom` (default is `top`).
- `config.overlayOpacity` to adjust how much of the video shows through the overlay background - between 0 and 100 (default is `98`).
- `config.overlayFont` to set the font pairing - `saira`, `league-gothic`, `anton`, or `bricolage` (default is `saira`).
- `config.backgroundAnimation` to set the background animation - `trace`, `organic`, `shine`, or `off` (default is `trace`).
- `config.timeoutAnimation` to set the timeout banner animation - `glow`, `pulse`, `shine`, or `off` (default is `glow`).
- `config.penaltyCodeKey` to show or hide the penalty code key - `true` or `false` (default is `true`).
- `config.titleBannerText` to adjust the title text (default is `PENALTIES`).

> [!WARNING]
> Changes to `config.js` require a page refresh to take effect.

<details>
  <summary>
    Configuration File Reference
  </summary>

  ***debug*** **Section**

  | Setting | Description | Type | Default | Adjustable |
  | - | - | - | - | - |
  | `debug` | Enable debug logging to browser console (set to `true` for troubleshooting) | boolean | `false` | :white_check_mark: |

  ---

  ***config*** **Section**

  | Setting | Description | Type | Default | Adjustable |
  | - | - | - | - | - |
  | `bannerLogoPath` | Path to an optional custom logo in the game information section | string | `logos/banner-logo.png` | :warning: |
  | `filteredSkaterFlags` | Skater flags to filter from roster display (Not Skating, Bench Alt Captain, Bench Staff) | array of strings | `['ALT', 'B', 'BA']` | :x: |
  | `defaultRosterShadowProperties` | Default roster shadow properties | string | `.5px .5px 1px` | :x: |
  | `loadingOverlayText` | Text displayed on the "loading" screen | string | `Loading game data...` | :white_check_mark: |
  | `titleBannerText` | Title text | string | `PENALTIES` | :white_check_mark: |
  | `overlayScale` | Overlay scale percentage: 100  = full scale, 90 = 90% scale, etc. (1 to 100) - the [`scale` URL parameter](#scale-adjustments "Scale Adjustments Section") overrides this value | int or float | `100` | :white_check_mark: |
  | `overlayAnchor` | Point the overlay scales from: `top`, `center`, or `bottom` - the [`anchor` URL parameter](#position-adjustments "Position Adjustments Section") overrides this value | string | `top` | :white_check_mark: |
  | `overlayWidth` | Overlay width percentage of the video frame (50 to 100) - the [`width` URL parameter](#width-adjustments "Width Adjustments Section") overrides this value | int or float | `85` | :white_check_mark: |
  | `overlayOpacity` | Overlay background opacity percentage: 100 is solid, 0 is invisible (0 to 100) - the [`opacity` URL parameter](#background-opacity "Background Opacity Section") overrides this value | int or float | `98` | :white_check_mark: |
  | `overlayFont` | Font pairing: `saira`, `league-gothic`, `anton`, or `bricolage` - the [`font` URL parameter](#font-selection "Font Selection Section") overrides this value | string | `saira` | :white_check_mark: |
  | `backgroundAnimation` | Background animation: `trace`, `organic`, `shine`, or `off` - the [`background` URL parameter](#animation-options "Animation Options Section") overrides this value | string | `trace` | :white_check_mark: |
  | `timeoutAnimation` | Timeout banner animation: `glow`, `pulse`, `shine`, or `off` - the [`timeout` URL parameter](#animation-options "Animation Options Section") overrides this value | string | `glow` | :white_check_mark: |
  | `penaltyCodeKey` | Penalty code key visibility below the rosters - the [`key` URL parameter](#penalty-code-key "Penalty Code Key Section") overrides this value | boolean | `true` | :white_check_mark: |

  ---

  ***classes*** **Section**

  | Setting | Description | Type | Default | Adjustable |
  | - | - | - | - | - |
  | `customLogoSelector` | CSS Selector for the custom logo container | string | `#custom-logo` | :x: |
  | `customLogoSpaceSelector` | CSS Selector for the custom logo space container | string | `#custom-logo-space` | :x: |
  | `customLogoSpaceVisibleSelectorSuffix` | CSS Selector for the visible custom logo space container container | string | `visible` | :x: |
  | `loadingOverlayFadeOutSuffixSelector` | CSS Selector for the loading overlay fade out | string | `fade-out` | :x: |
  | `loadingOverlaySelector` | CSS Selector for the loading overlay | string | `#loading-overlay` | :x: |
  | `loadingOverlayTextSelector` | CSS Selector for the loading overlay text | string | `.loading-text` | :x: |
  | `penaltiesTitleH1Selector` | CSS Selector for the penalties title H1 text | string | `#penalties-title h1` | :x: |
  | `teamsScoresHasLogoSelectorSuffix` | CSS Selector for the team scores custom logo padding container | string | `has-logo` | :x: |
  | `teamsScoresSelector` | CSS Selector for the team scores container | string | `#teams-scores` | :x: |
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
  | `fouloutCode` | Penalty codes for fouled out players | string | `FO` | :x: |
  | `removedCode` | Penalty code for players removed by the head referee | string | `RE` | :x: |

  ---

  ***timing*** **Section**

  | Setting | Description | Type | Default | Adjustable |
  | - | - | - | - | - |
  | `initWebSocket` | Delay before initializing display after WebSocket connects (ms) | integer | `100` | :x: |
  | `loadCheckInterval` | How often to check if the game rules arrived (ms) | integer | `100` | :x: |
  | `maxLoadWaitMs` | Longest time to wait for the game rules to arrive (ms) | integer | `5000` | :warning: |
  | `minLoadDisplayMs` | Minimum time to show loading screen (ms) | integer | `500` | :x: |

</details>

<!-- Footnotes -->

[^1]: Replace `<crg-ip-address>` with the IP address of your CRG instance.
[^2]: The overlay will constrain your logo to a 70px x 70px container and apply a drop shadow.  
Logos with a 1:1 aspect ratio and a transparent background will produce the best appearance.
