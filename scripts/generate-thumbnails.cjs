const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Read products from the JSON file
const products = JSON.parse(fs.readFileSync('products-meta.json', 'utf-8'));

const OUTPUT_DIR = './thumbnails';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function generateThumbnails() {
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630 });

  const productIds = Object.keys(products);
  console.log(`\nGenerating thumbnails for ${productIds.length} products...\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < productIds.length; i++) {
    const id = productIds[i];
    const product = products[id];
    const outputPath = path.join(OUTPUT_DIR, `${id}.png`);

    // Skip if already exists
    if (fs.existsSync(outputPath)) {
      console.log(`[${i + 1}/${productIds.length}] Skipping ${id} (exists)`);
      success++;
      continue;
    }

    console.log(`[${i + 1}/${productIds.length}] ${id}`);

    try {
      await page.goto(product.url, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      // Wait for page to settle
      await sleep(3000);

      await page.screenshot({
        path: outputPath,
        type: 'png'
      });

      console.log(`  ✓ Saved`);
      success++;
    } catch (error) {
      console.log(`  ✗ Error: ${error.message}`);
      failed++;
    }

    // Delay between requests
    await sleep(500);
  }

  await browser.close();
  console.log(`\nDone! Success: ${success}, Failed: ${failed}`);
  console.log(`Thumbnails saved to: ${OUTPUT_DIR}/`);
}

generateThumbnails().catch(console.error);
