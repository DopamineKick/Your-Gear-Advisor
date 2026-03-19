// scripts/diagnoseG4MPage.ts
// Diagnoza struktury DOM strony G4M — pomaga znaleźć właściwy selektor tabelki specs
// Uruchom: npx ts-node --esm scripts/diagnoseG4MPage.ts [URL]
// Przykład: npx ts-node --esm scripts/diagnoseG4MPage.ts "https://www.gear4music.pl/pl/Gitara-i-instrumenty-basowe/Gibson-Les-Paul-Junior/XXXXX"

import { chromium } from "playwright";

const URL = process.argv[2];
if (!URL) {
  console.error("Podaj URL jako argument!");
  console.error('npx ts-node --esm scripts/diagnoseG4MPage.ts "https://www.gear4music.pl/..."');
  process.exit(1);
}

async function run() {
  console.log("Otwieranie:", URL);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  });
  await page.setExtraHTTPHeaders({ "Accept-Language": "pl-PL,pl;q=0.9,en;q=0.1" });

  await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });

  // Screenshot PRZED scrollem
  await page.screenshot({ path: "g4m_diagnose_before.png", fullPage: false });
  console.log("Screenshot: g4m_diagnose_before.png");

  // Akceptuj cookie banner (różne selektory G4M używa)
  const cookieSelectors = [
    "#onetrust-accept-btn-handler",
    "button[id*='accept']",
    "button.cookie-accept",
    "[data-testid='accept-cookies']",
  ];
  for (const sel of cookieSelectors) {
    const clicked = await page.click(sel).then(() => true).catch(() => false);
    if (clicked) { console.log("Cookie banner dismissed:", sel); break; }
  }
  await new Promise(r => setTimeout(r, 1500));

  // Stopniowy scroll przez stronę (triggeruje IntersectionObserver)
  const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < scrollHeight; y += 300) {
    await page.mouse.wheel(0, 300);
    await new Promise(r => setTimeout(r, 200));
  }
  await new Promise(r => setTimeout(r, 2000));

  // Screenshot ŚRODEK strony (po scrollu 1/3 w dół)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.3));
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: "g4m_diagnose_middle.png", fullPage: false });
  console.log("Screenshot: g4m_diagnose_middle.png");

  // Spróbuj kliknąć zakładkę "Specyfikacja" / "Specifications"
  const tabClicked = await page.evaluate(() => {
    const allEls = Array.from(document.querySelectorAll("a, button, li, [role='tab']"));
    const specTab = allEls.find(el => {
      const t = el.textContent?.trim() ?? "";
      return t === "Specyfikacja" || t === "Specifications" || t === "Specs";
    });
    if (specTab) {
      (specTab as HTMLElement).click();
      return specTab.tagName + " | " + specTab.className;
    }
    return null;
  });
  console.log("\nKliknięcie zakładki Specyfikacja:", tabClicked ?? "nie znaleziono");
  if (tabClicked) {
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: "g4m_diagnose_spec_tab.png", fullPage: false });
    console.log("Screenshot: g4m_diagnose_spec_tab.png");
  }

  // Screenshot PO scrollu
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: "g4m_diagnose_after.png", fullPage: false });
  console.log("Screenshot: g4m_diagnose_after.png");

  // 1. Szukaj "Specyfikacja" w surowym HTML
  const rawHtmlSearch = await page.evaluate(() => {
    const html = document.body.innerHTML;
    const idx = html.indexOf("Specyfikacja");
    if (idx === -1) return "NIE ZNALEZIONO 'Specyfikacja' w HTML";
    return "ZNALEZIONO na pozycji " + idx + ":\n" + html.slice(Math.max(0, idx - 100), idx + 600);
  });
  console.log("\n===== SZUKANIE 'Specyfikacja' W HTML =====");
  console.log(rawHtmlSearch);

  // 2. Szukaj danych produktu w tagach <script>
  const scriptData = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll("script"));
    const results: string[] = [];
    for (const s of scripts) {
      const content = s.textContent ?? "";
      if (content.includes("Specyfikacja") || content.includes("specification") || content.includes("frets") || content.includes("fingerboard")) {
        results.push("TYPE=" + (s.type || "text/javascript") + " len=" + content.length + "\n" + content.slice(0, 500));
      }
    }
    return results.length ? results.join("\n\n---\n\n") : "Brak danych w <script> tagach";
  });
  console.log("\n===== DANE W <SCRIPT> TAGACH =====");
  console.log(scriptData.slice(0, 2000));

  // 3. Sprawdź window.__NEXT_DATA__ (Next.js SSR)
  const nextData = await page.evaluate(() => {
    const nd = (window as any).__NEXT_DATA__;
    if (!nd) return "Brak __NEXT_DATA__";
    const str = JSON.stringify(nd);
    const idx = str.indexOf("spec");
    return idx > -1 ? str.slice(Math.max(0, idx-50), idx+300) : "Brak 'spec' w __NEXT_DATA__, długość: " + str.length;
  });
  console.log("\n===== __NEXT_DATA__ =====");
  console.log(nextData);

  // 4. Surowy tekst strony po scrollowaniu
  const pageText = await page.evaluate(() => document.body.innerText?.slice(0, 4000));
  console.log("\n===== SUROWY TEKST STRONY PO SCROLL (4000 znaków) =====");
  console.log(pageText);

  const result = await page.evaluate(() => {
    // 1. Szukaj elementu zawierającego tekst "Specyfikacja" (nagłówek sekcji)
    const allElements = Array.from(document.querySelectorAll("*"));
    const specHeaders = allElements.filter(el => {
      const text = el.textContent?.trim() ?? "";
      return (text === "Specyfikacja" || text === "Specifications") && el.children.length === 0;
    });

    const headerInfo = specHeaders.map(el => ({
      tag: el.tagName,
      className: el.className,
      id: el.id,
      parentTag: el.parentElement?.tagName,
      parentClass: el.parentElement?.className,
      grandparentTag: el.parentElement?.parentElement?.tagName,
      grandparentClass: el.parentElement?.parentElement?.className,
    }));

    // 2. Szukaj elementów z "spec" w classname
    const specClassEls = allElements
      .filter(el => el.className && typeof el.className === "string" && /spec/i.test(el.className))
      .map(el => ({
        tag: el.tagName,
        className: el.className,
        id: el.id,
        childCount: el.children.length,
        textPreview: el.textContent?.trim().slice(0, 100),
      }))
      .slice(0, 20);

    // 3. Szukaj tabel i list definicji na stronie
    const tables = Array.from(document.querySelectorAll("table")).map(t => ({
      className: t.className,
      id: t.id,
      rowCount: t.rows.length,
      preview: t.textContent?.trim().slice(0, 150),
    }));

    const dls = Array.from(document.querySelectorAll("dl")).map(dl => ({
      className: dl.className,
      id: dl.id,
      itemCount: dl.querySelectorAll("dt").length,
      preview: dl.textContent?.trim().slice(0, 150),
    }));

    // 4. Szukaj sekcji po nagłówku "Specyfikacja" — sprawdź parent/siblings
    let specSectionInfo: any = null;
    if (specHeaders.length > 0) {
      const header = specHeaders[0];
      const parent = header.parentElement;
      const grandparent = header.parentElement?.parentElement;
      const nextSibling = parent?.nextElementSibling || header.nextElementSibling;

      specSectionInfo = {
        headerTag: header.tagName,
        headerClass: header.className,
        parentTag: parent?.tagName,
        parentClass: parent?.className,
        parentId: parent?.id,
        grandparentTag: grandparent?.tagName,
        grandparentClass: grandparent?.className,
        grandparentId: grandparent?.id,
        nextSiblingTag: nextSibling?.tagName,
        nextSiblingClass: nextSibling instanceof HTMLElement ? nextSibling.className : null,
        nextSiblingPreview: nextSibling?.textContent?.trim().slice(0, 300),
        // Tekst całego parent kontenera
        parentText: parent?.textContent?.trim().slice(0, 500),
        grandparentText: grandparent?.textContent?.trim().slice(0, 500),
      };
    }

    // 5. Wszystkie unikalne id i klasy w dolnej połowie strony (potencjalne spec sekcje)
    const bodyEls = Array.from(document.querySelectorAll("section, article, div[class*='product'], div[id*='spec'], div[id*='detail']"))
      .map(el => ({
        tag: el.tagName,
        id: el.id,
        className: typeof el.className === "string" ? el.className.slice(0, 80) : "",
        preview: el.textContent?.trim().slice(0, 80),
      }))
      .filter(el => el.className || el.id)
      .slice(0, 30);

    return {
      specHeaders: headerInfo,
      specClassElements: specClassEls,
      tables,
      definitionLists: dls,
      specSectionInfo,
      productSections: bodyEls,
    };
  });

  console.log("\n===== NAGŁÓWKI 'Specyfikacja' =====");
  console.log(JSON.stringify(result.specHeaders, null, 2));

  console.log("\n===== SEKCJA SPEC (context) =====");
  console.log(JSON.stringify(result.specSectionInfo, null, 2));

  console.log("\n===== ELEMENTY Z 'spec' W KLASIE =====");
  console.log(JSON.stringify(result.specClassElements, null, 2));

  console.log("\n===== TABELE NA STRONIE =====");
  console.log(JSON.stringify(result.tables, null, 2));

  console.log("\n===== LISTY DEFINICJI (dl) =====");
  console.log(JSON.stringify(result.definitionLists, null, 2));

  console.log("\n===== SEKCJE PRODUKTOWE (section/article/div[product/spec/detail]) =====");
  console.log(JSON.stringify(result.productSections, null, 2));

  // 6. Dump sekcji HTML wokół dolnej części strony (szukamy specs)
  const htmlDump = await page.evaluate(() => {
    const html = document.body.innerHTML;
    // Szukaj Specifications/Specyfikacja + inne kluczowe słowa
    const keywords = ["Specyfikacja", "Specifications", "fretboard", "fingerboard", "rosewood", "mahogany", "humbucker", "single coil"];
    const found: {keyword: string, context: string}[] = [];
    for (const kw of keywords) {
      const idx = html.toLowerCase().indexOf(kw.toLowerCase());
      if (idx > -1) {
        found.push({ keyword: kw, context: html.slice(Math.max(0, idx-80), idx+400) });
        break; // tylko pierwsze znalezisko
      }
    }
    if (found.length === 0) {
      // Zwróć ostatnie 3000 znaków innerHTML jako ostatnią deskę ratunku
      return "Żadne słowo kluczowe nie znalezione.\nOstatnie 3000 znaków HTML:\n" + html.slice(-3000);
    }
    return JSON.stringify(found, null, 2);
  });
  console.log("\n===== DUMP HTML (słowa kluczowe / koniec body) =====");
  console.log(htmlDump.slice(0, 3000));

  await browser.close();
}

run().catch(err => { console.error("BŁĄD:", err); process.exit(1); });
