// continueFilterGuitars.js
// Kontynuuje filtrowanie od miejsca gdzie skończył filterThomannGuitars.js
// Dopisuje kolejne N gitarowych URL-i do guitar_products.csv

const fs = require("fs");
const fetch = require("node-fetch");
const cheerio = require("cheerio");
const csv = require("csv-parser");
const { format } = require("fast-csv");

const INPUT_CSV = "products.csv";
const OUTPUT_CSV = "guitar_products.csv";
const TARGET_NEW = 20;        // ile nowych gitarowych URL-i dodać
const DELAY_MS = 300;         // przerwa między requestami (ms)

const GUITAR_BREADCRUMB_KEYWORDS = [
  "Gitarren und Bässe",
  "Gitary i Basy",
  "Guitars and Basses",
  "Gitarren & Bässe",
  "Guitars & Basses",
];

function breadcrumbMatchesGuitar(items) {
  if (!items || !items.length) return false;
  const joined = items.join(" ").toLowerCase();
  return GUITAR_BREADCRUMB_KEYWORDS.some((kw) =>
    joined.includes(kw.toLowerCase())
  );
}

function extractBreadcrumbFromHtml($) {
  const items = [];
  $('li[itemprop="itemListElement"] span[itemprop="name"]').each((_, el) => {
    const txt = $(el).text().trim();
    if (txt) items.push(txt);
  });
  if (items.length) return items;

  const altItems = [];
  $("nav, ol, ul")
    .find('span[itemprop="name"]')
    .each((_, el) => {
      const txt = $(el).text().trim();
      if (txt) altItems.push(txt);
    });
  return altItems.length ? altItems : null;
}

async function isGuitarProduct(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      timeout: 20000,
    });

    if (!res.ok) {
      console.error(`  [HTTP ${res.status}] ${url}`);
      return false;
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const breadcrumbItems = extractBreadcrumbFromHtml($);

    if (!breadcrumbItems || !breadcrumbItems.length) {
      console.log("  ❌ Brak breadcrumb → pomijam");
      return false;
    }

    const isGuitar = breadcrumbMatchesGuitar(breadcrumbItems);
    if (isGuitar) {
      console.log("  ✅ GITAROWY:", breadcrumbItems.join(" > "));
    } else {
      console.log("  ❌ NIE gitarowy:", breadcrumbItems.join(" > "));
    }
    return isGuitar;
  } catch (err) {
    console.error(`  [ERROR] ${err.message}`);
    return false;
  }
}

function readCsv(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    if (!fs.existsSync(filePath)) return resolve(rows);
    fs.createReadStream(filePath)
      .pipe(csv({ headers: ["url"] }))
      .on("data", (row) => { if (row.url && row.url.trim()) rows.push(row.url.trim()); })
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

async function run() {
  // 1. Wczytaj istniejące gitarowe URL-e
  const existingGuitarUrls = new Set(await readCsv(OUTPUT_CSV));
  console.log(`Istniejące gitarowe URL-e: ${existingGuitarUrls.size}`);

  // 2. Wczytaj wszystkie URL-e z products.csv
  const allUrls = await readCsv(INPUT_CSV);
  console.log(`Wszystkie URL-e w products.csv: ${allUrls.length}`);

  // 3. Znajdź punkt wznowienia: ostatni gitarowy URL w kolejności products.csv
  let resumeIndex = 0;
  for (let i = allUrls.length - 1; i >= 0; i--) {
    if (existingGuitarUrls.has(allUrls[i])) {
      resumeIndex = i + 1;
      break;
    }
  }
  console.log(`Wznawiam od indeksu ${resumeIndex} (linia ~${resumeIndex + 2} w products.csv)\n`);

  // 4. Otwórz OUTPUT_CSV w trybie append
  const outputStream = fs.createWriteStream(OUTPUT_CSV, { flags: "a" });
  const csvWriter = format({ headers: false }); // bez nagłówka — dopisujemy
  csvWriter.pipe(outputStream);

  let checked = 0;
  let matched = 0;

  for (let i = resumeIndex; i < allUrls.length; i++) {
    if (matched >= TARGET_NEW) break;

    const url = allUrls[i];
    if (existingGuitarUrls.has(url)) continue; // pomiń już znane

    checked++;
    console.log(`[+${matched}/${TARGET_NEW} | scan ${checked}] ${url}`);

    const isGuitar = await isGuitarProduct(url);
    if (isGuitar) {
      matched++;
      csvWriter.write([url]);
    }

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  csvWriter.end();

  console.log("\n===================================");
  console.log(`PRZESKANOWANO:  ${checked}`);
  console.log(`NOWE GITAROWE:  ${matched}`);
  console.log(`ŁĄCZNIE W CSV:  ${existingGuitarUrls.size + matched}`);
  console.log(`Zapisano do:    ${OUTPUT_CSV}`);
  console.log("===================================");
}

run().catch((err) => {
  console.error("Błąd krytyczny:", err);
  process.exit(1);
});
