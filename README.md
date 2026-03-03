# TrackPull

<p align="center">
  <img src="TrackPuller.png" alt="TrackPull" width="300">
</p>

[![Tests](https://github.com/criticalberne/TrackPull/actions/workflows/tests.yml/badge.svg)](https://github.com/criticalberne/TrackPull/actions/workflows/tests.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Chrome extension that pulls shot data from Trackman web reports — export to CSV, copy to clipboard, or launch one-click AI analysis.

## Features

- Automatically captures shot data when you open a Trackman report
- **Export CSV** with metrics grouped by category (speed, launch, spin, distance, etc.)
- **Copy to clipboard** as tab-separated values — paste directly into Google Sheets or Excel
- **One-click AI analysis** — launch ChatGPT or Claude with your data + a golf analysis prompt
- 8 built-in golf prompts across beginner, intermediate, and advanced skill tiers
- Create and manage custom prompt templates in the options page
- Independent speed (mph / m/s) and distance (yards / meters) unit selectors
- Hitting surface selector (Mat / Grass) — included as metadata in all exports and AI prompts
- Files named `ShotData_YYYY-MM-DD.csv` for easy organization

## Install

### Option 1: Download the release (easiest)

1. Download `production.zip` from the [latest release](https://github.com/criticalberne/TrackPull/releases/latest)
2. Unzip it
3. Go to `chrome://extensions` and enable **Developer Mode**
4. Click **Load unpacked** and select the unzipped folder

### Option 2: Clone and build

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

1. Open a Trackman report URL (`web-dynamic-reports.trackmangolf.com`)
2. The extension automatically captures shot data
3. Click the TrackPull icon in your toolbar to see the shot count
4. Choose your preferred speed units, distance units, and hitting surface
5. **Export CSV** — download your data as a CSV file
6. **Copy TSV** — copy tab-separated data to clipboard for spreadsheets
7. **Open in AI** — launch ChatGPT or Claude with your data and a selected prompt
8. **Copy Prompt + Data** — copy the prompt and data to clipboard for manual paste

### Supported URL formats

```
https://web-dynamic-reports.trackmangolf.com/reports?r=12345
https://web-dynamic-reports.trackmangolf.com/activities?a=67890
https://web-dynamic-reports.trackmangolf.com/reports?ReportId=11223
```

## CSV Column Order

Metrics are grouped by analytical category for quick scanning:

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

## AI Prompt Templates

TrackPull includes 8 built-in prompts accessible directly from the popup — select a prompt, click **Open in AI**, and your data is ready for analysis. You can also create custom prompts in the options page.

The `prompts/` folder contains the same prompts as standalone markdown files for reference:

### Beginner
- [Understanding Your Numbers](prompts/beginner/understanding-your-numbers.md) — Learn what each metric means and how yours compare to average golfers
- [Basic Club Recommendations](prompts/beginner/basic-club-recommendations.md) — Find out what category of clubs suits your swing

### Intermediate
- [Distance Gapping](prompts/intermediate/distance-gapping.md) — Identify carry distance gaps and overlaps in your bag
- [Shaft Flex Analysis](prompts/intermediate/shaft-flex-analysis.md) — Get shaft flex and weight recommendations based on your speed and launch data
- [Shot Shape Tendencies](prompts/intermediate/shot-shape-tendencies.md) — Analyze your face angle, club path, and curvature patterns

### Advanced
- [Launch & Spin Optimization](prompts/advanced/launch-spin-optimization.md) — Compare your launch/spin to optimal windows and suggest loft/shaft changes
- [Club Delivery Analysis](prompts/advanced/club-delivery-analysis.md) — Evaluate attack angle, dynamic loft, and low point for efficiency
- [Full Bag Fitting](prompts/advanced/full-bag-fitting.md) — Comprehensive analysis with specific club head, shaft, and setup recommendations

## Development

### Build the extension

```bash
bash scripts/build-extension.sh
```

### Create a release zip

```bash
bash scripts/build-zip.sh
```
