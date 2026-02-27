# Trackman Scraper Chrome Extension

Extract shot data from Trackman reports and export to CSV.

## Installation (Unpacked)

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `dist/` directory containing the built extension files
5. Extension will appear in your extensions list

## Usage

### Report URLs

The extension automatically activates on Trackman report pages. Supported URL formats:

**Report by ID:**
```
https://web-dynamic-reports.trackmangolf.com/reports?r=12345
```

**Activity with Report:**
```
https://web-dynamic-reports.trackmangolf.com/activities?a=67890
```

**Report with ReportId parameter:**
```
https://web-dynamic-reports.trackmangolf.com/reports?ReportId=11223
```

### Custom Column Order

Specify CSV column order using `mp[]` parameters:

```
https://web-dynamic-reports.trackmangolf.com/reports?r=12345&mp[]=Carry&mp[]=SpinRate&mp[]=Distance
```

### Shot Group Filtering

Filter to specific shot groups using `sgos[]` parameter:

```
https://web-dynamic-reports.trackmangolf.com/reports?r=12345&sgos[]=1,2,3
```

## Features

- **Auto-capture**: Extension captures data as you browse reports
- **CSV Export**: Click the extension icon and export to CSV
- **Custom Columns**: Control CSV column order via URL parameters
- **Session Tracking**: Real-time shot count in popup

## Development

### Build Extension

```bash
bash scripts/build-extension.sh
```

### Create Production Zip

```bash
bash scripts/build-zip.sh
```

### Smoke Test

```bash
bash scripts/smoke-test-extension.sh
```

## Testing

Run all tests:

```bash
pytest tests/ -v
```
