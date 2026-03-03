# TrackPull

<p align="center">
  <img src="TrackPuller.png" alt="TrackPull" width="300">
</p>

[![Tests](https://github.com/criticalberne/TrackPull/actions/workflows/tests.yml/badge.svg)](https://github.com/criticalberne/TrackPull/actions/workflows/tests.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Grab your Trackman data and actually do something with it. Export to CSV, paste into a spreadsheet, or send it straight to ChatGPT/Claude/Gemini for analysis — all from one Chrome extension.

## What it does

- Opens a Trackman report? Data's already captured
- Export as CSV or copy tab-separated values straight into Google Sheets
- One click to launch AI analysis with your data and a golf prompt (ChatGPT, Claude, or Gemini)
- Preview the full prompt and data before sending to AI
- 8 built-in prompts from beginner to advanced, plus custom templates you create
- Pick your units (mph or m/s, yards or meters) and hitting surface (mat or grass)
- Toggle averages on or off in exports — raw shots only when you want them
- Dark mode that follows your system theme


## Install

### Download the release (easiest)

1. Download `production.zip` from the [latest release](https://github.com/criticalberne/TrackPull/releases/latest)
2. Unzip it
3. Go to `chrome://extensions` and enable **Developer Mode**
4. Click **Load unpacked** and select the unzipped folder

### Clone and build

1. Clone the repo:
   ```bash
   git clone https://github.com/criticalberne/TrackPull.git
   cd TrackPull
   ```
2. Install dependencies and build:
   ```bash
   npm install
   bash scripts/build-extension.sh
   ```
3. Go to `chrome://extensions` and enable **Developer Mode**
4. Click **Load unpacked** and select the `dist/` folder

## Usage

1. Open any Trackman report — the extension grabs your shot data automatically
2. Click the TrackPull icon to see your shot count and set preferences
3. Pick what you want to do:
   - **Export CSV** — downloads a file with your data
   - **Copy TSV** — pastes right into spreadsheets
   - **Open in AI** — launches ChatGPT, Claude, or Gemini with a prompt and your data
   - **Copy Prompt + Data** — for pasting into any AI chat manually
4. Expand **Prompt Preview** to inspect exactly what's being sent before you click

Your hitting surface (mat/grass) is tagged in every export and prompt so the AI knows what it's working with. Uncheck "Include averages" if you just want raw shot rows.

<details>
<summary>Supported Trackman URLs</summary>

```
https://web-dynamic-reports.trackmangolf.com/reports?r=12345
https://web-dynamic-reports.trackmangolf.com/activities?a=67890
https://web-dynamic-reports.trackmangolf.com/reports?ReportId=11223
```
</details>

## CSV columns

Columns are grouped so you can scan without hunting:

| Group | Metrics |
|---|---|
| Speed & Efficiency | Club Speed, Ball Speed, Smash Factor |
| Club Delivery | Attack Angle, Club Path, Face Angle, Face To Path, Swing Direction, Dynamic Loft |
| Launch & Spin | Launch Angle, Launch Direction, Spin Rate, Spin Axis, Spin Loft |
| Distance | Carry, Total |
| Dispersion | Side, Side Total, Carry Side, Total Side, Curve |
| Ball Flight | Height, Max Height, Landing Angle, Hang Time |
| Impact | Low Point Distance (in/cm), Impact Height, Impact Offset |
| Other | Tempo |

## AI prompts

Select a prompt from the popup and click **Open in AI** — your data goes with it. You can also build your own in the options page.

### Beginner
- [Understanding Your Numbers](prompts/beginner/understanding-your-numbers.md) — what each metric means and how yours compare
- [Basic Club Recommendations](prompts/beginner/basic-club-recommendations.md) — what category of clubs fits your swing

### Intermediate
- [Distance Gapping](prompts/intermediate/distance-gapping.md) — carry distance gaps and overlaps in your bag
- [Shaft Flex Analysis](prompts/intermediate/shaft-flex-analysis.md) — shaft flex and weight recs from your speed and launch data
- [Shot Shape Tendencies](prompts/intermediate/shot-shape-tendencies.md) — face angle, club path, and curvature patterns

### Advanced
- [Launch & Spin Optimization](prompts/advanced/launch-spin-optimization.md) — your launch/spin vs optimal windows, with loft/shaft suggestions
- [Club Delivery Analysis](prompts/advanced/club-delivery-analysis.md) — attack angle, dynamic loft, and low point efficiency
- [Full Bag Fitting](prompts/advanced/full-bag-fitting.md) — the whole picture with specific club head, shaft, and setup recs

## Development

```bash
# Build the extension
bash scripts/build-extension.sh

# Create a release zip
bash scripts/build-zip.sh
```
