# Penalties Overlay

## Preview

Coming soon.

## Overview

It's common for streamers to display a penalty overlay data during timeouts, although it isn't always easy for viewers to understand what that data means.  That's especially true when a penalty overlay might only be visible for a few seconds.  The intent of this overlay is to provide a simple view of penalty and game status information in a format that makes it easy to see:

- Which teams are playing each other.
- The score, period, and game clock.
- Which team is on which side of the screen.
- Which players have penalties, and how many they have.
- Which players have high penalty counts, fouled out, or been expelled.
- How many penalties each team has.
- Tournament information, if applicable.
- Optionally, the host league, tournament, or sanctioning body logo.

## Features

The overlay extracts game information from the CRG "IGRF" and "Teams" tabs, so you only need to set that information in one place.  The information displays in two separate areas; one for rosters and penalty data, and one for game information:

### Rosters & Penalties Area

- Displays team logos, if available for both teams.
  - Sized to fit 180px x 180px containers.
- Displays roster number, name, penalty codes, and total penalty counts for each player.
  - Indicates the team captains with a "C".
  - Hides roster names that don't include a roster name and number.
- Customizable roster display colors.
  - Uses each team's "whiteboard" background and text colors if set.
  - Defaults to a black background with white text.
- Highlights player penalty counts at specific thresholds.
  - 5 penalties in <code style="color : gold">yellow</code>.
  - 6 penalties in <code style="color : darkorange">orange</code>.
  - 7+ penalties, foul outs, and expulsions in <code style="color : red">red</code>.
- Changes player numeric penalty counts to "FO" or "EXP" for foul outs and expulsions, respectively.
  - Displays "EXP" for players who are expelled after fouling out.
- Displays the total penalty count for each team.

### Game Information Area

- Displays the tournament name and game number if both are set.
- Displays team names if set.
  - Uses the "whiteboard" alternate name text for each team if set.
  - Uses the "Team" fields in the "Teams" tab if the "whiteboard" name is not set.
  - Defaults to "Team 1" and "Team 2".
- Displays each team's points.
- Displays the game clock and a labels read from the "Intermission Labels" section of the "Settings" tab:
  - **Pre Game** - defaults to "Time to Derby".
  - **Intermission** - defaults to "Intermission".
  - **Unofficial Score** - defaults to "Unofficial Score".
  **- Official Score** - defaults to "Official Score".
- Displays game clock labels for other game states:
  - "Period N" - during each period.
  - "Overtime" - during overtime jams.
- Optionally displays a custom logo to provide league, tournament, or sanctioning body branding
  - Sized to fit a 100px x 100px container.

## Compatibility

| CRG Version | Description        |
| ----------- | -------------------|
| 2025.x      | :white_check_mark: |
| 2023.x      | Not Tested         |
| Other       | :x:                |

## Usage

To make this overlay to your video streaming team, you need to download the files from the repository and place them in a specific folder within your CRG instance.  

### Open Broadcaster Software (OBS) Details

| Setting    | Value                                                         |
| ---------- | ------------------------------------------------------------- |
| Resolution | 1920 x 1080                                                   |
| Background | Transparent                                                   |
| URL        | `https://<crg-ip-address>:8000/custom/overlay/penalties` [^1] |

### Optional Custom Logo

<!-- 

- Custom logo
- Resolution
- Background transparency

 -->

[^1]: Replace `<crg-ip-address>` with the IP address of your CRG instance
