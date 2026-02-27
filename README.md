# TrackPull

<p align="center">
  <img src="TrackPuller.png" alt="TrackPull" width="300">
</p>

A Chrome extension that pulls shot data from Trackman web reports and exports it as CSV.

## Features

- Automatically captures shot data when you open a Trackman report
- Exports to CSV with metrics grouped by category (speed, launch, spin, distance, etc.)
- Imperial/metric unit toggle
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
4. Toggle between imperial and metric units
5. Click **Export CSV** to download your data

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
| Impact | Low Point, Impact Height, Impact Offset |
| Other | Tempo |

## Development

### Build the extension

```bash
bash scripts/build-extension.sh
```

### Create a release zip

```bash
bash scripts/build-zip.sh
```
