#!/usr/bin/env node
/*
 * Writes search-engine content into index.html from js/breeds.js:
 *   - the breed library as plain HTML (app.js replaces it once it runs),
 *   - the FAQ section, with facts computed from the data,
 *   - JSON-LD structured data (WebApplication + FAQPage) matching that FAQ,
 *   - the breed count in the title and descriptions.
 * Each block sits between <!-- seo:NAME --> and <!-- /seo:NAME --> markers.
 * Run after changing breed data:  node tools/build_seo.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
global.window = global.window || {};
require(path.join(ROOT, "js/breeds.js"));
require(path.join(ROOT, "js/dog-images.js"));
const IMAGES = window.DOG_IMAGES || {};

const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const avg = (r) => (r[0] + r[1]) / 2;
const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;

const BREEDS = window.BREED_ROWS.map((r) => {
  const b = { name: r[0], m: { h: [r[4], r[5]], w: [r[8], r[9]] }, f: { h: [r[6], r[7]], w: [r[10], r[11]] } };
  b.id = slug(b.name);
  b.hAvg = (avg(b.m.h) + avg(b.f.h)) / 2;
  b.wAvg = (avg(b.m.w) + avg(b.f.w)) / 2;
  return b;
}).sort((a, b) => a.name.localeCompare(b.name));
const N = BREEDS.length;

// same rules as app.js
const range = (r, f, unit) => (f(r[0]) === f(r[1]) ? `${f(r[0])} ${unit}` : `${f(r[0])}–${f(r[1])} ${unit}`);
const cm = (v) => round(v, v < 20 ? 1 : 0), inch = (v) => round(v / 2.54, 1);
const kg = (v) => round(v, v < 10 ? 1 : 0), lb = (v) => { const x = v * 2.20462; return round(x, x < 10 ? 1 : 0); };
const H = (r) => `${range(r, cm, "cm")} (${range(r, inch, "in")})`;
const W = (r) => `${range(r, kg, "kg")} (${range(r, lb, "lb")})`;
const CABIN_MAX_DOG = 8 - 1.5;
const cabinFor = (w) => (w[1] <= CABIN_MAX_DOG ? "yes" : w[0] <= CABIN_MAX_DOG ? "some" : "no");
const cabin = (b) => { const m = cabinFor(b.m.w), f = cabinFor(b.f.w); return m === "yes" && f === "yes" ? "yes" : m === "no" && f === "no" ? "no" : "some"; };

// ---------- library ----------
const library = BREEDS.map((b) => {
  const img = IMAGES[b.id] ? `<img class="lib-thumb" src="img/dogs/web/${b.id}.webp" alt="${esc(b.name)}" loading="lazy" decoding="async" width="64" height="44">` : "";
  return `<button class="lib-item" data-id="${b.id}" aria-pressed="false">${img}<span class="meta"><span class="nm" style="display:block">${esc(b.name)}</span>`
    + `<span class="st" style="display:block">♂ ${H(b.m.h)} · ${W(b.m.w)}</span>`
    + `<span class="st" style="display:block">♀ ${H(b.f.h)} · ${W(b.f.w)}</span></span><span class="add">+</span></button>`;
}).join("\n");

// ---------- FAQ ----------
const by = (k, dir) => [...BREEDS].sort((a, b) => dir * (a[k] - b[k]));
const list = (xs) => xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1];
const tall = by("hAvg", -1), heavy = by("wAvg", -1), short = by("hAvg", 1), light = by("wAvg", 1);
const nCabin = BREEDS.filter((b) => cabin(b) === "yes").length;
const nSome = BREEDS.filter((b) => cabin(b) === "some").length;
const faq = [
  ["How is a dog’s height measured?",
    "Height is measured at the withers, the highest point of the shoulder blades, from the ground with the dog standing square. The head and ears are not counted, so a dog’s overall height is greater than the figure in its breed standard. This page scales every dog by its withers height."],
  ["Are male and female dogs different sizes?",
    "In most breeds males are taller and heavier than females, often by 2–5 cm (1–2 in) and 10–25% in weight. Some standards give one range for both sexes; the page then shows the same figures for male and female. Use the Male, Female or Both buttons to compare them."],
  ["What is the tallest dog breed?",
    `On average the ${tall[0].name} is the tallest breed here, at ${H(tall[0].m.h)} for males. It is followed by the ${list(tall.slice(1, 4).map((b) => b.name))}. The heaviest breeds are the ${list(heavy.slice(0, 3).map((b) => b.name))}, with males up to ${W([heavy[0].m.w[1], heavy[0].m.w[1]])}.`],
  ["What is the smallest dog breed?",
    `The ${light[0].name} is the lightest breed, at ${W(light[0].m.w)}. The ${short[0].name} is the shortest at the withers, at ${H(short[0].m.h)}. Other very small breeds include the ${list(light.slice(1, 4).map((b) => b.name))}.`],
  ["Which dog breeds can fly in the airplane cabin?",
    `Many European airlines allow dogs in the cabin only if dog and carrier together weigh 8 kg (17.6 lb) or less; with a typical soft carrier that leaves about 6.5 kg (14.3 lb) for the dog. ${nCabin} breeds here stay under that across their whole weight range and ${nSome} more fit if the individual dog is on the lighter side. Use the “Airplane friendly” filter in the breed library. US airlines often set no weight limit, but the carrier must fit under the seat.`],
  ["Where do the size figures come from?",
    "Heights and weights come from the American Kennel Club breed standards, with FCI, UKC and breed-club standards for breeds the AKC doesn’t recognise. Designer and mixed breeds have no standard, so their ranges are typical values. Individual dogs can fall outside every range shown."],
];
const faqHtml = `<section class="card faq" aria-labelledby="faq-h">
      <h2 id="faq-h">Questions about dog sizes</h2>
${faq.map(([q, a]) => `      <details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("\n")}
    </section>`;

// ---------- JSON-LD ----------
const ld = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Dog Size Comparison",
      url: "https://dogsizecomparison.com/",
      image: "https://dogsizecomparison.com/img/og-image.png",
      applicationCategory: "ReferenceApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description: `Compare the size of ${N} dog breeds side by side, drawn to scale, with male and female heights and weights in cm/kg or in/lb.`,
    },
    { "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  ],
};
const ldHtml = `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`;

// ---------- write ----------
const file = path.join(ROOT, "index.html");
let html = fs.readFileSync(file, "utf8");
const put = (name, content) => {
  const re = new RegExp(`(<!-- seo:${name} -->)[\\s\\S]*?(<!-- /seo:${name} -->)`);
  if (!re.test(html)) throw new Error(`marker seo:${name} missing in index.html`);
  html = html.replace(re, (_, a, b) => `${a}\n${content}\n${b}`);
};
put("ld", ldHtml);
put("library", library);
put("faq", faqHtml);
// breed count in the <head> only (the body mentions other counts, e.g. AKC breeds)
const headEnd = html.indexOf("</head>");
html = html.slice(0, headEnd).replace(/\b\d{3} (dog )?breeds\b/gi, (m, dog) => `${N} ${dog || ""}${m.endsWith("Breeds") ? "Breeds" : "breeds"}`) + html.slice(headEnd);
fs.writeFileSync(file, html);
console.log(`index.html: ${N} breeds, ${faq.length} FAQ entries`);
