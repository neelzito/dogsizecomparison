/*
 * German language helpers for the generator (tools/site/de/build.js):
 * breed-name grammar, number formatting, size classes, groups, countries,
 * URLs and the German page layout. German pages show metric units only.
 */
const L = require("../lib");
const { esc, round, BREEDS, BY_ID, GROUPS, SIZES, COUNTRIES, WILD } = L;
// breed names, plus wolves and wild canids from content/wild.json
const NAMES = { ...require("./names"), ...Object.fromEntries(WILD.map((w) => [w.id, w.info.de])) };

for (const b of BREEDS) if (!NAMES[b.id]) throw new Error(`tools/site/de/names.js: no German name for ${b.id}`);

// ---------- slugs ----------
const deSlug = (s) => L.slug(s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss"));

// ---------- breed names ----------
// endings for a "~"-marked adjective: [no article / ein (nom), der (nom), den/die/das (acc after def.), dat]
const ENDINGS = {
  bare: { m: "er", f: "e", n: "es" },
  defNom: { m: "e", f: "e", n: "e" },
  defAcc: { m: "en", f: "e", n: "e" },
  dat: { m: "en", f: "en", n: "en" },
  indefAcc: { m: "en", f: "e", n: "es" },
};
const ARTICLE = {
  der: { m: "der", f: "die", n: "das" }, den: { m: "den", f: "die", n: "das" }, dem: { m: "dem", f: "der", n: "dem" },
  ein: { m: "ein", f: "eine", n: "ein" }, einen: { m: "einen", f: "eine", n: "ein" }, einem: { m: "einem", f: "einer", n: "einem" },
};
const raw = (b) => NAMES[b.id || b][0];
const gender = (b) => NAMES[b.id || b][1];
// optional third entry: oblique form of a weak noun ("Kojote" → "dem Kojoten")
const inflect = (b, table) => (NAMES[b.id || b][2] && ["defAcc", "dat", "indefAcc"].includes(table) ? NAMES[b.id || b][2] : raw(b).replace(/~/g, ENDINGS[table][gender(b)]));
/** Name as a heading or list entry: "Deutscher Schäferhund". */
const n = (b) => inflect(b, "bare");
const withArt = (b, art, table) => `${ARTICLE[art][gender(b)]} ${inflect(b, table)}`;
const name = {
  der: (b) => withArt(b, "der", "defNom"),
  den: (b) => withArt(b, "den", "defAcc"),
  dem: (b) => withArt(b, "dem", "dat"),
  ein: (b) => withArt(b, "ein", "bare"),
  einen: (b) => withArt(b, "einen", "indefAcc"),
  einem: (b) => withArt(b, "einem", "dat"),
  /** weak form after a determiner already written: "Der Deutsche Schäferhund" → "Deutsche Schäferhund" */
  weak: (b) => inflect(b, "defNom"),
  weakDat: (b) => inflect(b, "dat"),
};
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const pron = (b) => ({ m: "er", f: "sie", n: "es" }[gender(b)]);
const pronAcc = (b) => ({ m: "ihn", f: "sie", n: "es" }[gender(b)]);
const poss = (b) => ({ m: "sein", f: "ihr", n: "sein" }[gender(b)]);
/** "ein durchschnittlicher Rüde": breeds whose standard gives one range use "ein durchschnittlicher Hund" */
const listDe = (xs, and = "und") => (xs.length < 2 ? xs.join("") : xs.slice(0, -1).join(", ") + ` ${and} ` + xs[xs.length - 1]);

// ---------- numbers ----------
const num = (v) => String(v).replace(".", ",");
const cm = (v) => num(L.cm(v));
const kg = (v) => num(L.kg(v));
const range = (r, f, unit) => (f(r[0]) === f(r[1]) ? `${f(r[0])} ${unit}` : `${f(r[0])}–${f(r[1])} ${unit}`);
const H = (r) => range(r, cm, "cm");
const W = (r) => range(r, kg, "kg");
const H1 = (v) => `${cm(v)} cm`;
const W1 = (v) => `${kg(v)} kg`;
const life = (r) => (r[0] === r[1] ? `${r[0]} Jahre` : `${r[0]}–${r[1]} Jahre`);
/** dative, after "bei", "mit", "gegenüber": "10–12 Jahren" */
const lifeDat = (r) => life(r) + "n";
const pct = (v) => `${Math.round(v * 100)} %`;
const times = (v) => `${num(v)}-mal`;

// ---------- size classes ----------
const SIZE_DE = {
  Toy: { gen: "der Zwerghunderassen", dat: "Zwerghunderassen", short: "Zwerg", adj: "sehr kleine", list: "Zwerghunderassen", slug: "zwerghunde", limit: "unter 5 kg", blurb: "Zwerghunde und Schoßhunde" },
  Small: { gen: "kleiner Rassen", dat: "kleinen Rassen", short: "Klein", adj: "kleine", list: "Kleine Hunderassen", slug: "kleine-hunde", limit: "5–10 kg", blurb: "kleine, aber robuste Hunde" },
  Medium: { gen: "mittelgroßer Rassen", dat: "mittelgroßen Rassen", short: "Mittel", adj: "mittelgroße", list: "Mittelgroße Hunderassen", slug: "mittelgrosse-hunde", limit: "10–25 kg", blurb: "mittelgroße Allrounder" },
  Large: { gen: "großer Rassen", dat: "großen Rassen", short: "Groß", adj: "große", list: "Große Hunderassen", slug: "grosse-hunde", limit: "25–45 kg", blurb: "große Arbeits- und Jagdhunde" },
  Giant: { gen: "sehr großer Rassen", dat: "sehr großen Rassen", short: "Riesig", adj: "sehr große", list: "Sehr große Hunderassen", slug: "sehr-grosse-hunde", limit: "45 kg und mehr", blurb: "die schwersten Rassen" },
};
const sizeUrl = (s) => `/de/groessen/${SIZE_DE[s].slug}/`;

// ---------- groups (AKC groups, German names) ----------
const GROUP_DE = {
  Herding: { name: "Hütehunde", dat: "den Hütehunden", slug: "huetehunde", one: "Hütehund",
    text: "Hütehunde wurden gezüchtet, um Vieh zusammenzutreiben, zu lenken und zu bewachen. Sie sind wendig, lernen schnell und haben oft sehr viel Energie. Die Gruppe reicht von kompakten Corgis und Heelern bis zu großen Schäferhunden." },
  Hound: { name: "Lauf- und Windhunde", dat: "den Lauf- und Windhunden", slug: "lauf-und-windhunde", one: "Lauf- oder Windhund",
    text: "Gezüchtet für die Jagd mit der Nase oder mit den Augen. Laufhunde wie Beagle und Bloodhound folgen einer Fährte; Windhunde wie Greyhound und Irischer Wolfshund jagen auf Sicht und sind auf Tempo gebaut." },
  "Non-Sporting": { name: "Gesellschaftshunde", dat: "den Gesellschaftshunden", slug: "gesellschaftshunde", one: "Gesellschaftshund",
    text: "Eine gemischte Gruppe von Rassen, die ihre ursprüngliche Aufgabe nicht mehr haben, vom Dalmatiner und Pudel bis zur Englischen Bulldogge und zum Chow-Chow. Die Größen schwanken hier stärker als in jeder anderen Gruppe." },
  Sporting: { name: "Jagdhunde", dat: "den Jagdhunden", slug: "jagdhunde", one: "Jagdhund",
    text: "Gezüchtet, um mit dem Jäger Wild zu finden und zu apportieren: Retriever, Spaniels, Vorstehhunde und Setter. Die meisten sind mittelgroß bis groß, sportlich und freundlich." },
  Terrier: { name: "Terrier", dat: "den Terriern", slug: "terrier", one: "Terrier",
    text: "Gezüchtet, um Ratten und Mäuse zu jagen und Fuchs und Dachs im Bau zu stellen. Die meisten Terrier sind klein und kurzbeinig, zur Gruppe gehören aber auch der Airedale Terrier und der Bullterrier." },
  Toy: { name: "Schoßhunde", dat: "den Schoßhunden", slug: "schosshunde", one: "Schoßhund",
    text: "Als Begleiter gezüchtet, sind Schoßhunde die kleinsten Hunde: Die meisten wiegen unter 5 kg. Viele passen in eine Transporttasche für die Flugzeugkabine." },
  Working: { name: "Arbeitshunde", dat: "den Arbeitshunden", slug: "arbeitshunde", one: "Arbeitshund",
    text: "Gezüchtet, um Haus und Hof zu bewachen, Schlitten und Karren zu ziehen und Menschen zu retten. Hierzu gehören die meisten der größten und schwersten Rassen, vom Siberian Husky bis zum Mastiff." },
  "Designer / Mixed": { name: "Designer- und Mischlingsrassen", dat: "den Designer- und Mischlingsrassen", slug: "designer-mischlinge", one: "Designerhund",
    text: "Beliebte Kreuzungen, meist zwischen dem Pudel und einer anderen Rasse. Sie haben keinen Rassestandard, die Größen hier sind daher typische Bereiche. Wie groß ein Hund wird, hängt stark davon ab, welcher Pudel (Toy-, Klein- oder Großpudel) eingekreuzt wurde." },
};
for (const g of GROUPS) if (!GROUP_DE[g]) throw new Error(`tools/site/de/lang.js: no German group for ${g}`);
const groupUrl = (g) => `/de/gruppen/${GROUP_DE[g].slug}/`;
const groupName = (g) => GROUP_DE[g].name;
const GROUP_NOTE = "Die Gruppen folgen der Einteilung des American Kennel Club (AKC). Die FCI, der europäische Dachverband, teilt Rassen in zehn andere Gruppen ein.";

// ---------- countries ----------
// name: nominative; aus: phrase after "aus"; adj: for "<adj> Hunderassen"
const COUNTRY_DE = {
  Afghanistan: { name: "Afghanistan", aus: "Afghanistan" },
  Argentina: { name: "Argentinien", aus: "Argentinien" },
  Australia: { name: "Australien", aus: "Australien", adj: "Australische" },
  Belgium: { name: "Belgien", aus: "Belgien", adj: "Belgische" },
  Canada: { name: "Kanada", aus: "Kanada", adj: "Kanadische" },
  Caucasus: { name: "Kaukasus", aus: "dem Kaukasus" },
  "Central Africa": { name: "Zentralafrika", aus: "Zentralafrika" },
  "Central Asia": { name: "Zentralasien", aus: "Zentralasien" },
  China: { name: "China", aus: "China", adj: "Chinesische" },
  Croatia: { name: "Kroatien", aus: "Kroatien" },
  Cuba: { name: "Kuba", aus: "Kuba" },
  "Czech Republic": { name: "Tschechien", aus: "Tschechien" },
  Czechoslovakia: { name: "Tschechoslowakei", aus: "der Tschechoslowakei" },
  Denmark: { name: "Dänemark", aus: "Dänemark" },
  England: { name: "England", aus: "England", adj: "Englische" },
  Finland: { name: "Finnland", aus: "Finnland" },
  France: { name: "Frankreich", aus: "Frankreich", adj: "Französische" },
  Germany: { name: "Deutschland", aus: "Deutschland", adj: "Deutsche" },
  Hungary: { name: "Ungarn", aus: "Ungarn", adj: "Ungarische" },
  Iceland: { name: "Island", aus: "Island" },
  Ireland: { name: "Irland", aus: "Irland", adj: "Irische" },
  Israel: { name: "Israel", aus: "Israel" },
  Italy: { name: "Italien", aus: "Italien", adj: "Italienische" },
  Japan: { name: "Japan", aus: "Japan", adj: "Japanische" },
  Madagascar: { name: "Madagaskar", aus: "Madagaskar" },
  Malta: { name: "Malta", aus: "Malta" },
  Mediterranean: { name: "Mittelmeerraum", aus: "dem Mittelmeerraum" },
  Mexico: { name: "Mexiko", aus: "Mexiko" },
  "Middle East": { name: "Naher Osten", aus: "dem Nahen Osten" },
  Netherlands: { name: "Niederlande", aus: "den Niederlanden", adj: "Niederländische" },
  "North Africa": { name: "Nordafrika", aus: "Nordafrika" },
  Norway: { name: "Norwegen", aus: "Norwegen", adj: "Norwegische" },
  Poland: { name: "Polen", aus: "Polen" },
  Portugal: { name: "Portugal", aus: "Portugal", adj: "Portugiesische" },
  Russia: { name: "Russland", aus: "Russland", adj: "Russische" },
  Scotland: { name: "Schottland", aus: "Schottland", adj: "Schottische" },
  "South Africa": { name: "Südafrika", aus: "Südafrika" },
  "South Korea": { name: "Südkorea", aus: "Südkorea" },
  "Southern Africa": { name: "südliches Afrika", aus: "dem südlichen Afrika" },
  Spain: { name: "Spanien", aus: "Spanien", adj: "Spanische" },
  Sweden: { name: "Schweden", aus: "Schweden" },
  Switzerland: { name: "Schweiz", aus: "der Schweiz", adj: "Schweizer" },
  Thailand: { name: "Thailand", aus: "Thailand" },
  Turkey: { name: "Türkei", aus: "der Türkei" },
  "United States": { name: "USA", aus: "den USA", adj: "Amerikanische" },
  Wales: { name: "Wales", aus: "Wales", adj: "Walisische" },
  "West Africa": { name: "Westafrika", aus: "Westafrika" },
  UK: { name: "Großbritannien", aus: "Großbritannien" },
};
const REGION_DE = { Tibet: "Tibet", Sicily: "Sizilien", Siberia: "Sibirien", Shetland: "Shetland", "Canary Islands": "Kanaren", Ibiza: "Ibiza", Galicia: "Galicien", Alaska: "Alaska" };
const country = (c) => { const x = COUNTRY_DE[c]; if (!x) throw new Error(`tools/site/de/lang.js: no German country for "${c}"`); return x; };
for (const b of BREEDS) for (const part of b.origin.replace(/\s*\(.*\)/, "").split("/")) country(part.trim());
const regionOf = (o) => { const m = o.match(/\((.+)\)/); return m ? REGION_DE[m[1]] || m[1] : ""; };
/** "Deutschland/Polen", "China (Tibet)" */
const originName = (o) => o.replace(/\s*\(.*\)/, "").split("/").map((p) => country(p.trim()).name).join("/") + (regionOf(o) ? ` (${regionOf(o)})` : "");
/** "aus Deutschland und Polen", "aus der Schweiz", "aus China (Tibet)" */
const ausOrigin = (o) => "aus " + listDe(o.replace(/\s*\(.*\)/, "").split("/").map((p) => country(p.trim()).aus)) + (regionOf(o) ? ` (${regionOf(o)})` : "");
const countryUrl = (c) => (COUNTRIES.includes(c) ? `/de/herkunft/${deSlug(country(c).name)}/` : null);
const countryAdjList = (c) => (country(c).adj ? `${country(c).adj} Hunderassen` : `Hunderassen aus ${country(c).aus}`);

// ---------- traits ----------
const TRAIT_DE = {
  energy: { label: "Energie", vals: ["Niedrig", "Mittel", "Hoch"] },
  shed: { label: "Haaren", vals: ["Wenig", "Mittel", "Stark"] },
  groom: { label: "Fellpflege", vals: ["Wenig", "Mittel", "Viel"] },
  kids: { label: "Mit Kindern", vals: ["Mit Vorsicht", "Gut", "Sehr gut"] },
  novice: { label: "Für Anfänger", vals: ["Eher für Erfahrene", "Geht", "Sehr gut"] },
  apt: { label: "Wohnung", vals: ["Braucht Platz", "Möglich", "Gut"] },
};

// ---------- URLs ----------
const BREED_SLUG = {};
{
  const seen = {};
  for (const b of BREEDS) {
    const s = deSlug(n(b));
    if (seen[s]) throw new Error(`German breed slug "${s}" used by ${seen[s]} and ${b.id}`);
    seen[s] = b.id; BREED_SLUG[b.id] = s;
  }
}
const WILD_SLUG = {};
for (const w of WILD) WILD_SLUG[w.id] = deSlug(n(w));
/** German page of a breed, or of a wolf / wild canid. */
const breedUrl = (b) => (b.wild ? `/de/woelfe/${WILD_SLUG[b.id]}/` : `/de/rassen/${BREED_SLUG[b.id]}/`);
const toolLink = (entries) => `/de/#b=${entries.map(([id, sex]) => `${id}:${sex || "m"}`).join(",")}`;

// ---------- layout ----------
const SITE_NAME_DE = "Hundegrößen-Vergleich";
const NAV = [
  ["/de/rassen/", "Rassen"],
  ["/de/rassefinder/", "Rassefinder"],
  ["/de/vergleich/", "Vergleiche"],
  ["/de/rechner/", "Rechner"],
  ["/de/ratgeber/", "Ratgeber"],
  ["/de/poster/", "Poster"],
];
const BRAND_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 10a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm4-3.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm7 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm4 3.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4ZM12 11c2.6 0 6 3.6 6 6.4 0 2-1.5 2.9-3 2.9-1.2 0-1.9-.6-3-.6s-1.8.6-3 .6c-1.5 0-3-.9-3-2.9C6 14.6 9.4 11 12 11Z"/></svg>`;
function topbar(current = "") {
  return `<header class="topbar"><div class="wrap topbar-in">
    <a class="brand" href="/de/">${BRAND_SVG}${SITE_NAME_DE}</a>
    <nav class="topnav" aria-label="Hauptmenü">${NAV.map(([u, t]) => `<a href="${u}"${current.startsWith(u) ? ' aria-current="page"' : ""}>${t}</a>`).join("")}<a class="nav-cta" href="/de/">Vergleichstool</a><a class="lang-switch" href="${L.LANG_ALT}" hreflang="en" lang="en" title="This page in English">EN</a></nav>
  </div></header>`;
}
const CALC_NAV = [
  ["/de/rechner/welpengewicht/", "Welpen-Endgewicht"],
  ["/de/rechner/hundebox-groesse/", "Hundebox-Größe"],
  ["/de/rechner/flugzeugkabine/", "Flugzeugkabine"],
  ["/de/rechner/hundejahre/", "Hundejahre in Menschenjahre"],
];
function siteFooter() {
  const col = (title, links) => `<div><h3>${title}</h3><ul>${links.map(([u, t]) => `<li><a href="${u}">${esc(t)}</a></li>`).join("")}</ul></div>`;
  return `<footer class="site-foot"><div class="wrap foot-grid">
    ${col("Nach Größe", SIZES.map((s) => [sizeUrl(s), SIZE_DE[s].list]))}
    ${col("Nach Gruppe", GROUPS.map((g) => [groupUrl(g), groupName(g)]))}
    ${col("Rechner", CALC_NAV)}
    ${col("Ratgeber", [["/de/rassefinder/", "Rassefinder"], ["/de/woelfe/", "Wolf und Hund"], ["/de/ratgeber/hund-richtig-messen/", "Hund richtig messen"], ["/de/ratgeber/groessenklassen-bei-hunden/", "Größenklassen bei Hunden"], ["/de/ratgeber/mit-hund-in-der-flugzeugkabine/", "Mit Hund fliegen"], ["/de/ueber-die-daten/", "Über die Daten"], ["/de/poster/", "Poster"], ["/de/bildnachweise/", "Bildnachweise"], ["/de/rasse-vorschlagen/", "Rasse vorschlagen"]])}
  </div><div class="wrap foot-note"><p>Größen und Gewichte folgen den Rassestandards der Zuchtverbände (AKC, FCI, The Kennel Club, UKC, RSCE). Einzelne Hunde können außerhalb aller angegebenen Bereiche liegen. <a href="/de/ueber-die-daten/">So stellen wir die Zahlen zusammen</a>.</p>
    <p>Alle Angaben auf dieser Website sind allgemeine Orientierung. Sie sind keine tierärztliche, medizinische oder Reiseberatung, und Airline-Regeln, Rassestandards und andere Details können sich ändern. Sprich vor Entscheidungen immer mit deiner Tierarztpraxis, deiner Airline oder dem Züchter. <a href="/de/ueber-die-daten/#haftungsausschluss">Vollständiger Haftungsausschluss</a>.</p>
    <p class="copyright">© ${new Date().getFullYear()} <a href="https://milivon.com">MILIVON</a>. Alle Rechte vorbehalten. Texte, Datenzusammenstellung und Illustrationen dürfen nicht ohne Erlaubnis vervielfältigt werden. Die Rassefotos stammen von Mitwirkenden auf Wikimedia Commons und stehen weiter unter ihren eigenen Lizenzen (CC BY, CC BY-SA, CC0 oder gemeinfrei); die Vorschaubilder sind zugeschnitten. <a href="/de/bildnachweise/">Bildnachweise</a>.</p></div></footer>`;
}
function page(opts) {
  return L.page({
    ...opts, lang: "de", topbarHtml: topbar(opts.current || ""), footerHtml: siteFooter(), siteName: SITE_NAME_DE,
    defaultOgAlt: "Illustrierte Hunderassen vom Chihuahua bis zum Irischen Wolfshund, maßstabsgetreu nebeneinander",
  });
}

/** Card linking to a breed page, with thumbnail and both sexes' figures. */
function breedCard(b, { extra = "", attrs = "" } = {}) {
  const img = b.photo
    ? `<img class="bcard-photo" src="${b.photo.thumb}" alt="" title="${esc(L.photoTitle(b.photo, "de"))}" loading="lazy" decoding="async" width="80" height="60">`
    : `<img src="${b.img.replace("/web/", "/thumb/")}" alt="" loading="lazy" decoding="async" width="72" height="50">`;
  return `<a class="bcard" href="${breedUrl(b)}"${attrs}>${img}<span class="bcard-meta"><span class="bcard-name">${esc(n(b))}</span>`
    + `<span class="bcard-st">♂ ${H(b.m.h)} · ${W(b.m.w)}</span>`
    + (b.sameSexes ? "" : `<span class="bcard-st">♀ ${H(b.f.h)} · ${W(b.f.w)}</span>`)
    + (extra ? `<span class="bcard-x">${extra}</span>` : "")
    + `</span></a>`;
}
const breedGrid = (bs, opts) => `<div class="bgrid">${bs.map((b) => breedCard(b, opts && opts(b))).join("")}</div>`;
const sortDe = (bs) => [...bs].sort((a, b) => n(a).localeCompare(n(b), "de"));

module.exports = {
  NAMES, deSlug, n, name, cap, pron, pronAcc, poss, listDe, gender,
  num, cm, kg, H, W, H1, W1, life, lifeDat, pct, times,
  SIZE_DE, sizeUrl, GROUP_DE, groupUrl, groupName, GROUP_NOTE,
  COUNTRY_DE, country, originName, ausOrigin, countryUrl, countryAdjList,
  TRAIT_DE, BREED_SLUG, WILD_SLUG, breedUrl, toolLink,
  SITE_NAME_DE, topbar, siteFooter, page, breedCard, breedGrid, sortDe, CALC_NAV,
};
