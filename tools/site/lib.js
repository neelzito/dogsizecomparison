/*
 * Shared helpers for the static page generator (tools/build_site.js):
 * breed data, number formatting, to-scale scene SVGs, a tiny Markdown renderer
 * and the page layout (head, top bar, footer).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const SITE = "https://dogsizecomparison.com";
const SITE_NAME = "Dog Size Comparison";

global.window = global.window || {};
require(path.join(ROOT, "js/breeds.js"));
require(path.join(ROOT, "js/dog-images.js"));
require(path.join(ROOT, "js/dog-renderer.js"));
const IMAGES = window.DOG_IMAGES || {};
const PHOTOS_FILE = path.join(ROOT, "content/photos.json");
const TRAITS = JSON.parse(fs.readFileSync(path.join(ROOT, "content/traits.json"), "utf8"));
const TRAIT_KEYS = ["energy", "shed", "groom", "kids", "novice", "apt"];
const TRAIT_INFO = {
  energy: { label: "Energy", vals: ["Low", "Moderate", "High"] },
  shed: { label: "Shedding", vals: ["Low", "Moderate", "High"] },
  groom: { label: "Grooming", vals: ["Low", "Moderate", "High"] },
  kids: { label: "With children", vals: ["Needs care", "Good", "Great"] },
  novice: { label: "First-time owners", vals: ["Experienced owners", "OK", "Great"] },
  apt: { label: "Apartment living", vals: ["Needs space", "Possible", "Good"] },
};
const PHOTOS = fs.existsSync(PHOTOS_FILE) ? JSON.parse(fs.readFileSync(PHOTOS_FILE, "utf8")) : {};
const DogRenderer = window.DogRenderer;

// ---------- basic helpers ----------
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const avg = (r) => (r[0] + r[1]) / 2;
const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;
const list = (xs) => (xs.length < 2 ? xs.join("") : xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1]);
const pct = (v) => `${Math.round(v * 100)}%`;
const article = (word) => (/^[aeiou]/i.test(word) && !/^(eu|uni|one)/i.test(word) ? "an" : "a");

// ---------- formatting (same rules as app.js) ----------
const range = (r, f, unit) => (f(r[0]) === f(r[1]) ? `${f(r[0])} ${unit}` : `${f(r[0])}–${f(r[1])} ${unit}`);
const cm = (v) => round(v, v < 20 ? 1 : 0);
const inch = (v) => round(v / 2.54, 1);
const kg = (v) => round(v, v < 10 ? 1 : 0);
const lb = (v) => { const x = v * 2.20462; return round(x, x < 10 ? 1 : 0); };
const H = (r) => `${range(r, cm, "cm")} (${range(r, inch, "in")})`;
const W = (r) => `${range(r, kg, "kg")} (${range(r, lb, "lb")})`;
const H1 = (v) => `${cm(v)} cm (${inch(v)} in)`;
const W1 = (v) => `${kg(v)} kg (${lb(v)} lb)`;
/** Height in feet and inches, e.g. 2 ft 6 in (or 9 in under a foot). */
const feetIn = (v) => { const t = Math.round(v / 2.54), f = Math.floor(t / 12), i = t % 12; return f ? `${f} ft${i ? ` ${i} in` : ""}` : `${i} in`; };
const FT = (r) => (feetIn(r[0]) === feetIn(r[1]) ? feetIn(r[0]) : `${feetIn(r[0])} to ${feetIn(r[1])}`);
const life = (r) => (r[0] === r[1] ? `${r[0]} years` : `${r[0]}–${r[1]} years`);

// ---------- breeds ----------
const SIZES = ["Toy", "Small", "Medium", "Large", "Giant"];
const SIZE_INFO = {
  Toy: { slug: "toy", limit: "under 5 kg (11 lb)", blurb: "lap-sized companions" },
  Small: { slug: "small", limit: "5–10 kg (11–22 lb)", blurb: "small but sturdy dogs" },
  Medium: { slug: "medium", limit: "10–25 kg (22–55 lb)", blurb: "mid-sized all-rounders" },
  Large: { slug: "large", limit: "25–45 kg (55–99 lb)", blurb: "big working and sporting dogs" },
  Giant: { slug: "giant", limit: "45 kg (99 lb) and over", blurb: "the heaviest breeds" },
};
const sizeOf = (w) => (w < 5 ? "Toy" : w < 10 ? "Small" : w < 25 ? "Medium" : w < 45 ? "Large" : "Giant");
const originKey = (o) => o.replace(/\s*\(.*\)\s*/, "").split("/")[0].trim();

const BREEDS = window.BREED_ROWS.map((r) => {
  const b = {
    name: r[0], group: r[1], origin: r[2], type: r[3],
    m: { h: [r[4], r[5]], w: [r[8], r[9]] },
    f: { h: [r[6], r[7]], w: [r[10], r[11]] },
    life: [r[12], r[13]], ov: r[14] || null,
  };
  b.id = slug(b.name);
  b.hAvg = (avg(b.m.h) + avg(b.f.h)) / 2;
  b.wAvg = (avg(b.m.w) + avg(b.f.w)) / 2;
  b.lifeAvg = avg(b.life);
  b.size = sizeOf(b.wAvg);
  b.country = originKey(b.origin);
  b.sameSexes = b.m.h[0] === b.f.h[0] && b.m.h[1] === b.f.h[1] && b.m.w[0] === b.f.w[0] && b.m.w[1] === b.f.w[1];
  b.url = `/breeds/${b.id}/`;
  b.aliases = (window.BREED_ALIASES || {})[b.name] || [];
  b.source = (window.BREED_SOURCES || {})[b.name] || null;
  b.img = `/img/dogs/web/${b.id}.webp`;
  const t = TRAITS[b.id];
  if (!t) throw new Error(`content/traits.json: no entry for ${b.id}`);
  b.traits = Object.fromEntries(TRAIT_KEYS.map((k, i) => [k, t[i]]));
  b.photo = PHOTOS[b.id] ? { ...PHOTOS[b.id], src: `/img/photos/${b.id}.webp`, thumb: `/img/photos/thumb/${b.id}.webp` } : null;
  return b;
}).sort((a, b) => a.name.localeCompare(b.name));
const BY_ID = Object.fromEntries(BREEDS.map((b) => [b.id, b]));
const N = BREEDS.length;
const GROUPS = [...new Set(BREEDS.map((b) => b.group))].sort();
const groupSlug = (g) => slug(g === "Designer / Mixed" ? "designer-mixed" : g);
const groupUrl = (g) => `/groups/${groupSlug(g)}/`;
const sizeUrl = (s) => `/sizes/${SIZE_INFO[s].slug}/`;
const COUNTRY_COUNTS = BREEDS.reduce((m, b) => ((m[b.country] = (m[b.country] || 0) + 1), m), {});
const COUNTRIES = Object.keys(COUNTRY_COUNTS).filter((c) => COUNTRY_COUNTS[c] >= 4).sort();
const countryUrl = (c) => (COUNTRIES.includes(c) ? `/origins/${slug(c)}/` : null);
const groupLabel = (g) => (g === "Designer / Mixed" ? "the designer & mixed category" : `the ${g} group`);
/** "the United States", "the Netherlands", "Germany" */
const place = (o) => (/^(United States|Netherlands|Middle East|Caucasus|Mediterranean|Czech)/.test(o) ? `the ${o}` : o);
/** "a toy-sized", "a medium-sized" ... */
const sizeWord = (b) => `${b.size.toLowerCase()}${b.size === "Toy" ? "" : "-sized"}`;
/** Indefinite article for a breed name: "an Irish Wolfhound", "a Beagle". */
const aName = (b) => `${article(b.name)} ${b.name}`;

// ---------- airplane cabin (same rule as app.js) ----------
const CABIN = { limitKg: 8, carrierKg: 1.5 };
const CABIN_MAX_DOG = CABIN.limitKg - CABIN.carrierKg;
const cabinFor = (w) => (w[1] <= CABIN_MAX_DOG ? "yes" : w[0] <= CABIN_MAX_DOG ? "some" : "no");
const cabin = (b) => { const m = cabinFor(b.m.w), f = cabinFor(b.f.w); return m === "yes" && f === "yes" ? "yes" : m === "no" && f === "no" ? "no" : "some"; };

// ---------- shapes and body measurements ----------
const shapeOf = (b) => {
  const im = IMAGES[b.id];
  if (!im) return DogRenderer.build(b.type, b.ov);
  const [aspect, wy, wx] = im;
  const h = 1 / wy, w = aspect * h;
  return { img: b.img, minX: 0, maxX: w, maxY: h, withersX: wx * w };
};
/** Rough body measurements in withers units from the silhouette parameters. */
function bodyUnits(b) {
  const p = Object.assign({}, { bodyL: 1.15, neckL: 0.32, neckA: 55, headR: 0.17, muzzleL: 0.2 }, DogRenderer.TYPES[b.type] || {}, b.ov || {});
  const len = p.bodyL + p.neckL * Math.cos((p.neckA * Math.PI) / 180) + p.headR + p.muzzleL; // nose to base of tail
  return { len, top: shapeOf(b).maxY }; // top = top of head (or ears) standing
}

// ---------- ranks and similarity ----------
const share = (b, key) => BREEDS.filter((x) => x[key] < b[key]).length / (N - 1);
function distance(a, b) {
  return Math.abs(Math.log(a.wAvg / b.wAvg)) + 1.5 * Math.abs(a.hAvg - b.hAvg) / ((a.hAvg + b.hAvg) / 2);
}
const nearest = (b, n, filter = () => true) => BREEDS.filter((x) => x !== b && filter(x)).sort((x, y) => distance(b, x) - distance(b, y)).slice(0, n);

/** Where a height falls against a standing adult of `personCm`. */
function bodyLandmark(hCm, personCm = 175) {
  const f = hCm / personCm;
  return f < 0.12 ? "about ankle height" : f < 0.19 ? "about mid-shin" : f < 0.26 ? "just below the knee" : f < 0.33 ? "about knee height" : f < 0.43 ? "about mid-thigh" : f < 0.55 ? "about hip height" : "about waist height";
}

// ---------- to-scale scene SVG ----------
const MALE = "#2f6db5", FEMALE = "#c2457a";
const COLORS = ["#c2562b", "#2f6db5", "#3d8b5a", "#8a4fbf", "#c9962a", "#1f8a8a", "#c2457a", "#6b6f2a", "#5b5bd6", "#8c5a3c"];
function niceStep(rangeUnits, target) {
  const raw = rangeUnits / target, pow = 10 ** Math.floor(Math.log10(raw)), n = raw / pow;
  return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * pow;
}
/**
 * Draw dogs (and optionally a person) standing on one ground line, to scale.
 * dogs: [{ b, hCm, label, sub, color, dashed }]
 */
function scene(dogs, { human = 175, width = 760, height = 380, title = "", lang = "en", nameOf = (b) => b.name } = {}) {
  const de = lang === "de", num = (v) => (de ? String(v).replace(".", ",") : String(v));
  const objs = [];
  if (human) objs.push({ kind: "human", shape: DogRenderer.human(), hCm: human });
  for (const d of dogs) objs.push({ kind: "dog", ...d, shape: shapeOf(d.b) });
  const maxTop = Math.max(...objs.map((o) => o.shape.maxY * o.hCm), 30);
  const maxH = Math.max(...objs.map((o) => o.hCm));
  const gap = Math.max(10, maxH * 0.22);
  let wCm = 0;
  objs.forEach((o, i) => { o.wCm = (o.shape.maxX - o.shape.minX) * o.hCm; o.gap = i ? (o.b && objs[i - 1].b === o.b ? gap * 0.4 : gap) : 0; wCm += o.wCm + o.gap; });
  const padL = 44, padR = 44, padT = 26, padB = 50;
  const k = Math.min((width - padL - padR) / wCm, (height - padT - padB) / (maxTop * 1.05));
  const groundY = Math.min(height, Math.ceil(maxTop * 1.05 * k + padT + padB)) - padB;
  let x = padL + Math.max(0, (width - padL - padR - wCm * k) / 2);

  let grid = "";
  const visCm = (groundY - padT + 10) / k;
  const stepCm = niceStep(visCm, 5), stepIn = niceStep(visCm / 2.54, 5);
  for (let v = 0; v <= visCm; v += stepCm) {
    const y = groundY - v * k;
    if (v > 0) grid += `<line class="sc-grid" x1="${padL - 4}" x2="${width - padR + 4}" y1="${y}" y2="${y}"/>`;
    grid += `<text class="sc-axis" x="${padL - 8}" y="${y + 4}" text-anchor="end">${num(round(v, 1))}</text>`;
  }
  for (let v = stepIn; !de && v <= visCm / 2.54; v += stepIn) {
    const y = groundY - v * 2.54 * k;
    grid += `<text class="sc-axis" x="${width - padR + 8}" y="${y + 4}">${round(v, 1)}</text>`;
  }
  grid += `<text class="sc-axis" x="${padL - 8}" y="${padT - 10}" text-anchor="end">cm</text>${de ? "" : `<text class="sc-axis" x="${width - padR + 8}" y="${padT - 10}">in</text>`}`;

  let body = "", labels = "";
  const slots = [];
  for (const o of objs) {
    x += o.gap * k;
    const s = o.hCm * k, ox = x - o.shape.minX * s, cx = x + (o.wCm * k) / 2;
    if (o.kind === "human") {
      body += `<g class="sc-human" transform="translate(${round(ox, 2)} ${groundY}) scale(${round(s, 3)} ${round(-s, 3)})">${o.shape.markup}</g>`;
      labels += `<text class="sc-sub" x="${round(cx, 1)}" y="${groundY + 18}" text-anchor="middle">${de ? "Mensch" : "Person"} · ${num(cm(o.hCm))} cm</text>`;
      slots.push({ x: cx, w: 96, row: 0 });
    } else {
      const iw = o.shape.maxX * s, ih = o.shape.maxY * s;
      if (o.shape.img) body += `<image href="${o.shape.img}" x="${round(ox, 2)}" y="${round(groundY - ih, 2)}" width="${round(iw, 2)}" height="${round(ih, 2)}" preserveAspectRatio="none"><title>${esc(nameOf(o.b))}</title></image>`;
      else body += `<g style="color:${o.color}" transform="translate(${round(ox, 2)} ${groundY}) scale(${round(s, 3)} ${round(-s, 3)})">${o.shape.markup}</g>`;
      body += `<line class="sc-key" x1="${round(ox + iw * 0.12, 1)}" x2="${round(ox + iw * 0.88, 1)}" y1="${groundY + 3}" y2="${groundY + 3}" stroke="${o.color}"${o.dashed ? ' stroke-dasharray="6 4"' : ""}/>`;
      const label = o.label || nameOf(o.b);
      const estW = Math.max(label.length * 7 + 12, 76);
      const lx = Math.min(Math.max(cx, estW / 2 + 2), width - estW / 2 - 2);
      let row = 0;
      while (slots.some((sl) => sl.row === row && Math.abs(sl.x - lx) < (sl.w + estW) / 2 + 4)) row++;
      slots.push({ x: lx, w: estW, row });
      const ly = groundY + 18 + row * 30;
      labels += `<text class="sc-name" x="${round(lx, 1)}" y="${ly}" text-anchor="middle">${esc(label)}</text>`;
      if (o.sub) labels += `<text class="sc-sub" x="${round(lx, 1)}" y="${ly + 13}" text-anchor="middle">${esc(o.sub)}</text>`;
    }
    x += o.wCm * k;
  }
  const rows = Math.max(1, ...slots.map((s) => s.row + 1));
  const total = groundY + 16 + rows * 30;
  return `<figure class="scene"><svg viewBox="0 0 ${width} ${total}" role="img" aria-label="${esc(title || (de ? "Hunde maßstabsgetreu" : "Dogs drawn to scale"))}">${grid}<line class="sc-ground" x1="${padL - 4}" x2="${width - padR + 4}" y1="${groundY}" y2="${groundY}"/>${body}${labels}</svg></figure>`;
}

// ---------- Markdown (just enough for our content files) ----------
function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, (_, t, u) => `<a href="${u}"${/^https?:/.test(u) ? ' rel="noopener"' : ""}>${t}</a>`);
}
/** blocks: { name: html } for lines like {{name}} */
function markdown(src, blocks = {}) {
  const lines = src.replace(/\r/g, "").split("\n");
  const out = [];
  let i = 0;
  const headingId = (t) => slug(t.replace(/[*`]/g, ""));
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    let m;
    if ((m = l.match(/^\{\{(\w+)\}\}$/))) {
      if (!(m[1] in blocks)) throw new Error(`unknown block {{${m[1]}}}`);
      out.push(blocks[m[1]]); i++; continue;
    }
    if ((m = l.match(/^(#{2,4}) (.+)$/))) { const n = m[1].length; out.push(`<h${n} id="${headingId(m[2])}">${inline(m[2])}</h${n}>`); i++; continue; }
    if (/^\|/.test(l)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
      const cells = (r) => r.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const head = cells(rows[0]);
      const body = rows.slice(2).map(cells);
      out.push(`<div class="table-scroll"><table class="data-table"><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }
    if (/^[-*] /.test(l) || /^\d+\. /.test(l)) {
      const ordered = /^\d+\. /.test(l);
      const items = [];
      while (i < lines.length && (ordered ? /^\d+\. /.test(lines[i]) : /^[-*] /.test(lines[i]))) items.push(lines[i++].replace(/^([-*]|\d+\.) /, ""));
      out.push(`<${ordered ? "ol" : "ul"}>${items.map((t) => `<li>${inline(t)}</li>`).join("")}</${ordered ? "ol" : "ul"}>`);
      continue;
    }
    if (/^> /.test(l)) {
      const q = [];
      while (i < lines.length && /^> /.test(lines[i])) q.push(lines[i++].slice(2));
      out.push(`<aside class="note">${inline(q.join(" "))}</aside>`);
      continue;
    }
    const p = [];
    while (i < lines.length && lines[i].trim() && !/^(#{2,4} |\||[-*] |\d+\. |> |\{\{)/.test(lines[i])) p.push(lines[i++]);
    out.push(`<p>${inline(p.join(" "))}</p>`);
  }
  return out.join("\n");
}
/** Split "---\nkey: value\n---\nbody" front matter. */
function frontMatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { meta: {}, body: src };
  const meta = {};
  for (const line of m[1].split("\n")) { const i = line.indexOf(":"); if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
  return { meta, body: src.slice(m[0].length) };
}

// ---------- analytics (content/site.json; off while provider or id is empty) ----------
const SITE_CFG = JSON.parse(fs.readFileSync(path.join(ROOT, "content/site.json"), "utf8"));
function analyticsTag() {
  const { provider, id } = SITE_CFG.analytics || {};
  if (!provider || !id) return "";
  const a = esc(id);
  if (provider === "cloudflare") return `<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${a}"}'></script>`;
  if (provider === "goatcounter") return `<script data-goatcounter="https://${a}.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>`;
  if (provider === "plausible") return `<script defer data-domain="${a}" src="https://plausible.io/js/script.js"></script>`;
  throw new Error(`content/site.json: unknown analytics provider "${provider}" (use cloudflare, goatcounter or plausible)`);
}

// ---------- languages ----------
// Pages are written with two placeholders that are filled in once both languages are
// built (tools/build_site.js): HREFLANG (alternate-language links in <head>) and
// LANG_ALT (the URL of the same page in the other language, for the EN/DE switch).
const HREFLANG = "<!--hreflang-->";
const LANG_ALT = "__LANG_ALT__";
/** pairs: { enUrl: deUrl } */
function finalizeHtml(html, url, pairs) {
  const en = url.startsWith("/de/") || url === "/de/" ? Object.keys(pairs).find((k) => pairs[k] === url) : url;
  const de = en != null ? pairs[en] : undefined;
  const isDe = url.startsWith("/de/");
  const alt = isDe ? (en || "/") : (de || "/de/");
  const links = en != null && de
    ? `<link rel="alternate" hreflang="en" href="${SITE}${en}" />\n  <link rel="alternate" hreflang="de" href="${SITE}${de}" />\n  <link rel="alternate" hreflang="x-default" href="${SITE}${en}" />`
    : "";
  return html.split(HREFLANG).join(links).split(LANG_ALT).join(alt);
}

// ---------- layout ----------
const NAV = [
  ["/breeds/", "Breeds"],
  ["/breed-finder/", "Breed finder"],
  ["/compare/", "Comparisons"],
  ["/calculators/", "Calculators"],
  ["/articles/", "Articles"],
  ["/posters/", "Posters"],
];
function topbar(current = "") {
  return `<header class="topbar"><div class="wrap topbar-in">
    <a class="brand" href="/"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 10a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm4-3.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm7 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm4 3.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4ZM12 11c2.6 0 6 3.6 6 6.4 0 2-1.5 2.9-3 2.9-1.2 0-1.9-.6-3-.6s-1.8.6-3 .6c-1.5 0-3-.9-3-2.9C6 14.6 9.4 11 12 11Z"/></svg>Dog Size Comparison</a>
    <nav class="topnav" aria-label="Main">${NAV.map(([u, t]) => `<a href="${u}"${current.startsWith(u) ? ' aria-current="page"' : ""}>${t}</a>`).join("")}<a class="nav-cta" href="/">Compare tool</a><a class="lang-switch" href="${LANG_ALT}" hreflang="de" lang="de" title="Diese Seite auf Deutsch">DE</a></nav>
  </div></header>`;
}
function siteFooter() {
  const col = (title, links) => `<div><h3>${title}</h3><ul>${links.map(([u, t]) => `<li><a href="${u}">${esc(t)}</a></li>`).join("")}</ul></div>`;
  return `<footer class="site-foot"><div class="wrap foot-grid">
    ${col("By size", SIZES.map((s) => [sizeUrl(s), `${s} dog breeds`]))}
    ${col("By group", GROUPS.map((g) => [groupUrl(g), g === "Designer / Mixed" ? "Designer & mixed" : `${g} group`]))}
    ${col("Calculators", [["/calculators/puppy-weight/", "Puppy adult weight"], ["/calculators/crate-size/", "Crate size"], ["/calculators/airline-cabin/", "Airline cabin check"], ["/calculators/dog-years/", "Dog years to human years"]])}
    ${col("Guides", [["/breed-finder/", "Breed finder"], ["/articles/how-to-measure-your-dog/", "How to measure your dog"], ["/articles/dog-size-classes-explained/", "Dog size classes explained"], ["/articles/flying-with-a-dog-in-the-cabin/", "Flying with a dog"], ["/about/", "About the data"], ["/posters/", "Posters"], ["/photo-credits/", "Photo credits"], ["/suggest-a-breed/", "Suggest a breed"]])}
  </div><div class="wrap foot-note"><p>Heights and weights follow kennel-club breed standards (AKC, FCI, The Kennel Club, UKC, RSCE). Individual dogs can fall outside every range shown. <a href="/about/">How we compile the figures</a>.</p>
    <p>All information on this site is general guidance only. It is not veterinary, medical or travel advice, and airline rules, breed standards and other details can change. Always check with your vet, airline or breeder before making decisions. <a href="/about/#disclaimer">Full disclaimer</a>.</p>
    <p class="copyright">© ${new Date().getFullYear()} <a href="https://milivon.com">MILIVON</a>. All rights reserved. Text, data compilation and illustrations may not be reproduced without permission. Breed photos are by Wikimedia Commons contributors and remain under their own licences (CC BY, CC BY-SA, CC0 or public domain); card thumbnails are cropped. <a href="/photo-credits/">Photo credits</a>.</p></div></footer>`;
}
function crumbs(items) {
  const html = `<nav class="crumbs" aria-label="Breadcrumb"><ol>${items.map(([u, t], i) => `<li>${i === items.length - 1 ? `<span aria-current="page">${esc(t)}</span>` : `<a href="${u}">${esc(t)}</a>`}</li>`).join("")}</ol></nav>`;
  const ld = { "@type": "BreadcrumbList", itemListElement: items.map(([u, t], i) => ({ "@type": "ListItem", position: i + 1, name: t, item: SITE + u })) };
  return { html, ld };
}
function page({ url, title, description, body, ld = [], current = "", ogImage = "/img/og-image.png", ogAlt = "", scripts = [], noindex = false, lang = "en", topbarHtml, footerHtml, defaultOgAlt = "Illustrated dog breeds from Chihuahua to Irish Wolfhound standing side by side to scale", siteName = SITE_NAME }) {
  const graph = { "@context": "https://schema.org", "@graph": ld };
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <meta name="copyright" content="© ${new Date().getFullYear()} MILIVON" />
  <link rel="canonical" href="${SITE}${url}" />
  ${HREFLANG}${noindex ? '\n  <meta name="robots" content="noindex" />' : ""}
  <meta name="theme-color" content="#f6f3ee" media="(prefers-color-scheme: light)" />
  <meta name="theme-color" content="#15140f" media="(prefers-color-scheme: dark)" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" href="/img/favicon-32.png" type="image/png" sizes="32x32" />
  <link rel="apple-touch-icon" href="/img/apple-touch-icon.png" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${esc(siteName)}" />${lang === "de" ? '\n  <meta property="og:locale" content="de_DE" />' : ""}
  <meta property="og:url" content="${SITE}${url}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:image" content="${SITE}${ogImage}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${esc(ogImage === "/img/og-image.png" || !ogAlt ? defaultOgAlt : ogAlt)}" />
  <meta name="twitter:card" content="summary_large_image" />
  ${ld.length ? `<script type="application/ld+json">${JSON.stringify(graph).replace(/</g, "\\u003c")}</script>` : ""}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/css/styles.css" />
  ${analyticsTag()}
</head>
<body class="site-page">
  ${topbarHtml || topbar(current)}
  <main class="wrap content">
${body}
  </main>
  ${footerHtml || siteFooter()}
${scripts.map((s) => `  <script src="${s}"></script>`).join("\n")}
</body>
</html>
`;
}

// ---------- photo credits ----------
// Breed photos are Wikimedia Commons files under CC BY, CC BY-SA, CC0 or public domain
// (content/photos.json). CC licences need author, licence and source wherever a photo
// is shown, and a note that it was changed: card thumbnails are cropped 4:3.
const PHOTO_CREDITS_URL = { en: "/photo-credits/", de: "/de/bildnachweise/" };
const photoArtist = (p, lang = "en") => (lang === "de" && p.artist === "Unknown author" ? "Urheber unbekannt" : p.artist);
const photoLicense = (p, lang = "en") => (lang === "de" && p.license === "Public domain" ? "gemeinfrei" : p.license);
/** One-line credit for a cropped card thumbnail (title attribute). */
const photoTitle = (p, lang = "en") => lang === "de"
  ? `Foto: ${photoArtist(p, lang)}, ${photoLicense(p, lang)}, Wikimedia Commons (zugeschnitten)`
  : `Photo: ${p.artist}, ${p.license}, Wikimedia Commons (cropped)`;
/** Table of every breed photo with author, licence and source. rows: [{b, name, url}] */
function photoCreditsTable(rows, lang = "en") {
  const de = lang === "de";
  const lic = (p) => (p.licenseUrl ? `<a href="${esc(p.licenseUrl)}" rel="license noopener" target="_blank">${esc(photoLicense(p, lang))}</a>` : esc(photoLicense(p, lang)));
  const file = (p) => esc(p.file.replace(/^File:/, ""));
  return `<div class="table-scroll"><table class="data-table credits-table">
<thead><tr><th>${de ? "Foto" : "Photo"}</th><th>${de ? "Rasse" : "Breed"}</th><th>${de ? "Urheber" : "Author"}</th><th>${de ? "Lizenz" : "Licence"}</th><th>${de ? "Quelle" : "Source"}</th></tr></thead>
<tbody>${rows.map(({ b, name, url }) => `<tr id="${b.id}"><td><img src="${b.photo.thumb}" alt="" loading="lazy" decoding="async" width="80" height="60"></td><td class="breed"><a href="${url}">${esc(name)}</a></td><td>${esc(photoArtist(b.photo, lang))}</td><td>${lic(b.photo)}</td><td><a href="${esc(b.photo.source)}" rel="noopener" target="_blank">${file(b.photo)}</a></td></tr>`).join("\n")}</tbody>
</table></div>`;
}

// ---------- reusable fragments ----------
/** Card linking to a breed page, with thumbnail and both sexes' figures. */
function breedCard(b, { extra = "", attrs = "" } = {}) {
  const img = b.photo
    ? `<img class="bcard-photo" src="${b.photo.thumb}" alt="" title="${esc(photoTitle(b.photo))}" loading="lazy" decoding="async" width="80" height="60">`
    : `<img src="${b.img.replace("/web/", "/thumb/")}" alt="" loading="lazy" decoding="async" width="72" height="50">`;
  return `<a class="bcard" href="${b.url}"${attrs}>${img}<span class="bcard-meta"><span class="bcard-name">${esc(b.name)}</span>`
    + `<span class="bcard-st">♂ ${H(b.m.h)} · ${W(b.m.w)}</span>`
    + (b.sameSexes ? "" : `<span class="bcard-st">♀ ${H(b.f.h)} · ${W(b.f.w)}</span>`)
    + (extra ? `<span class="bcard-x">${extra}</span>` : "")
    + `</span></a>`;
}
const breedGrid = (bs, opts) => `<div class="bgrid">${bs.map((b) => breedCard(b, opts && opts(b))).join("")}</div>`;
const toolLink = (entries) => `/#b=${entries.map(([id, sex]) => `${id}:${sex || "m"}`).join(",")}`;
/** Figures for "both sexes" as one range. */
const spanH = (b) => [Math.min(b.m.h[0], b.f.h[0]), Math.max(b.m.h[1], b.f.h[1])];
const spanW = (b) => [Math.min(b.m.w[0], b.f.w[0]), Math.max(b.m.w[1], b.f.w[1])];

function faqBlock(faq, title = "Frequently asked questions") {
  const html = `<section class="faq-block"><h2>${esc(title)}</h2>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</section>`;
  const ld = { "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };
  return { html, ld };
}

// ---------- calculator tables (also sent to js/calc.js) ----------
/** Typical share of adult weight reached by age in weeks, per adult size class. */
const GROWTH = {
  weeks: [0, 8, 12, 16, 20, 26, 32, 39, 52, 65, 78, 104],
  Toy: [0.04, 0.25, 0.4, 0.55, 0.68, 0.82, 0.92, 0.97, 1, 1, 1, 1],
  Small: [0.04, 0.2, 0.33, 0.47, 0.6, 0.76, 0.88, 0.95, 1, 1, 1, 1],
  Medium: [0.03, 0.15, 0.26, 0.38, 0.5, 0.66, 0.79, 0.88, 0.97, 1, 1, 1],
  Large: [0.025, 0.12, 0.21, 0.31, 0.42, 0.57, 0.7, 0.8, 0.92, 0.97, 1, 1],
  Giant: [0.02, 0.09, 0.16, 0.24, 0.33, 0.46, 0.58, 0.69, 0.83, 0.91, 0.96, 1],
};
function growthShare(size, wk) {
  const W = GROWTH.weeks, S = GROWTH[size];
  if (wk >= W[W.length - 1]) return 1;
  let i = 1;
  while (W[i] < wk) i++;
  return S[i - 1] + ((S[i] - S[i - 1]) * (wk - W[i - 1])) / (W[i] - W[i - 1]);
}
/** Human-equivalent age by dog age 1–16 (veterinary age chart), per size. */
const DOG_YEARS = {
  Small: [15, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72, 76, 80],
  Medium: [15, 24, 28, 32, 36, 42, 47, 51, 56, 60, 65, 69, 74, 78, 83, 87],
  Large: [15, 24, 28, 32, 36, 45, 50, 55, 61, 66, 72, 77, 82, 88, 93, 99],
  Giant: [12, 22, 31, 38, 45, 49, 56, 64, 71, 79, 86, 93, 100, 107, 114, 121],
};
const dogYears = (size, y) => DOG_YEARS[size][y - 1];
/** Expected weight range by puppy age: adult min–max weight × typical growth share for the size class.
 *  Stops after the first age at which the size class is fully grown. */
const GROWTH_AGES = [8, 12, 16, 26, 39, 52, 78, 104];
function growthRows(b) {
  const rows = [];
  for (const wk of GROWTH_AGES) {
    const s = growthShare(b.size, wk);
    rows.push({ wk, s, m: b.m.w.map((w) => w * s), f: b.f.w.map((w) => w * s) });
    if (s >= 1) break;
  }
  return rows;
}
/** Common wire crate sizes (outside, inches). */
const CRATES = [
  { name: "XS", l: 18, w: 12, h: 14, ex: "Chihuahua, Yorkshire Terrier" },
  { name: "S", l: 24, w: 18, h: 19, ex: "Shih Tzu, Pug, Miniature Dachshund" },
  { name: "M", l: 30, w: 19, h: 21, ex: "Beagle, Cocker Spaniel, French Bulldog" },
  { name: "L", l: 36, w: 23, h: 25, ex: "Border Collie, Bulldog, Australian Shepherd" },
  { name: "XL", l: 42, w: 28, h: 30, ex: "Labrador, Golden Retriever, Boxer" },
  { name: "XXL", l: 48, w: 30, h: 33, ex: "German Shepherd, Rottweiler, Doberman" },
  { name: "Giant", l: 54, w: 37, h: 45, ex: "Great Dane, Mastiff, Irish Wolfhound" },
];

// ---------- posters ----------
// Rendered by tools/build_poster.py and tools/build_podenco_poster.py into img/posters/
// (<file>.jpg full size, <file>-preview.webp for the page).
const POSTERS_URL = { en: "/posters/", de: "/de/poster/" };
const POSTERS = {
  akc: { file: "akc-breeds-to-scale", w: 6000, h: 9000,
    en: { title: "Every AKC breed, drawn to scale", alt: "Poster of more than 200 AKC dog breeds drawn to scale in rows from smallest to largest",
      desc: "All the breeds recognised by the American Kennel Club, from the Miniature Dachshund to the Irish Wolfhound, in rows from smallest to largest. Every dog is drawn at the same scale, with a centimetre ruler on each row. Portrait, sized for printing up to A1." },
    de: { title: "Every AKC breed, drawn to scale (Englisch)", alt: "Poster mit über 200 AKC-Hunderassen maßstabsgetreu in Reihen von klein nach groß",
      desc: "Alle Rassen, die der American Kennel Club anerkennt, vom Zwergdackel bis zum Irischen Wolfshund, in Reihen von klein nach groß. Alle Hunde im selben Maßstab, mit Zentimeterlineal in jeder Reihe. Hochformat, groß genug für einen Druck bis A1. Die Beschriftung ist englisch." } },
  podencosEn: { file: "podencos-to-scale", w: 4800, h: 2688,
    en: { title: "Every podenco, drawn to scale", alt: "Poster of the Spanish podencos and their Mediterranean relatives drawn to scale",
      desc: "The Spanish podencos, from the Maneto to the Ibizan Hound, including all three sizes of Podenco Andaluz, plus their relatives from Portugal, Italy and Malta. Heights for males and females under every dog. Landscape." } },
  podencosDe: { file: "podencos-massstabsgetreu", w: 4800, h: 2688,
    en: { title: "Alle Podencos, maßstabsgetreu (German)", alt: "German poster of the Spanish podencos and their Mediterranean relatives drawn to scale",
      desc: "The podenco poster with German labels." },
    de: { title: "Alle Podencos, maßstabsgetreu", alt: "Poster der spanischen Podencos und ihrer Verwandten rund ums Mittelmeer, maßstabsgetreu",
      desc: "Die spanischen Podencos vom Maneto bis zum Podenco Ibicenco, mit allen drei Größen des Podenco Andaluz, dazu ihre Verwandten aus Portugal, Italien und Malta. Unter jedem Hund stehen die Größen für Rüden und Hündinnen. Querformat." } },
};
// Breed-group posters, rendered by tools/build_group_posters.py, which writes their sizes and titles here.
const GROUP_POSTERS = JSON.parse(fs.readFileSync(path.join(__dirname, "group-posters.json"), "utf8"));
const GROUP_KEYS = Object.keys(GROUP_POSTERS);
for (const [k, g] of Object.entries(GROUP_POSTERS)) {
  const card = (lang) => {
    const v = g[lang], de = lang === "de", sub = v.sub.replace(/ (Every dog is drawn at the same scale|Alle Hunde im selben Maßstab)\.$/, ""), plain = v.title.replace(/, (drawn to scale|maßstabsgetreu)$/, "");
    return { file: v.file, w: v.w, h: v.h, [lang]: {
      title: v.title,
      alt: de ? `Poster: ${v.n} Rassen der Gruppe ${plain}, maßstabsgetreu von klein nach groß` : `Poster of ${v.n} ${plain.toLowerCase()} drawn to scale from smallest to largest`,
      desc: de ? `${v.n} Rassen. ${sub} Unter jedem Hund stehen die Größen für Rüden und Hündinnen.` : `${v.n} breeds. ${sub} Heights for males and females under every dog.` } };
  };
  POSTERS[k + "En"] = card("en");
  POSTERS[k + "De"] = card("de");
}
/** One card per poster: preview linking to the full-size JPG, title, description and a download button. */
function posterCards(keys, lang = "en") {
  const de = lang === "de";
  return `<div class="poster-grid">${keys.map((k) => {
    const p = POSTERS[k], t = p[lang], src = `/img/posters/${p.file}.jpg`;
    const mb = fs.statSync(path.join(ROOT, src)).size / 1048576;
    const size = `JPG, ${de ? mb.toFixed(1).replace(".", ",") : mb.toFixed(1)} MB, ${p.w} × ${p.h} px`;
    const pw = 1400, ph = Math.round(pw * p.h / p.w); // previews fit 1400 × 2100
    return `<figure class="card poster-card"><a href="${src}"><img src="/img/posters/${p.file}-preview.webp" alt="${esc(t.alt)}" width="${pw}" height="${ph}" loading="lazy" decoding="async"></a>
<figcaption><h2>${esc(t.title)}</h2><p>${esc(t.desc)}</p><p><a class="btn" href="${src}" download>${de ? "Herunterladen" : "Download"}</a> <span class="muted small">${size}</span></p></figcaption></figure>`;
  }).join("\n")}</div>`;
}

module.exports = {
  analyticsTag, TRAIT_KEYS, TRAIT_INFO,
  GROWTH, growthShare, GROWTH_AGES, growthRows, DOG_YEARS, dogYears, CRATES,
  ROOT, SITE, SITE_NAME, fs, path,
  slug, esc, avg, round, list, pct, article, aName, place,
  cm, inch, kg, lb, H, W, H1, W1, feetIn, FT, life,
  SIZES, SIZE_INFO, sizeOf, BREEDS, BY_ID, N, GROUPS, groupUrl, groupSlug, groupLabel, sizeUrl, sizeWord,
  COUNTRIES, COUNTRY_COUNTS, countryUrl,
  CABIN, CABIN_MAX_DOG, cabin, cabinFor,
  shapeOf, bodyUnits, share, distance, nearest, bodyLandmark,
  MALE, FEMALE, COLORS, scene,
  markdown, frontMatter, inline,
  topbar, siteFooter, crumbs, page, PHOTO_CREDITS_URL, POSTERS_URL, posterCards, GROUP_KEYS, photoTitle, photoCreditsTable, HREFLANG, LANG_ALT, finalizeHtml, breedCard, breedGrid, toolLink, spanH, spanW, faqBlock,
};
