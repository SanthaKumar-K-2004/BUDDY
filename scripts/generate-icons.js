const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <!-- Glowing Shield Crest -->
  <path
    d="M 128 14 C 182 34, 232 38, 232 114 C 232 186, 172 226, 128 244 C 84 226, 24 186, 24 114 C 24 38, 74 34, 128 14 Z"
    fill="#090d16"
    stroke="#10b981"
    stroke-width="10"
  />
  <path
    d="M 128 24 C 174 42, 218 46, 218 114 C 218 178, 166 214, 128 230 C 90 214, 38 178, 38 114 C 38 46, 82 42, 128 24 Z"
    fill="#0f172a"
    stroke="#38bdf8"
    stroke-width="4"
  />

  <!-- Corgi Left Ear -->
  <path
    d="M 82 78 C 50 16, 28 26, 56 94 Z"
    fill="#f97316"
    stroke="#ea580c"
    stroke-width="4"
  />
  <path
    d="M 76 74 C 54 32, 38 40, 58 86 Z"
    fill="#fca5a5"
  />

  <!-- Corgi Right Ear -->
  <path
    d="M 174 78 C 206 16, 228 26, 200 94 Z"
    fill="#f97316"
    stroke="#ea580c"
    stroke-width="4"
  />
  <path
    d="M 180 74 C 202 32, 218 40, 198 86 Z"
    fill="#fca5a5"
  />

  <!-- Main Orange Corgi Head -->
  <ellipse
    cx="128"
    cy="126"
    rx="72"
    ry="62"
    fill="#f97316"
    stroke="#ea580c"
    stroke-width="4"
  />

  <!-- Snowy White Muzzle & Face Blaze -->
  <path
    d="M 116 76 C 116 94, 98 108, 78 120 C 62 132, 66 162, 92 166 C 108 170, 120 166, 128 162 C 136 166, 148 170, 164 166 C 190 162, 194 132, 178 120 C 158 108, 140 94, 140 76 Z"
    fill="#ffffff"
    stroke="#cbd5e1"
    stroke-width="2"
  />

  <!-- Soft Blushing Cheeks -->
  <circle cx="80" cy="140" r="10" fill="#f43f5e" opacity="0.45" />
  <circle cx="176" cy="140" r="10" fill="#f43f5e" opacity="0.45" />

  <!-- Left Hazel Eye -->
  <ellipse cx="98" cy="118" rx="14" ry="15" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5" />
  <circle cx="98" cy="118" r="11" fill="#78350f" />
  <circle cx="98" cy="118" r="7" fill="#000000" />
  <circle cx="94" cy="113" r="4" fill="#ffffff" />
  <circle cx="102" cy="122" r="2" fill="#ffffff" opacity="0.8" />

  <!-- Right Hazel Eye -->
  <ellipse cx="158" cy="118" rx="14" ry="15" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5" />
  <circle cx="158" cy="118" r="11" fill="#78350f" />
  <circle cx="158" cy="118" r="7" fill="#000000" />
  <circle cx="154" cy="113" r="4" fill="#ffffff" />
  <circle cx="162" cy="122" r="2" fill="#ffffff" opacity="0.8" />

  <!-- Cute Corgi Button Nose -->
  <path
    d="M 120 138 Q 128 134 136 138 Q 136 146 128 150 Q 120 146 120 138 Z"
    fill="#0f172a"
  />
  <ellipse cx="126" cy="138" rx="2.5" ry="1.2" fill="#94a3b8" />

  <!-- Sweet Smile with Pink Tongue -->
  <path
    d="M 116 151 Q 122 155 128 151 Q 134 155 140 151"
    fill="none"
    stroke="#0f172a"
    stroke-width="3.5"
    stroke-linecap="round"
  />
  <path
    d="M 122 153 Q 128 170 134 153 Z"
    fill="#f43f5e"
    stroke="#0f172a"
    stroke-width="2"
  />

  <!-- Emerald Guardian Collar with Heart Charm -->
  <path
    d="M 94 174 Q 128 185 162 174"
    fill="none"
    stroke="#10b981"
    stroke-width="8"
    stroke-linecap="round"
  />
  <!-- Heart Shield Pendant -->
  <path
    d="M 128 188 C 128 188, 120 178, 115 178 C 110 178, 108 182, 108 186 C 108 193, 116 200, 128 208 C 140 200, 148 193, 148 186 C 148 182, 146 178, 141 178 C 136 178, 128 188, 128 188 Z"
    fill="#34d399"
    stroke="#ffffff"
    stroke-width="2"
  />
</svg>
`;

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            margin: 0;
            padding: 0;
            background: transparent;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 256px;
            height: 256px;
          }
        </style>
      </head>
      <body>
        ${svgContent}
      </body>
    </html>
  `;

  await page.setContent(html);

  const sizes = [16, 32, 48, 128, 256];
  const targetDirs = [
    path.join(__dirname, '../apps/buddy-dashboard/public/icons'),
    path.join(__dirname, '../release/BUDDY-Chrome-Extension/icons'),
  ];

  for (const size of sizes) {
    await page.setViewportSize({ width: size, height: size });
    await page.evaluate((s) => {
      document.body.style.width = s + 'px';
      document.body.style.height = s + 'px';
      const svg = document.querySelector('svg');
      if (svg) {
        svg.setAttribute('width', s.toString());
        svg.setAttribute('height', s.toString());
      }
    }, size);

    const buf = await page.screenshot({ omitBackground: true, type: 'png' });

    for (const dir of targetDirs) {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `icon-${size}.png`), buf);
    }
    console.log(`Rendered icon-${size}.png (${buf.length} bytes)`);
  }

  await browser.close();
  console.log('All icons generated successfully!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
