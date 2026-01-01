import { readFileSync, writeFileSync } from "fs";

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

// Read and process the ndjson file line by line
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

// Sort by month
const sortedMonths = Array.from(monthlyData.keys()).sort();
const labels = sortedMonths;
const totalPosts = sortedMonths.map((m) => monthlyData.get(m)!.total);
const housingPosts = sortedMonths.map((m) => monthlyData.get(m)!.housing);
const housingPercentage = sortedMonths.map(
  (m) => (monthlyData.get(m)!.housing / monthlyData.get(m)!.total) * 100
);

console.log(`\nMonths with data: ${sortedMonths.length}`);
console.log(`Date range: ${sortedMonths[0]} to ${sortedMonths[sortedMonths.length - 1]}`);

// Generate HTML with Chart.js
const html = `<!DOCTYPE html>
<html>
<head>
  <title>UIUC Reddit Housing Posts Analysis</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #333; }
    .chart-container { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    canvas { max-height: 400px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>UIUC Reddit Housing Posts Analysis</h1>
    <p>Data from ${sortedMonths[0]} to ${sortedMonths[sortedMonths.length - 1]} (${lines.length.toLocaleString()} total posts)</p>

    <div class="chart-container">
      <h2>Housing Posts Percentage by Month</h2>
      <canvas id="percentageChart"></canvas>
    </div>

    <div class="chart-container">
      <h2>Post Counts by Month</h2>
      <canvas id="countsChart"></canvas>
    </div>
  </div>

  <script>
    const labels = ${JSON.stringify(labels)};
    const totalPosts = ${JSON.stringify(totalPosts)};
    const housingPosts = ${JSON.stringify(housingPosts)};
    const housingPercentage = ${JSON.stringify(housingPercentage)};

    // Percentage chart
    new Chart(document.getElementById('percentageChart'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Housing Posts %',
          data: housingPercentage,
          borderColor: '#e74c3c',
          backgroundColor: 'rgba(231, 76, 60, 0.1)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' }
        },
        scales: {
          x: {
            ticks: {
              maxTicksLimit: 20,
              maxRotation: 45
            }
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Percentage (%)' }
          }
        }
      }
    });

    // Counts chart
    new Chart(document.getElementById('countsChart'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Total Posts',
            data: totalPosts,
            backgroundColor: 'rgba(52, 152, 219, 0.7)',
            order: 2
          },
          {
            label: 'Housing Posts',
            data: housingPosts,
            backgroundColor: 'rgba(231, 76, 60, 0.9)',
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' }
        },
        scales: {
          x: {
            stacked: false,
            ticks: {
              maxTicksLimit: 20,
              maxRotation: 45
            }
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Number of Posts' }
          }
        }
      }
    });
  </script>
</body>
</html>`;

writeFileSync("housing-analysis.html", html);
console.log("\nGenerated housing-analysis.html");
