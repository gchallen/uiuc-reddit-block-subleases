import { readFileSync, writeFileSync } from "fs";
import puppeteer from "puppeteer";

const HOUSING_PATTERNS = [
  /subleas/i,
  /sublet/i,
  /sublessee/i,
  /roommate/i,
  /room\s*mate/i,
  /lease\s*(takeover|take\s*over)/i,
  /(takeover|take\s*over)\s*lease/i,
  /relet/i,
  /\$\d+\s*\/\s*(mo|month|m)\b/i,
  /\$\d+\s*(per|a)\s*month/i,
  /\dB\dB/i,
  /\dBR\b/i,
  /\d\s*bed(room)?s?\b/i,
  /\dbd\b/i,
];

function isHousingPost(title: string): boolean {
  return HOUSING_PATTERNS.some((pattern) => pattern.test(title));
}

interface MonthData {
  total: number;
  housing: number;
}

const monthlyData: Map<string, MonthData> = new Map();

const content = readFileSync(
  "reddit/subreddits24/UIUC_submissions.ndjson",
  "utf-8"
);
const lines = content.split("\n").filter((line) => line.trim());

console.log(`Processing ${lines.length} posts...`);

for (const line of lines) {
  try {
    const post = JSON.parse(line);
    const timestamp = post.created_utc;
    const title = post.title || "";

    const date = new Date(timestamp * 1000);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, { total: 0, housing: 0 });
    }

    const data = monthlyData.get(monthKey)!;
    data.total++;
    if (isHousingPost(title)) {
      data.housing++;
    }
  } catch (e) {
    // Skip malformed lines
  }
}

const sortedMonths = Array.from(monthlyData.keys()).sort();
const labels = sortedMonths;
const housingPercentage = sortedMonths.map(
  (m) => (monthlyData.get(m)!.housing / monthlyData.get(m)!.total) * 100
);

// Calculate overall average
const totalHousing = sortedMonths.reduce((sum, m) => sum + monthlyData.get(m)!.housing, 0);
const totalPosts = sortedMonths.reduce((sum, m) => sum + monthlyData.get(m)!.total, 0);
const overallAvg = (totalHousing / totalPosts) * 100;

const html = `<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body {
      margin: 0;
      padding: 20px;
      background: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .container {
      width: 1000px;
      background: white;
    }
    h2 {
      margin: 0 0 5px 0;
      color: #333;
      font-size: 24px;
    }
    .subtitle {
      color: #666;
      font-size: 14px;
      margin-bottom: 15px;
    }
    canvas {
      width: 100% !important;
      height: 400px !important;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Housing Posts on r/UIUC Over Time</h2>
    <div class="subtitle">
      Percentage of posts matching housing patterns (sublease, roommate, etc.) • ${totalPosts.toLocaleString()} posts analyzed • ${sortedMonths[0]} to ${sortedMonths[sortedMonths.length - 1]}
    </div>
    <canvas id="chart"></canvas>
  </div>

  <script>
    const labels = ${JSON.stringify(labels)};
    const housingPercentage = ${JSON.stringify(housingPercentage)};
    const overallAvg = ${overallAvg};

    new Chart(document.getElementById('chart'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Housing Posts %',
            data: housingPercentage,
            borderColor: '#FF4500',
            backgroundColor: 'rgba(255, 69, 0, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 0
          },
          {
            label: 'Overall Average (${overallAvg.toFixed(1)}%)',
            data: labels.map(() => overallAvg),
            borderColor: '#666',
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { usePointStyle: true }
          }
        },
        scales: {
          x: {
            ticks: {
              maxTicksLimit: 15,
              maxRotation: 45
            },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            max: 25,
            title: { display: true, text: 'Percentage of Posts (%)' },
            grid: { color: '#eee' }
          }
        }
      }
    });

    window.chartReady = true;
  </script>
</body>
</html>`;

writeFileSync("chart-only.html", html);
console.log("Generated chart-only.html");

// Use puppeteer to screenshot
console.log("Launching browser...");
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setViewport({ width: 1040, height: 520 });
await page.goto(`file://${process.cwd()}/chart-only.html`, { waitUntil: "networkidle0" });

// Wait for chart to render
await page.waitForFunction("window.chartReady === true");
await new Promise((r) => setTimeout(r, 500)); // Extra time for animation

await page.screenshot({
  path: "housing-posts-chart.png",
  clip: { x: 0, y: 0, width: 1040, height: 500 }
});

console.log("Saved housing-posts-chart.png");
await browser.close();
