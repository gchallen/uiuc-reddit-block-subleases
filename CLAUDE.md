# Project Context

Tampermonkey userscript to filter housing/sublease posts from r/UIUC.

## Tech Stack

- **Userscript**: Vanilla JS (Tampermonkey/Greasemonkey)
- **Analysis scripts**: TypeScript with Bun
- **Chart generation**: Puppeteer for PNG export

## Key Files

- `uiuc-reddit-housing-filter.user.js` - The userscript to install
- `analyze-housing.ts` - Generates interactive HTML charts
- `generate-chart-image.ts` - Exports chart as PNG

## Data Source

Reddit post data from [Arctic Shift](https://github.com/ArthurHeitmann/arctic_shift) via Academic Torrents. The `reddit/subreddits24/UIUC_submissions.ndjson` file contains all r/UIUC posts through December 2024.

## Running Analysis

```bash
bun run analyze-housing.ts      # HTML charts
bun run generate-chart-image.ts # PNG export
```

## Housing Patterns

Patterns are defined in both the userscript and analysis scripts—keep them in sync if modifying:

- sublease/sublet/sublessee
- roommate
- lease takeover/relet
- Price patterns ($XXX/month)
- Bedroom patterns (1BR, 2B2B, etc.)
