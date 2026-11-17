#!/usr/bin/env node
/*
 * Builds the static content pages from js/breeds.js and content/*.md:
 *   /breeds/…, /compare/…, /sizes/…, /groups/…, /origins/…,
 *   /articles/…, /calculators/…, /about/, sitemap.xml
 * and refreshes the generated parts of index.html (via build_seo.js) plus its
 * top bar and footer.
 *
 * Run after changing breed data or content:  node tools/build_site.js
 * Generated folders are wiped and rewritten on every run, so edit the
 * generator or content/ rather than the HTML output.
 */
const L = require("./site/lib");
const { place } = L;
const { fs, path, ROOT, esc, avg, round, list, pct, aName, H, W, H1, W1, cm, inch, kg, lb, life, BREEDS, BY_ID, N,
  SIZES, SIZE_INFO, GROUPS, groupUrl, groupLabel, sizeUrl, sizeWord, COUNTRIES, countryUrl, cabin, CABIN, CABIN_MAX_DOG,
  share, nearest, bodyLandmark, bodyUnits, MALE, FEMALE, COLORS, scene, markdown, frontMatter, crumbs, page,
  breedCard, breedGrid, toolLink, spanH, spanW, faqBlock, slug } = L;
const { PAIRS_CURATED, GROUP_TEXT, COUNTRY_ADJ } = require("./site/content-data");
const AIRLINES = require(path.join(ROOT, "content/airlines.json"));

const OUT_DIRS = ["breeds", "compare", "sizes", "groups", "origins", "articles", "calculators", "about", "suggest-a-breed"];
const REPO = "neelzito/dogsizecomparison";
const pages = []; // { url, html, priority }
const emit = (url, html, priority = 0.6) => pages.push({ url, html, priority });
const today = new Date().toISOString().slice(0, 10);

// ======================================================================
// Comparison pairs
// ======================================================================
const pairKey = (a, b) => [a, b].sort().join("|");
const PAIRS = [];
const seenPairs = new Set();
function addPair(a, b, curated) {
  if (!BY_ID[a] || !BY_ID[b]) throw new Error(`unknown breed in pair ${a} / ${b}`);
  const k = pairKey(a, b);
  if (a === b || seenPairs.has(k)) return;
  seenPairs.add(k);
  PAIRS.push({ a: BY_ID[a], b: BY_ID[b], curated, url: `/compare/${a}-vs-${b}/` });
}
PAIRS_CURATED.forEach(([a, b]) => addPair(a, b, true));
// every breed gets at least its closest same-group neighbour
for (const b of BREEDS) {
  const [n] = nearest(b, 1, (x) => x.group === b.group);
  if (n) addPair(...[b.id, n.id].sort(), false);
}
const PAIRS_BY_BREED = {};
for (const p of PAIRS) for (const x of [p.a, p.b]) (PAIRS_BY_BREED[x.id] ||= []).push(p);
const other = (p, b) => (p.a === b ? p.b : p.a);

// reference dog used next to a breed on its page
// ---------- social preview images (rendered by tools/build_og.py) ----------
const OG_JOBS = [];
const rng = (r, f, u) => (f(r[0]) === f(r[1]) ? `${f(r[0])} ${u}` : `${f(r[0])}–${f(r[1])} ${u}`);
const ogDog = (b, hCm, name, sub, color, muted = false) => {
  const s = L.shapeOf(b);
  return { img: `img/dogs/web/${b.id}.webp`, maxX: +s.maxX.toFixed(4), maxY: +s.maxY.toFixed(4), hCm: +hCm.toFixed(2), name, sub, color, muted };
};
function ogJob(job) {
  if (job.dogs.some((g) => !fs.existsSync(path.join(ROOT, g.img)))) return undefined; // no illustration yet: keep the default image
  OG_JOBS.push(job);
  return "/" + job.out;
}
function breedOg(b, ref) {
  const sexLine = (s, lbl) => [[`${lbl}  ${rng(b[s].h, cm, "cm")} · ${rng(b[s].w, kg, "kg")}`, "fact"], [`${rng(b[s].h, inch, "in")} · ${rng(b[s].w, lb, "lb")}`, "small"]];
  return ogJob({
    out: `img/og/breeds/${b.id}.png`, kind: "breed", kicker: "Dog breed size", title: b.name,
    lines: [...(b.sameSexes ? sexLine("m", "Adults") : [...sexLine("m", "Males"), ...sexLine("f", "Females")]),
      [`${b.size} · ${b.group === "Designer / Mixed" ? "Designer breed" : `${b.group} group`}`, "small"]],
    dogs: [ogDog(b, avg(b.m.h), b.name, `${cm(avg(b.m.h))} cm · ${kg(avg(b.m.w))} kg`, "#c2562b"),
      ogDog(ref, avg(ref.m.h), ref.name, `${cm(avg(ref.m.h))} cm · ${kg(avg(ref.m.w))} kg`, "#8c857a", true)],
  });
}
function compareOg(A, B, url) {
  return ogJob({
    out: `img/og${url.replace(/\/$/, "")}.png`, kind: "compare", kicker: "", title: `${A.name} vs ${B.name}`,
    lines: [["Drawn to scale", "fact"], ["average adult males", "fact"]],
    dogs: [A, B].map((x, i) => ogDog(x, avg(x.m.h), x.name, `${cm(avg(x.m.h))} cm (${inch(avg(x.m.h))} in) · ${kg(avg(x.m.w))} kg`, COLORS[i])),
  });
}

const refFor = (b) => (b.id === "labrador-retriever" ? BY_ID["golden-retriever"] : BY_ID["labrador-retriever"]);

// ======================================================================
// Breed pages
// ======================================================================
const sizeLifeAvg = Object.fromEntries(SIZES.map((s) => { const bs = BREEDS.filter((b) => b.size === s); return [s, bs.reduce((t, b) => t + b.lifeAvg, 0) / bs.length]; }));

const ordinal = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th");
const byHeight = [...BREEDS].sort((a, b) => b.hAvg - a.hAvg);
const byWeight = [...BREEDS].sort((a, b) => b.wAvg - a.wAvg);
/** "the tallest", "the 3rd tallest", "the 2nd shortest" or null in the middle of the field */
function heightRank(b) {
  const i = byHeight.indexOf(b) + 1, j = N - i + 1;
  if (i <= 10) return i === 1 ? "the tallest" : `the ${ordinal(i)} tallest`;
  if (j <= 10) return j === 1 ? "the shortest" : `the ${ordinal(j)} shortest`;
  return null;
}
function breedIntro(b) {
  const hS = share(b, "hAvg"), wS = share(b, "wAvg");
  const s = [];
  s.push(`The ${b.name} is ${L.article(sizeWord(b))} ${sizeWord(b)} dog breed from ${place(b.origin)}, in ${groupLabel(b.group)}.`);
  s.push(b.sameSexes
    ? `Adults stand ${H(b.m.h)} at the shoulder and weigh ${W(b.m.w)}; the breed standard gives the same range for males and females.`
    : `Males stand ${H(b.m.h)} at the shoulder and weigh ${W(b.m.w)}. Females stand ${H(b.f.h)} and weigh ${W(b.f.w)}.`);
  const rk = heightRank(b);
  if (rk) s.push(`On average that makes it ${rk} of the ${N} breeds on this site.`);
  else {
    const wi = byWeight.indexOf(b) + 1, wj = N - wi + 1;
    const heavy = wi <= 10 ? `it is ${wi === 1 ? "the heaviest" : `the ${ordinal(wi)} heaviest`} breed` : wj <= 10 ? `it is ${wj === 1 ? "the lightest" : `the ${ordinal(wj)} lightest`} breed` : `it is heavier than ${pct(wS)}`;
    s.push(`On average it is taller than ${pct(hS)} of the ${N} breeds on this site, and ${heavy}.`);
  }
  s.push(`At the shoulder, an average ${b.sameSexes ? "" : "male "}${b.name} reaches ${bodyLandmark(avg(b.m.h))} on a 175 cm (5′9″) adult.`);
  return s.join(" ");
}
function lifeText(b) {
  const d = b.lifeAvg - sizeLifeAvg[b.size];
  const rel = Math.abs(d) < 0.6 ? `about average for ${b.size.toLowerCase()} breeds` : `${d > 0 ? "longer" : "shorter"} than the ${round(sizeLifeAvg[b.size], 1)}-year average for ${b.size.toLowerCase()} breeds`;
  return `Typical life expectancy is ${life(b.life)}, ${rel}.`;
}
function cabinText(b) {
  const c = cabin(b);
  if (c === "yes") return `At ${W(spanW(b))}, it fits even the strictest airline cabin rule, where dog and carrier together may weigh ${CABIN.limitKg} kg (17.6 lb).`;
  if (c === "some") return `Lighter individuals fit airline cabin limits of ${CABIN.limitKg} kg (17.6 lb) for dog and carrier; heavier ones need an airline that weighs only the carrier size, or travel in the hold.`;
  if (b.size === "Small" || b.size === "Medium") return `It is too heavy for airlines that cap dog and carrier at ${CABIN.limitKg} kg (17.6 lb), so it usually flies in the hold unless the airline only checks the carrier size.`;
  return "";
}
function sexText(b) {
  if (b.sameSexes) return "";
  const dh = avg(b.m.h) - avg(b.f.h), dw = avg(b.m.w) / avg(b.f.w) - 1;
  if (Math.abs(dh) < 0.5 && Math.abs(dw) < 0.03) return `Males and females are practically the same size.`;
  const hPart = Math.abs(dh) < 0.5 ? "about the same height as" : `${round(Math.abs(dh), 1)} cm (${inch(Math.abs(dh))} in) ${dh >= 0 ? "taller than" : "shorter than"}`;
  const wPart = Math.abs(dw) < 0.03 ? "weighs about the same" : `is ${pct(Math.abs(dw))} ${dw >= 0 ? "heavier" : "lighter"}`;
  return `An average male is ${hPart} an average female and ${wPart}.`;
}

function breedPage(b) {
  const url = b.url;
  const ref = refFor(b);
  const sexes = b.sameSexes ? [["m", "Adult"]] : [["m", "Male"], ["f", "Female"]];
  const dogs = sexes.map(([s, lbl]) => ({ b, hCm: avg(b[s].h), label: `${b.name}${b.sameSexes ? "" : ` ${s === "m" ? "♂" : "♀"}`}`, sub: `${cm(avg(b[s].h))} cm · ${kg(avg(b[s].w))} kg`, color: s === "m" ? MALE : FEMALE, dashed: s === "f" }));
  dogs.push({ b: ref, hCm: avg(ref.m.h), label: `${ref.name} ♂`, sub: `${cm(avg(ref.m.h))} cm · ${kg(avg(ref.m.w))} kg`, color: "#8c857a" });
  const similar = nearest(b, 6);
  const sameGroup = BREEDS.filter((x) => x.group === b.group && x !== b).sort((x, y) => L.distance(b, x) - L.distance(b, y)).slice(0, 12);
  const pairs = PAIRS_BY_BREED[b.id] || [];
  const custom = path.join(ROOT, "content/breeds", `${b.id}.md`);
  const handWritten = fs.existsSync(custom) ? markdown(frontMatter(fs.readFileSync(custom, "utf8")).body) : "";
  const cr = crumbs([["/", "Home"], ["/breeds/", "Breeds"], [sizeUrl(b.size), `${b.size} dogs`], [url, b.name]]);
  const c = cabin(b);
  const cu = countryUrl(b.country);

  const faq = [
    [`How big does ${aName(b)} get?`, b.sameSexes
      ? `An adult ${b.name} stands ${H(b.m.h)} tall at the shoulder (withers) and weighs ${W(b.m.w)}.`
      : `A fully grown male ${b.name} stands ${H(b.m.h)} at the shoulder (withers) and weighs ${W(b.m.w)}. Females stand ${H(b.f.h)} and weigh ${W(b.f.w)}.`],
    [`Is ${aName(b)} a small, medium or large dog?`, `With an average weight of about ${W1(b.wAvg)}, the ${b.name} counts as ${L.article(b.size)} ${b.size.toLowerCase()} dog breed on this site (${b.size.toLowerCase()} = ${SIZE_INFO[b.size].limit} on average). ${heightRank(b) ? `It is ${heightRank(b)} of the ${N} breeds listed.` : `It is taller than ${pct(share(b, "hAvg"))} of the ${N} breeds listed.`}`],
    [`How long does ${aName(b)} live?`, `${lifeText(b)}`],
    [`Can ${aName(b)} fly in the airplane cabin?`, c === "yes" ? `Usually yes. ${cabinText(b)} Check your airline's rules and carrier size limits before booking.`
      : c === "some" ? `Sometimes. ${cabinText(b)} Rules vary by airline, so check before booking.`
      : `Usually not. A ${b.name} weighs ${W(spanW(b))}, well over the ${CABIN.limitKg} kg (17.6 lb) cabin limit many airlines set for dog and carrier, and is too big for an under-seat carrier. Most airlines fly dogs this size in the hold (cargo).`],
  ];
  const fq = faqBlock(faq, `${b.name} size: common questions`);

  const facts = [
    ["Height", b.sameSexes ? H(b.m.h) : `♂ ${H(b.m.h)}<br>♀ ${H(b.f.h)}`],
    ["Weight", b.sameSexes ? W(b.m.w) : `♂ ${W(b.m.w)}<br>♀ ${W(b.f.w)}`],
    ["Size class", `<a href="${sizeUrl(b.size)}">${b.size}</a>`],
    ["Group", `<a href="${groupUrl(b.group)}">${esc(b.group)}</a>`],
    ["Origin", cu ? `<a href="${cu}">${esc(b.origin)}</a>` : esc(b.origin)],
    ["Life span", life(b.life)],
    ["Airplane cabin", c === "yes" ? `<span class="cabin cabin-yes">✈ Fits</span>` : c === "some" ? `<span class="cabin cabin-some">✈ Lighter dogs</span>` : `Over ${CABIN.limitKg} kg limit`],
    ["Height rank", `${ordinal(byHeight.indexOf(b) + 1)} of ${N}`],
  ];
  const SRC_NAME = { AKC: "American Kennel Club (AKC)", FCI: "FCI", UKC: "United Kennel Club (UKC)", PTCA: "PTCA", RSCE: "Real Sociedad Canina de España (RSCE)" };
  const srcLine = !b.source ? "" : b.source.src === "Typical"
    ? `There is no official breed standard, so these are typical ranges.${b.source.note ? ` ${b.source.note}` : ""}`
    : `Sizes follow the ${SRC_NAME[b.source.src] || b.source.src} breed standard.${b.source.note ? ` ${b.source.note}` : ""}`;

  const sexTable = b.sameSexes ? "" : `<div class="table-scroll"><table class="data-table"><thead><tr><th></th><th class="sex-m">♂ Male</th><th class="sex-f">♀ Female</th></tr></thead><tbody>
    <tr><td>Height (min–max)</td><td>${H(b.m.h)}</td><td>${H(b.f.h)}</td></tr>
    <tr><td>Average height</td><td>${H1(avg(b.m.h))}</td><td>${H1(avg(b.f.h))}</td></tr>
    <tr><td>Weight (min–max)</td><td>${W(b.m.w)}</td><td>${W(b.f.w)}</td></tr>
    <tr><td>Average weight</td><td>${W1(avg(b.m.w))}</td><td>${W1(avg(b.f.w))}</td></tr></tbody></table></div>`;

  const body = `${cr.html}
<header class="page-head">
  <h1>${esc(b.name)} size</h1>
  <p class="lede">${esc(b.name)}: ${sizeWord(b)} ${esc(b.group === "Designer / Mixed" ? "designer" : b.group.toLowerCase())} dog from ${esc(place(b.origin))}. ${b.aliases.length ? `Also known as ${esc(L.list(b.aliases))}. ` : ""}Height, weight and how it compares, drawn to scale.</p>
</header>
<section class="card">
  ${scene(dogs, { title: `${b.name} drawn to scale next to a 175 cm person and a ${ref.name}` })}
  <p class="scene-note">Drawn to scale at average height, next to a 175 cm (5′9″) person and an average male ${esc(ref.name)}. Height is measured at the withers (top of the shoulder).</p>
  <div class="cta-row"><a class="btn" href="${toolLink([[b.id, "both"], [ref.id, "m"]])}">Compare the ${esc(b.name)} with other breeds →</a></div>
</section>
<section class="facts">${facts.map(([k, v]) => `<div class="fact"><span class="fact-k">${k}</span><span class="fact-v">${v}</span></div>`).join("")}</section>
<div class="cols">
<article class="prose">
  <h2>How big is ${aName(b)}?</h2>
  <p>${esc(breedIntro(b))}</p>
  <p>${esc([lifeText(b), cabinText(b)].filter(Boolean).join(" "))}</p>
  ${b.sameSexes ? "" : `<h2>Male vs female ${esc(b.name)}</h2><p>${esc(sexText(b))}</p>${sexTable}`}
  ${srcLine ? `<p class="src-note">${esc(srcLine)}</p>` : ""}
  ${handWritten ? `<h2>About the ${esc(b.name)}</h2>${handWritten}` : ""}
</article>
<aside class="side">
  ${pairs.length ? `<div class="card"><h2>${esc(b.name)} comparisons</h2><ul class="link-list">${pairs.map((p) => `<li><a href="${p.url}">${esc(p.a.name)} vs ${esc(p.b.name)}</a></li>`).join("")}</ul></div>` : ""}
  <div class="card"><h2>${esc(b.name)} calculators</h2><ul class="link-list"><li><a href="/calculators/puppy-weight/?breed=${b.id}">How big will my ${esc(b.name)} puppy get?</a></li><li><a href="/calculators/crate-size/?breed=${b.id}">Crate size for ${aName(b)}</a></li>${b.size === "Toy" || b.size === "Small" ? `<li><a href="/calculators/airline-cabin/?breed=${b.id}">Can ${aName(b)} fly in the cabin?</a></li>` : ""}<li><a href="/calculators/dog-years/?breed=${b.id}">${esc(b.name)} age in human years</a></li></ul></div>
  <div class="card"><h2>More ${esc(b.group === "Designer / Mixed" ? "designer breeds" : `${b.group} breeds`)}</h2><ul class="link-list">${sameGroup.map((x) => `<li><a href="${x.url}">${esc(x.name)}</a></li>`).join("")}</ul><p><a href="${groupUrl(b.group)}">All ${esc(b.group === "Designer / Mixed" ? "designer & mixed" : b.group)} breeds →</a></p></div>
</aside>
</div>
<section>
  <h2 class="sec-h">Breeds of a similar size</h2>
  ${breedGrid(similar)}
  <p><a href="${toolLink([[b.id, "m"], ...similar.map((x) => [x.id, "m"])])}">See all ${similar.length + 1} side by side in the comparison tool →</a></p>
</section>
${fq.html}
<aside class="disclaimer" role="note">Sizes are breed-standard ranges for adult dogs; individual dogs, working lines and dogs from different countries can be bigger or smaller. Airline notes are a general guide only. Check with your airline and your vet. <a href="/about/#disclaimer">Disclaimer</a>.</aside>`;
  emit(url, page({
    url, current: "/breeds/",
    title: `${b.name} Size: Height & Weight${b.sameSexes ? "" : ", Male vs Female"}`,
    description: `How big is ${aName(b)}${b.aliases.length ? ` (${b.aliases[0]})` : ""}? ${b.sameSexes ? `Adults stand ${H(b.m.h)} and weigh ${W(b.m.w)}.` : `Males stand ${H(b.m.h)} and weigh ${W(b.m.w)}; females ${H(b.f.h)}, ${W(b.f.w)}.`} Drawn to scale next to a person.`,
    body, ld: [cr.ld, fq.ld], ogImage: breedOg(b, ref), ogAlt: `${b.name} drawn to scale next to a ${ref.name}`,
  }), 0.7);
}

// ======================================================================
// Comparison pages
// ======================================================================
function compareSentences(A, B) {
  const s = [];
  const hA = avg(A.m.h), hB = avg(B.m.h), wA = avg(A.m.w), wB = avg(B.m.w);
  const [tall, short, ht, hs] = hA >= hB ? [A, B, hA, hB] : [B, A, hB, hA];
  const d = ht - hs;
  if (d < 2) s.push(`The ${A.name} and the ${B.name} are almost the same height at the shoulder: an average male ${A.name} stands ${H1(hA)} and an average male ${B.name} ${H1(hB)}.`);
  else s.push(`The ${tall.name} is the taller dog. An average male stands ${H1(ht)} at the shoulder, ${round(d, 1)} cm (${inch(d)} in) more than an average male ${short.name} at ${H1(hs)}${ht / hs >= 1.25 ? `, about ${round(ht / hs, 1)}× the height` : ""}.`);
  const [hv, lt, wh, wl] = wA >= wB ? [A, B, wA, wB] : [B, A, wB, wA];
  const r = wh / wl;
  if (r < 1.1) s.push(`They weigh about the same: ${W1(wA)} for an average male ${A.name} and ${W1(wB)} for a ${B.name}.`);
  else s.push(`By weight, the ${hv.name} is ${r < 1.95 ? `about ${pct(r - 1)} heavier` : `about ${r >= 10 ? Math.round(r) : round(r, 1)}× as heavy`}: ${W1(wh)} for an average male against ${W1(wl)} for the ${lt.name}.`);
  if (A.group === B.group) s.push(`Both are in ${groupLabel(A.group)}${A.country === B.country ? ` and come from ${place(A.country)}` : ""}.`);
  else s.push(`The ${A.name} belongs to ${groupLabel(A.group)} and comes from ${place(A.origin)}; the ${B.name} is in ${groupLabel(B.group)}, from ${place(B.origin)}.`);
  const dl = A.lifeAvg - B.lifeAvg;
  s.push(Math.abs(dl) < 1 ? `Their life expectancy is similar (${life(A.life)} and ${life(B.life)}).` : `The ${dl > 0 ? A.name : B.name} tends to live longer: ${life(dl > 0 ? A.life : B.life)} against ${life(dl > 0 ? B.life : A.life)}.`);
  const cA = cabin(A), cB = cabin(B);
  if (cA !== cB && (cA !== "no" || cB !== "no")) {
    const fits = cA === "yes" ? A : cB === "yes" ? B : cA === "some" ? A : B;
    s.push(`For air travel, the ${fits.name} ${cabin(fits) === "yes" ? "fits" : "can sometimes fit"} the ${CABIN.limitKg} kg cabin limit for dog and carrier; the ${other({ a: A, b: B }, fits).name} ${cabin(other({ a: A, b: B }, fits)) === "no" ? "does not" : "only sometimes does"}.`);
  }
  return s;
}

function comparePage(p) {
  const { a: A, b: B, url } = p;
  const dogs = [];
  [[A, COLORS[0]], [B, COLORS[1]]].forEach(([x, col]) => {
    const sexes = x.sameSexes ? ["m"] : ["m", "f"];
    for (const s of sexes) dogs.push({ b: x, hCm: avg(x[s].h), label: `${x.name}${x.sameSexes ? "" : s === "m" ? " ♂" : " ♀"}`, sub: `${cm(avg(x[s].h))} cm · ${kg(avg(x[s].w))} kg`, color: col, dashed: s === "f" });
  });
  const cr = crumbs([["/", "Home"], ["/compare/", "Comparisons"], [url, `${A.name} vs ${B.name}`]]);
  const sentences = compareSentences(A, B);
  const row = (k, fa, fb) => `<tr><td>${k}</td><td>${fa}</td><td>${fb}</td></tr>`;
  const cabinLbl = (x) => ({ yes: "✈ Fits", some: "✈ Lighter dogs only", no: `Over ${CABIN.limitKg} kg limit` }[cabin(x)]);
  const table = `<div class="table-scroll"><table class="data-table cmp-table"><thead><tr><th></th><th><a href="${A.url}">${esc(A.name)}</a></th><th><a href="${B.url}">${esc(B.name)}</a></th></tr></thead><tbody>
    ${row("Height ♂", H(A.m.h), H(B.m.h))}${row("Height ♀", H(A.f.h), H(B.f.h))}
    ${row("Weight ♂", W(A.m.w), W(B.m.w))}${row("Weight ♀", W(A.f.w), W(B.f.w))}
    ${row("Size class", `<a href="${sizeUrl(A.size)}">${A.size}</a>`, `<a href="${sizeUrl(B.size)}">${B.size}</a>`)}
    ${row("Group", `<a href="${groupUrl(A.group)}">${esc(A.group)}</a>`, `<a href="${groupUrl(B.group)}">${esc(B.group)}</a>`)}
    ${row("Origin", esc(A.origin), esc(B.origin))}${row("Life span", life(A.life), life(B.life))}
    ${row("Airplane cabin", cabinLbl(A), cabinLbl(B))}</tbody></table></div>`;
  const hA = avg(A.m.h), hB = avg(B.m.h);
  const bigger = hA >= hB ? A : B, smaller = bigger === A ? B : A;
  const faq = faqBlock([
    [`Which is bigger, the ${A.name} or the ${B.name}?`, sentences[0]],
    [`How much does ${aName(A)} weigh compared with ${aName(B)}?`, `A male ${A.name} weighs ${W(A.m.w)} and a female ${W(A.f.w)}. A male ${B.name} weighs ${W(B.m.w)} and a female ${W(B.f.w)}.`],
  ], `${A.name} vs ${B.name}: questions`);
  const more = (x) => (PAIRS_BY_BREED[x.id] || []).filter((q) => q !== p).slice(0, 8);
  const moreList = (x) => more(x).length ? `<div class="card"><h2>More ${esc(x.name)} comparisons</h2><ul class="link-list">${more(x).map((q) => `<li><a href="${q.url}">${esc(x.name)} vs ${esc(other(q, x).name)}</a></li>`).join("")}</ul></div>` : "";
  const body = `${cr.html}
<header class="page-head"><h1>${esc(A.name)} vs ${esc(B.name)}: size comparison</h1>
<p class="lede">${esc(bigger.name)} or ${esc(smaller.name)}? Heights at the shoulder, weights for males and females, and both breeds drawn to scale next to a person.</p></header>
<section class="card">
  ${scene(dogs, { title: `${A.name} and ${B.name} drawn to scale` })}
  <p class="scene-note">Average male and female of each breed, drawn to scale next to a 175 cm (5′9″) person. Solid line = male, dashed = female.</p>
  <div class="cta-row"><a class="btn" href="${toolLink([[A.id, "both"], [B.id, "both"]])}">Open in the comparison tool →</a></div>
</section>
<div class="cols">
<article class="prose">
  <h2>How the two breeds compare</h2>
  ${sentences.map((t) => `<p>${esc(t)}</p>`).join("")}
  <h2>Side by side</h2>
  ${table}
</article>
<aside class="side">
  <div class="card"><h2>Breed pages</h2>${breedCard(A)}${breedCard(B)}</div>
  ${moreList(A)}${moreList(B)}
</aside>
</div>
${faq.html}`;
  emit(url, page({
    url, current: "/compare/",
    title: `${A.name} vs ${B.name} Size Comparison`,
    description: `${A.name} vs ${B.name}: ${sentences[0]} See both breeds to scale with male and female heights and weights.`.slice(0, 300),
    body, ld: [cr.ld, faq.ld], ogImage: compareOg(A, B, url), ogAlt: `${A.name} and ${B.name} drawn to scale side by side`,
  }), p.curated ? 0.6 : 0.5);
}

function compareIndex() {
  const url = "/compare/";
  const cr = crumbs([["/", "Home"], [url, "Comparisons"]]);
  const li = (p) => `<li><a href="${p.url}">${esc(p.a.name)} vs ${esc(p.b.name)}</a></li>`;
  const byGroup = GROUPS.map((g) => [g, PAIRS.filter((p) => !p.curated && p.a.group === g)]).filter(([, ps]) => ps.length);
  const body = `${cr.html}
<header class="page-head"><h1>Dog breed size comparisons</h1>
<p class="lede">${PAIRS.length} head-to-head comparisons of popular and look-alike breeds, each drawn to scale. Want a different pair? <a href="/">Build your own comparison</a> with up to 10 breeds.</p></header>
<section class="card"><h2>Popular comparisons</h2><ul class="link-cols">${PAIRS.filter((p) => p.curated).map(li).join("")}</ul></section>
${byGroup.map(([g, ps]) => `<section class="card"><h2>${esc(g === "Designer / Mixed" ? "Designer & mixed breeds" : `${g} group`)}</h2><ul class="link-cols">${ps.map(li).join("")}</ul></section>`).join("\n")}`;
  emit(url, page({ url, current: url, title: "Dog Breed Size Comparisons: Which Breed Is Bigger?", description: `${PAIRS.length} side-by-side dog breed size comparisons, drawn to scale, with heights and weights for males and females.`, body, ld: [cr.ld] }), 0.8);
}

// ======================================================================
// Collections: breeds index, sizes, groups, origins
// ======================================================================
function spread(bs, n) {
  if (bs.length <= n) return bs;
  return Array.from({ length: n }, (_, i) => bs[Math.round((i * (bs.length - 1)) / (n - 1))]);
}
function collectionScene(bs, title) {
  const pick = spread([...bs].sort((a, b) => b.hAvg - a.hAvg), 6);
  return scene(pick.map((b, i) => ({ b, hCm: avg(b.m.h), label: b.name, sub: `${cm(avg(b.m.h))} cm`, color: COLORS[i] })), { title, human: pick[0].hAvg > 25 ? 175 : 0 });
}
function collectionPage({ url, title, h1, lede, intro, bs, related, crumbLabel, parent, desc }) {
  const sorted = [...bs].sort((a, b) => b.hAvg - a.hAvg);
  const cr = crumbs([["/", "Home"], parent, [url, crumbLabel]]);
  const tall = sorted[0], short = sorted[sorted.length - 1];
  const heavy = [...bs].sort((a, b) => b.wAvg - a.wAvg)[0], light = [...bs].sort((a, b) => a.wAvg - b.wAvg)[0];
  const stats = bs.length > 2 ? `<p>The tallest is the <a href="${tall.url}">${esc(tall.name)}</a> (males ${H(tall.m.h)}) and the shortest the <a href="${short.url}">${esc(short.name)}</a> (${H(short.m.h)}). The heaviest is the <a href="${heavy.url}">${esc(heavy.name)}</a> at up to ${W1(heavy.m.w[1])}; the lightest the <a href="${light.url}">${esc(light.name)}</a> at ${W(light.m.w)}.</p>` : "";
  const body = `${cr.html}
<header class="page-head"><h1>${esc(h1)}</h1><p class="lede">${lede}</p></header>
<section class="card">${collectionScene(bs, h1)}<p class="scene-note">A selection from tallest to shortest, average males drawn to scale${sorted[0].hAvg > 25 ? " next to a 175 cm (5′9″) person" : ""}.</p>
<div class="cta-row"><a class="btn" href="${toolLink(spread(sorted, 10).map((b) => [b.id, "m"]))}">Compare these in the tool →</a></div></section>
<article class="prose">${intro}${stats}</article>
<section><h2 class="sec-h">All ${bs.length} breeds, tallest first</h2>${breedGrid(sorted)}</section>
${related ? `<section class="card"><h2>Related lists</h2><ul class="link-cols">${related}</ul></section>` : ""}`;
  emit(url, page({ url, current: "/breeds/", title, description: desc, body, ld: [cr.ld, { "@type": "ItemList", itemListElement: sorted.map((b, i) => ({ "@type": "ListItem", position: i + 1, url: L.SITE + b.url, name: b.name })) }] }), 0.7);
}

function sizePages() {
  for (const s of SIZES) {
    const bs = BREEDS.filter((b) => b.size === s);
    const info = SIZE_INFO[s];
    const nCabin = bs.filter((b) => cabin(b) !== "no").length;
    const intro = `<p>On this site a breed is <strong>${s.toLowerCase()}</strong> when its average adult weight, males and females together, is ${info.limit}. ${bs.length} of the ${N} breeds fall in this class. Kennel clubs and vets use slightly different cut-offs, so a breed near the edge may be called ${s === "Toy" ? "small" : s === "Giant" ? "large" : "the next size up or down"} elsewhere; see <a href="/articles/dog-size-classes-explained/">dog size classes explained</a>.</p>`
      + (nCabin ? `<p>${nCabin} of them ${nCabin === bs.length ? "all" : ""} fit, at least as lighter individuals, the ${CABIN.limitKg} kg airline cabin limit for dog and carrier. More in <a href="/articles/flying-with-a-dog-in-the-cabin/">flying with a dog in the cabin</a>.</p>` : "")
      + `<p>Typical life expectancy for ${s.toLowerCase()} breeds here averages ${round(sizeLifeAvg[s], 1)} years.</p>`;
    collectionPage({
      url: sizeUrl(s), crumbLabel: `${s} dogs`, parent: ["/breeds/", "Breeds"],
      title: `${s} Dog Breeds: ${bs.length} Breeds by Height & Weight`,
      h1: `${s} dog breeds`, lede: `${bs.length} ${info.blurb}, averaging ${info.limit} as adults. Sorted by height with male and female figures.`,
      desc: `All ${bs.length} ${s.toLowerCase()} dog breeds (${info.limit}) with heights and weights for males and females, drawn to scale.`,
      intro, bs,
      related: SIZES.filter((x) => x !== s).map((x) => `<li><a href="${sizeUrl(x)}">${x} dog breeds</a></li>`).join(""),
    });
  }
}
function groupPages() {
  for (const g of GROUPS) {
    const bs = BREEDS.filter((b) => b.group === g);
    const label = g === "Designer / Mixed" ? "Designer & mixed" : g;
    const counts = SIZES.map((s) => [s, bs.filter((b) => b.size === s).length]).filter(([, n]) => n);
    collectionPage({
      url: groupUrl(g), crumbLabel: label, parent: ["/breeds/", "Breeds"],
      title: `${label} Dog Breeds by Size: Heights & Weights`,
      h1: g === "Designer / Mixed" ? "Designer & mixed breeds by size" : `${g} group dog breeds by size`,
      lede: `${bs.length} breeds, from the ${esc([...bs].sort((a, b) => b.hAvg - a.hAvg)[0].name)} down to the ${esc([...bs].sort((a, b) => a.hAvg - b.hAvg)[0].name)}.`,
      desc: `Sizes of all ${bs.length} ${label.toLowerCase()} dog breeds: heights at the shoulder and weights for males and females, drawn to scale.`,
      intro: `<p>${GROUP_TEXT[g]}</p><p>By size the group has ${list(counts.map(([s, n]) => `${n} ${s.toLowerCase()}`))} breed${bs.length > 1 ? "s" : ""}.</p>`,
      bs,
      related: GROUPS.filter((x) => x !== g).map((x) => `<li><a href="${groupUrl(x)}">${esc(x === "Designer / Mixed" ? "Designer & mixed" : `${x} group`)}</a></li>`).join(""),
    });
  }
}
function originPages() {
  for (const c of COUNTRIES) {
    const bs = BREEDS.filter((b) => b.country === c);
    const adj = COUNTRY_ADJ[c] || c;
    collectionPage({
      url: countryUrl(c), crumbLabel: `${adj} breeds`, parent: ["/breeds/", "Breeds"],
      title: `${adj} Dog Breeds by Size (${bs.length} Breeds)`,
      h1: `${adj} dog breeds`, lede: `${bs.length} breeds from ${esc(place(c))}, sorted by height.`,
      desc: `${bs.length} dog breeds from ${place(c)}, from the ${[...bs].sort((a, b) => b.hAvg - a.hAvg)[0].name} to the ${[...bs].sort((a, b) => a.hAvg - b.hAvg)[0].name}, with heights and weights.`,
      intro: `<p>${bs.length} of the breeds on this site trace their origin to ${esc(place(c))}: ${list(SIZES.map((s) => [s, bs.filter((b) => b.size === s).length]).filter(([, n]) => n).map(([s, n]) => `${n} ${s.toLowerCase()}`))}. Breeds with a shared or disputed origin are listed under the first country named in their standard.</p>`,
      bs,
      related: COUNTRIES.filter((x) => x !== c).map((x) => `<li><a href="${countryUrl(x)}">${esc(COUNTRY_ADJ[x] || x)} breeds</a></li>`).join(""),
    });
  }
}
function breedsIndex() {
  const url = "/breeds/";
  const cr = crumbs([["/", "Home"], [url, "Breeds"]]);
  const letters = [...new Set(BREEDS.map((b) => b.name[0].toUpperCase()))];
  const body = `${cr.html}
<header class="page-head"><h1>All ${N} dog breeds by size</h1><p class="lede">Every breed on the site with its height at the shoulder and weight for males (♂) and females (♀). Open a breed for its full size profile, or browse by size, group or country.</p></header>
<section class="card"><h2>Browse by size</h2><div class="pill-row">${SIZES.map((s) => `<a class="pill-link" href="${sizeUrl(s)}">${s} <span>${BREEDS.filter((b) => b.size === s).length}</span></a>`).join("")}</div>
<h2>By group</h2><div class="pill-row">${GROUPS.map((g) => `<a class="pill-link" href="${groupUrl(g)}">${esc(g === "Designer / Mixed" ? "Designer & mixed" : g)} <span>${BREEDS.filter((b) => b.group === g).length}</span></a>`).join("")}</div>
<h2>By country</h2><div class="pill-row">${COUNTRIES.map((c) => `<a class="pill-link" href="${countryUrl(c)}">${esc(c)} <span>${BREEDS.filter((b) => b.country === c).length}</span></a>`).join("")}</div></section>
<nav class="az" aria-label="Jump to letter">${letters.map((l) => `<a href="#${l}">${l}</a>`).join("")}</nav>
${letters.map((l) => `<section id="${l}" class="az-sec"><h2 class="sec-h">${l}</h2>${breedGrid(BREEDS.filter((b) => b.name[0].toUpperCase() === l))}</section>`).join("\n")}
<aside class="card suggest-cta"><h2>Missing a breed?</h2><p>We add breeds people ask for. <a href="/suggest-a-breed/">Suggest a breed →</a></p></aside>`;
  emit(url, page({ url, current: url, title: `All ${N} Dog Breeds by Size: Heights & Weights A–Z`, description: `Heights and weights of ${N} dog breeds, A–Z, for males and females. Browse by size class, breed group or country of origin.`, body, ld: [cr.ld] }), 0.9);
}

// ======================================================================
// Articles
// ======================================================================
const ARTICLES = []; // { url, title, description, date }
function rankedArticle({ slug: s, title, h1, description, lede, intro, ranked, n, sceneN = 5, human = true, itemText, outro = "" }) {
  const url = `/articles/${s}/`;
  const top = ranked.slice(0, n);
  const cr = crumbs([["/", "Home"], ["/articles/", "Articles"], [url, h1]]);
  const sc = scene(top.slice(0, sceneN).map((b, i) => ({ b, hCm: avg(b.m.h), label: `${i + 1}. ${b.name}`, sub: `${cm(avg(b.m.h))} cm · ${kg(avg(b.m.w))} kg`, color: COLORS[i] })), { title: h1, human: human ? 175 : 0 });
  const items = top.map((b, i) => `<li class="rank-item" id="${b.id}"><div class="rank-head"><span class="rank-n">${i + 1}</span><h3><a href="${b.url}">${esc(b.name)}</a></h3></div>
    <div class="rank-body"><img src="${b.img}" alt="${esc(b.name)}" loading="lazy" decoding="async" width="140" height="96"><div><p class="rank-st">${b.sameSexes ? `${H(b.m.h)} · ${W(b.m.w)}` : `♂ ${H(b.m.h)} · ${W(b.m.w)}<br>♀ ${H(b.f.h)} · ${W(b.f.w)}`} · ${life(b.life)}</p><p>${esc(itemText(b, i))}</p></div></div></li>`).join("");
  const body = `${cr.html}
<header class="page-head"><h1>${esc(h1)}</h1><p class="lede">${lede}</p><p class="byline">Updated ${today} · Data from kennel-club breed standards</p></header>
<section class="card">${sc}<p class="scene-note">The top ${Math.min(sceneN, n)}, average males drawn to scale${human ? " next to a 175 cm (5′9″) person" : ""}.</p>
<div class="cta-row"><a class="btn" href="${toolLink(top.slice(0, 10).map((b) => [b.id, "m"]))}">Compare the top 10 in the tool →</a></div></section>
<article class="prose">${intro}<ol class="rank-list">${items}</ol>${outro}</article>`;
  ARTICLES.push({ url, title: h1, description, date: today });
  emit(url, page({ url, current: "/articles/", title, description, body, ld: [cr.ld, { "@type": "Article", headline: h1, dateModified: today, author: { "@type": "Organization", name: L.SITE_NAME }, publisher: { "@type": "Organization", name: "MILIVON" }, copyrightHolder: { "@type": "Organization", name: "MILIVON" } }, { "@type": "ItemList", itemListElement: top.map((b, i) => ({ "@type": "ListItem", position: i + 1, url: L.SITE + b.url, name: b.name })) }] }), 0.7);
}

function rankedArticles() {
  const byW = [...BREEDS].sort((a, b) => a.wAvg - b.wAvg);
  rankedArticle({
    slug: "smallest-dog-breeds", n: 15, human: false,
    title: "The 15 Smallest Dog Breeds in the World, Ranked",
    h1: "The 15 smallest dog breeds",
    description: `The smallest dog breeds ranked by average adult weight, from the ${byW[0].name} up, with heights and weights for males and females.`,
    lede: "Ranked by average adult weight, the fairest single measure of how small a dog is. Every one of them fits in an airline cabin carrier.",
    intro: `<p>Height and weight don't always agree: a long, low dog like the Miniature Dachshund is among the shortest breeds but outweighs many toy breeds. This list ranks by <strong>average weight</strong> of males and females. For height alone, see the <a href="/sizes/toy/">toy breeds sorted by height</a>.</p>`,
    ranked: byW,
    itemText: (b, i) => `${i === 0 ? "The smallest breed of all. " : ""}The ${b.name} weighs ${W(spanW(b))} and stands ${H(spanH(b))} at the shoulder, ${bodyLandmark(b.hAvg)} on an adult. ${b.group === "Toy" ? "Part of the Toy group" : `Listed in ${groupLabel(b.group)}`}, from ${place(b.origin)}.`,
    outro: `<h2>Small, but not fragile</h2><p>Very small dogs need care around stairs, sofas and children, and they lose heat quickly. They also tend to live longest: the toy breeds here average ${round(sizeLifeAvg.Toy, 1)} years. See the <a href="/articles/longest-living-dog-breeds/">longest-living breeds</a>.</p>`,
  });
  const byH = [...BREEDS].sort((a, b) => b.hAvg - a.hAvg);
  rankedArticle({
    slug: "tallest-dog-breeds", n: 15,
    title: "The 15 Tallest Dog Breeds, Ranked by Height",
    h1: "The 15 tallest dog breeds",
    description: `The tallest dog breeds ranked by height at the shoulder, led by the ${byH[0].name}, drawn to scale next to a person.`,
    lede: "Ranked by average height at the withers (top of the shoulder), males and females together.",
    intro: `<p>Height is measured at the withers, not the head, so a tall dog standing up with its head raised looks far bigger than these figures. A male ${byH[0].name} at ${H1(byH[0].m.h[1])} can rest its chin on a kitchen counter, and many of these breeds can reach one standing on their hind legs.</p>`,
    ranked: byH,
    itemText: (b) => `Males stand ${H(b.m.h)} at the shoulder, ${bodyLandmark(avg(b.m.h))} on a 175 cm adult, and weigh ${W(b.m.w)}. ${b.group === "Hound" && b.type === "sighthound" ? "A lean sighthound built for speed, so it is lighter than its height suggests." : ""}`.trim(),
    outro: `<h2>Tall vs heavy</h2><p>Sighthounds like the Irish Wolfhound and Scottish Deerhound are tall but lean; mastiffs are heavier at the same height. For weight, see the <a href="/articles/heaviest-dog-breeds/">heaviest dog breeds</a>.</p>`,
  });
  const byWd = [...BREEDS].sort((a, b) => b.wAvg - a.wAvg);
  rankedArticle({
    slug: "heaviest-dog-breeds", n: 15,
    title: "The 15 Heaviest Dog Breeds, Ranked by Weight",
    h1: "The 15 heaviest dog breeds",
    description: `The heaviest dog breeds ranked by average adult weight, led by the ${byWd[0].name}, with male and female weights.`,
    lede: "Ranked by average adult weight, males and females together. Mostly mastiffs and livestock guardians.",
    intro: `<p>Breed standards often give only a minimum weight for giant breeds, and individual males can be far heavier than the ranges below. Weights here follow kennel-club standards and breed-club figures; see <a href="/about/">about the data</a>.</p>`,
    ranked: byWd,
    itemText: (b) => `Males weigh ${W(b.m.w)}, females ${W(b.f.w)}. At ${H(b.m.h)} at the shoulder for males, ${b.hAvg > 75 ? "it is also one of the tallest breeds" : "it carries its weight on a relatively compact frame"}.`,
    outro: `<h2>What weight means in practice</h2><p>Dogs this size need an XL or XXL crate (see the <a href="/calculators/crate-size/">crate size calculator</a>), fly in the hold if at all, and have the shortest life expectancy: giant breeds here average ${round(sizeLifeAvg.Giant, 1)} years.</p>`,
  });
  const byL = [...BREEDS].sort((a, b) => b.lifeAvg - a.lifeAvg || b.life[1] - a.life[1] || a.wAvg - b.wAvg);
  rankedArticle({
    slug: "longest-living-dog-breeds", n: 20, human: false,
    title: "The 20 Longest-Living Dog Breeds (and Why Small Dogs Live Longer)",
    h1: "The 20 longest-living dog breeds",
    description: "Dog breeds with the longest typical life expectancy, ranked, and how size affects lifespan across all breeds.",
    lede: "Ranked by the middle of each breed's typical life-expectancy range. Small breeds dominate.",
    intro: `<p>Across the ${N} breeds on this site, typical life expectancy falls as size rises: toy breeds average ${round(sizeLifeAvg.Toy, 1)} years, small ${round(sizeLifeAvg.Small, 1)}, medium ${round(sizeLifeAvg.Medium, 1)}, large ${round(sizeLifeAvg.Large, 1)} and giant ${round(sizeLifeAvg.Giant, 1)}. Big dogs age faster, a pattern researchers still try to explain. These figures are breed-club estimates, not guarantees.</p>`,
    ranked: byL,
    itemText: (b) => `Typical life expectancy ${life(b.life)}. ${sizeWord(b)[0].toUpperCase() + sizeWord(b).slice(1)} at ${W(spanW(b))}.`,
    outro: `<p>Large breeds that buck the trend are listed in <a href="/articles/longest-living-large-dog-breeds/">longest-living large dog breeds</a>. To see your dog's age in human years, use the <a href="/calculators/dog-years/">dog years calculator</a>.</p>`,
  });
  const bigL = BREEDS.filter((b) => b.size === "Large" || b.size === "Giant").sort((a, b) => b.lifeAvg - a.lifeAvg || b.life[1] - a.life[1]);
  rankedArticle({
    slug: "longest-living-large-dog-breeds", n: 12,
    title: "12 Large Dog Breeds That Live the Longest",
    h1: "Large dog breeds that live the longest",
    description: "Large and giant dog breeds with the longest typical life expectancy, with heights and weights.",
    lede: `Large and giant breeds (average weight 25 kg / 55 lb and up) ranked by typical life expectancy. The average for large breeds here is ${round(sizeLifeAvg.Large, 1)} years.`,
    intro: `<p>Want a big dog that's likely to be around for a long time? These large and giant breeds have the longest typical life expectancy among the ${bigL.length} on this site.</p>`,
    ranked: bigL,
    itemText: (b) => `Typical life expectancy ${life(b.life)}, at ${W(spanW(b))} and ${H(spanH(b))} at the shoulder.`,
  });
}

function mdArticles(blocks) {
  const dir = path.join(ROOT, "content/articles");
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort()) {
    const { meta, body: md } = frontMatter(fs.readFileSync(path.join(dir, f), "utf8"));
    const s = f.replace(/\.md$/, "");
    const url = `/articles/${s}/`;
    const cr = crumbs([["/", "Home"], ["/articles/", "Articles"], [url, meta.h1 || meta.title]]);
    const body = `${cr.html}
<header class="page-head"><h1>${esc(meta.h1 || meta.title)}</h1>${meta.lede ? `<p class="lede">${L.inline(meta.lede)}</p>` : ""}<p class="byline">Updated ${meta.date || today}</p></header>
<article class="prose prose-wide">${markdown(md, blocks)}</article>`;
    ARTICLES.push({ url, title: meta.h1 || meta.title, description: meta.description, date: meta.date || today });
    emit(url, page({ url, current: "/articles/", title: meta.title, description: meta.description, body, ld: [cr.ld, { "@type": "Article", headline: meta.h1 || meta.title, dateModified: meta.date || today, author: { "@type": "Organization", name: L.SITE_NAME }, publisher: { "@type": "Organization", name: "MILIVON" }, copyrightHolder: { "@type": "Organization", name: "MILIVON" } }] }), 0.7);
  }
}

function articlesIndex() {
  const url = "/articles/";
  const cr = crumbs([["/", "Home"], [url, "Articles"]]);
  const body = `${cr.html}
<header class="page-head"><h1>Articles and guides</h1><p class="lede">Rankings built from breed-standard data, plus practical guides to measuring, crates and flying with a dog.</p></header>
<div class="art-grid">${ARTICLES.map((a) => `<a class="art-card" href="${a.url}"><h2>${esc(a.title)}</h2><p>${esc(a.description)}</p></a>`).join("")}</div>`;
  emit(url, page({ url, current: url, title: "Dog Size Articles & Guides", description: "Smallest, tallest and heaviest dog breeds, airline rules for flying with a dog, and how to measure your dog.", body, ld: [cr.ld] }), 0.8);
}

// blocks usable inside content/*.md as {{name}}
function contentBlocks() {
  const cabinYes = BREEDS.filter((b) => cabin(b) === "yes").sort((a, b) => a.wAvg - b.wAvg);
  const cabinSome = BREEDS.filter((b) => cabin(b) === "some").sort((a, b) => a.wAvg - b.wAvg);
  const fmtLimit = (a) => (a.limitKg == null ? "No weight limit" : `${a.limitKg} kg (${lb(a.limitKg)} lb)${a.includesCarrier ? " incl. carrier" : ""}`);
  return {
    airline_table: `<div class="table-scroll"><table class="data-table"><thead><tr><th>Airline</th><th>Pets in cabin</th><th>Weight limit</th><th>Max carrier size</th><th>Notes</th><th>Source</th></tr></thead><tbody>${AIRLINES.airlines.map((a) => `<tr><td>${esc(a.name)}</td><td>${a.cabin ? "Yes" : "No"}</td><td>${a.cabin ? fmtLimit(a) : "–"}</td><td>${esc(a.carrier || "–")}</td><td>${esc(a.notes || "")}</td><td>${a.verified ? `<a href="${esc(a.source)}" rel="noopener nofollow">Airline site</a>` : `<a href="${esc(a.source)}" rel="noopener nofollow">Not confirmed*</a>`}</td></tr>`).join("")}</tbody></table></div><p class="table-note">Last reviewed ${esc(AIRLINES.reviewed)} against each airline's own pet policy page. * We could not confirm this on the airline's own website; it comes from travel guides. Rules change and often differ by route, aircraft and cabin class, so always confirm with the airline before booking.</p>`,
    cabin_breeds: `<h3>Fit across their whole weight range (${cabinYes.length})</h3>${breedGrid(cabinYes)}<h3>Fit if the dog is on the lighter side (${cabinSome.length})</h3>${breedGrid(cabinSome)}`,
    cabin_count: `<p>${cabinYes.length} breeds on this site stay at or under ${CABIN_MAX_DOG} kg (${lb(CABIN_MAX_DOG)} lb) across their whole weight range, and ${cabinSome.length} more do if the individual dog is on the lighter side.</p>`,
    size_class_table: `<div class="table-scroll"><table class="data-table"><thead><tr><th>Size class</th><th>Average adult weight</th><th>Breeds on this site</th><th>Typical height range</th><th>Examples</th></tr></thead><tbody>${SIZES.map((s) => { const bs = BREEDS.filter((b) => b.size === s); const hs = bs.map((b) => b.hAvg).sort((a, b) => a - b); const ex = [...bs].sort((a, b) => b.hAvg - a.hAvg); return `<tr><td><a href="${sizeUrl(s)}">${s}</a></td><td>${SIZE_INFO[s].limit}</td><td>${bs.length}</td><td>${cm(hs[Math.floor(hs.length * 0.1)])}–${cm(hs[Math.floor(hs.length * 0.9)])} cm</td><td>${spread(ex, 3).map((b) => `<a href="${b.url}">${esc(b.name)}</a>`).join(", ")}</td></tr>`; }).join("")}</tbody></table></div>`,
    group_table: `<div class="table-scroll"><table class="data-table"><thead><tr><th>Group</th><th>Breeds</th><th>Bred for</th></tr></thead><tbody>${GROUPS.map((g) => `<tr><td><a href="${groupUrl(g)}">${esc(g)}</a></td><td>${BREEDS.filter((b) => b.group === g).length}</td><td>${esc(GROUP_TEXT[g].split(". ")[0])}.</td></tr>`).join("")}</tbody></table></div>`,
    measure_diagram: measureDiagram(),
    breed_count: String(N),
  };
}
function measureDiagram() {
  const b = BY_ID["labrador-retriever"], s = L.shapeOf(b);
  const hpx = 200, k = hpx, w = s.maxX * k, h = s.maxY * k, gx = 60, gy = 40 + h;
  const wx = gx + s.withersX * k, wy = gy - k;
  const u = bodyUnits(b);
  return `<figure class="scene diagram"><svg viewBox="0 0 ${gx + w + 120} ${gy + 50}" role="img" aria-label="Where to measure a dog: height at the withers, length and head height">
  <image href="${b.img}" x="${gx}" y="${gy - h}" width="${w}" height="${h}" preserveAspectRatio="none"/>
  <line class="sc-ground" x1="20" x2="${gx + w + 100}" y1="${gy}" y2="${gy}"/>
  <line class="dg-line" x1="${wx}" x2="${wx}" y1="${gy}" y2="${wy}"/><line class="dg-line" x1="${wx - 30}" x2="${wx + 30}" y1="${wy}" y2="${wy}"/>
  <text class="dg-text" x="${wx - 36}" y="${wy - 8}" text-anchor="end">Withers height</text>
  <line class="dg-line dg-alt" x1="${gx + w + 30}" x2="${gx + w + 30}" y1="${gy}" y2="${gy - h}"/><text class="dg-text" x="${gx + w + 36}" y="${gy - h + 14}">Head height</text>
  <line class="dg-line dg-alt2" x1="${gx + w - u.len * k * 0.98}" x2="${gx + w * 0.98}" y1="${gy + 22}" y2="${gy + 22}"/><text class="dg-text" x="${gx + w / 2}" y="${gy + 42}" text-anchor="middle">Length: nose to base of tail</text>
  </svg></figure>`;
}

function aboutPage(blocks) {
  const url = "/about/";
  const { meta, body: md } = frontMatter(fs.readFileSync(path.join(ROOT, "content/about.md"), "utf8"));
  const cr = crumbs([["/", "Home"], [url, "About the data"]]);
  const body = `${cr.html}<header class="page-head"><h1>${esc(meta.h1)}</h1><p class="lede">${L.inline(meta.lede)}</p></header><article class="prose prose-wide">${markdown(md, blocks)}</article>`;
  emit(url, page({ url, title: meta.title, description: meta.description, body, ld: [cr.ld] }), 0.4);
}

// ======================================================================
// Suggest a breed
// ======================================================================
function suggestPage() {
  const url = "/suggest-a-breed/";
  const cr = crumbs([["/", "Home"], ["/breeds/", "Breeds"], [url, "Suggest a breed"]]);
  const known = BREEDS.map((b) => [b.name, b.url, b.aliases]);
  const body = `${cr.html}
<header class="page-head"><h1>Suggest a dog breed</h1><p class="lede">Missing a breed? Tell us which one and we'll look up its breed standard and add it to the comparison tool. We currently list ${N} breeds.</p></header>
<section class="card">
<form id="suggest-form" class="calc-form suggest-form" novalidate>
  <label class="fld"><span>Breed name *</span><input name="breed" required maxlength="80" autocomplete="off" placeholder="e.g. Podenco Campanero"></label>
  <p id="suggest-known" class="suggest-known" hidden></p>
  <label class="fld"><span>Country of origin</span><input name="origin" maxlength="60" placeholder="e.g. Spain"></label>
  <label class="fld"><span>Kennel club or standard, if you know it</span><input name="standard" maxlength="200" placeholder="e.g. FCI No. 123, RSCE, link to the standard"></label>
  <label class="fld"><span>Anything else?</span><textarea name="notes" rows="4" maxlength="1000" placeholder="Sizes, size varieties, other names…"></textarea></label>
  <div><button class="btn" type="submit">Send suggestion</button></div>
  <p class="muted small">Suggestions are posted as a public issue on our <a href="https://github.com/${REPO}/issues">GitHub page</a>, which needs a free GitHub account. Please don't include personal details.</p>
</form>
</section>
<script>
(function () {
  var KNOWN = ${JSON.stringify(known)};
  var REPO = ${JSON.stringify(REPO)};
  var slug = function (s) { return s.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim(); };
  var f = document.getElementById("suggest-form"), out = document.getElementById("suggest-known");
  var q = new URLSearchParams(location.search).get("breed");
  if (q) f.breed.value = q.slice(0, 80);
  function check() {
    var v = slug(f.breed.value);
    var hits = v.length < 3 ? [] : KNOWN.filter(function (k) { return [k[0]].concat(k[2]).some(function (n) { var s = slug(n); return s.indexOf(v) >= 0 || v.indexOf(s) >= 0; }); }).slice(0, 4);
    out.hidden = !hits.length;
    out.innerHTML = hits.length ? "Already on the site: " + hits.map(function (k) { return '<a href="' + k[1] + '">' + k[0].replace(/[&<>]/g, "") + "</a>"; }).join(", ") : "";
  }
  f.breed.addEventListener("input", check); check();
  f.addEventListener("submit", function (e) {
    e.preventDefault();
    var b = f.breed.value.trim();
    if (!b) { f.breed.focus(); return; }
    var body = "**Breed:** " + b + "\\n**Origin:** " + (f.origin.value.trim() || "-") + "\\n**Standard:** " + (f.standard.value.trim() || "-") + "\\n\\n" + (f.notes.value.trim() || "") + "\\n\\n_Sent from dogsizecomparison.com/suggest-a-breed/_";
    window.open("https://github.com/" + REPO + "/issues/new?title=" + encodeURIComponent("Breed suggestion: " + b) + "&body=" + encodeURIComponent(body), "_blank", "noopener");
  });
})();
</script>`;
  emit(url, page({ url, current: "/breeds/", title: "Suggest a Dog Breed", description: `Missing a dog breed? Suggest it and we'll add it to the dog size comparison tool. ${N} breeds listed so far.`, body, ld: [cr.ld] }), 0.3);
}

// ======================================================================
// Calculators
// ======================================================================
const CALC_DISCLAIMER = {
  "puppy-weight": "This is a rough estimate based on typical growth curves, not a prediction for your puppy. Growth varies with genetics, diet and health. If you're worried about your puppy's weight or growth, ask your vet.",
  "crate-size": "Breed-based results are estimates from typical proportions. Measure your dog and check the manufacturer's inside dimensions before buying. For travel crates, airlines set their own (IATA) size rules.",
  "airline-cabin": "Airline rules change often and can differ by route, aircraft, cabin class and destination. This check covers weight only and is not travel advice: always confirm the current pet policy, carrier size and entry requirements with your airline before booking. We accept no liability for travel decisions based on this tool.",
  "dog-years": "Dog-to-human age conversions are approximations for fun and general orientation, not a measure of your dog's health. Your vet can tell you how your dog is ageing.",
};
const CALCS = [
  { slug: "puppy-weight", title: "Puppy Weight Calculator: How Big Will My Puppy Get?", h1: "How big will my puppy get?", nav: "Puppy adult weight", desc: "Estimate your puppy's adult weight from breed, age and current weight, and compare it with the breed standard." },
  { slug: "crate-size", title: "Dog Crate Size Calculator by Breed or Measurements", h1: "Dog crate size calculator", nav: "Crate size", desc: "Find the right crate size for your dog by breed or by measuring, with standard crate sizes in inches and centimetres." },
  { slug: "airline-cabin", title: "Can My Dog Fly in the Cabin? Airline Weight Check", h1: "Can my dog fly in the cabin?", nav: "Airline cabin check", desc: "Check your dog's weight against the in-cabin pet rules of major airlines, by breed or exact weight." },
  { slug: "dog-years", title: "Dog Years to Human Years Calculator (by Size)", h1: "Dog years to human years", nav: "Dog years", desc: "Convert your dog's age to human years using size-based ageing, plus the newer DNA-based formula." },
];
const breedOptions = (placeholder) => `<option value="">${placeholder}</option>` + BREEDS.map((b) => `<option value="${b.id}">${esc(b.name)}</option>`).join("");

function calcBody(c) {
  const unitSeg = `<div class="seg calc-units" role="group" aria-label="Units"><button type="button" data-u="metric" aria-pressed="true">cm · kg</button><button type="button" data-u="imperial" aria-pressed="false">in · lb</button></div>`;
  const sexSeg = `<div class="seg" role="group" aria-label="Sex" data-field="sex"><button type="button" data-v="m" aria-pressed="true">♂ Male</button><button type="button" data-v="f" aria-pressed="false">♀ Female</button></div>`;
  if (c.slug === "puppy-weight") return {
    form: `<label class="fld"><span>Breed</span><select name="breed">${breedOptions("Mixed breed / not sure")}</select></label>
<label class="fld" data-show="nobreed"><span>Expected adult size</span><select name="size">${SIZES.map((s) => `<option${s === "Medium" ? " selected" : ""}>${s}</option>`).join("")}</select></label>
<div class="fld"><span>Sex</span>${sexSeg}</div>
<label class="fld"><span>Age</span><span class="inline"><input name="age" type="number" min="6" max="104" step="1" value="16" inputmode="numeric"><select name="ageUnit"><option value="w">weeks</option><option value="m">months</option></select></span></label>
<label class="fld"><span>Current weight</span><span class="inline"><input name="weight" type="number" min="0.2" max="100" step="0.1" value="8" inputmode="decimal"><span class="unit" data-unit="w">kg</span></span></label>
<div class="fld"><span>Units</span>${unitSeg}</div>`,
    content: `<h2>How the estimate works</h2><p>Puppies grow fast at first and then level off. Small breeds reach adult weight at around 9–12 months; giant breeds keep filling out until 18–24 months. The calculator divides your puppy's current weight by the share of adult weight a typical puppy of that size has reached at that age.</p>
<div class="table-scroll"><table class="data-table"><thead><tr><th>Age</th>${SIZES.map((s) => `<th>${s}</th>`).join("")}</tr></thead><tbody>${[8, 12, 16, 20, 26, 39, 52, 78].map((wk) => `<tr><td>${wk < 26 ? `${wk} weeks` : `${round(wk / 4.345, 0)} months`}</td>${SIZES.map((s) => `<td>${pct(L.growthShare(s, wk))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
<p class="table-note">Typical share of adult weight reached, by adult size. Built from published puppy growth charts; individual puppies vary by 15% or more.</p>
<h2>Why it is only an estimate</h2><ul><li>Growth comes in spurts, so a single weigh-in can mislead. Weigh weekly and use the average.</li><li>Mixed breeds can follow either parent. Paw size and parents' weights are as useful as any formula.</li><li>Under- or over-feeding changes the curve. Your vet can tell you whether your puppy's body condition is right.</li></ul>`,
    faq: [["When do puppies stop growing?", "Toy and small breeds reach adult height at about 6–8 months and adult weight by 9–12 months. Medium breeds finish at about 12 months, large breeds at 12–18 months and giant breeds at 18–24 months."], ["Is a puppy half its adult weight at 4 months?", "For medium breeds that's roughly right at about 4–5 months. Small breeds are past half by 4 months; large and giant breeds reach half their adult weight later, around 5–7 months."]],
  };
  if (c.slug === "crate-size") return {
    form: `<div class="fld"><span>Size from</span><div class="seg" role="group" data-field="mode"><button type="button" data-v="breed" aria-pressed="true">Breed</button><button type="button" data-v="measure" aria-pressed="false">My measurements</button></div></div>
<label class="fld" data-show="breed"><span>Breed</span><select name="breed">${breedOptions("Choose a breed")}</select></label>
<div class="fld" data-show="breed"><span>Sex</span>${sexSeg}</div>
<label class="fld" data-show="measure"><span>Length, nose to base of tail</span><span class="inline"><input name="len" type="number" min="10" max="200" step="1" value="80"><span class="unit" data-unit="h">cm</span></span></label>
<label class="fld" data-show="measure"><span>Height, floor to top of head</span><span class="inline"><input name="top" type="number" min="10" max="150" step="1" value="65"><span class="unit" data-unit="h">cm</span></span></label>
<div class="fld"><span>Units</span>${unitSeg}</div>`,
    content: `<h2>How to size a crate</h2><p>A dog should be able to stand without ducking, turn around and lie flat on its side. The usual rule: the crate's inside length should be your dog's length from nose to base of tail plus about 7.5 cm (3 in), and its inside height your dog's standing head height plus about 5 cm (2 in). See <a href="/articles/how-to-measure-your-dog/">how to measure your dog</a>.</p>
<p>For breeds the calculator assumes a dog in the upper part of the breed's height range, so most adults will fit. If your dog is big for its breed, measure it. For a puppy, buy the adult size and close off part of it with a divider.</p>
<h2>Standard crate sizes</h2><div class="table-scroll"><table class="data-table"><thead><tr><th>Name</th><th>Length × width × height</th><th>Typical dogs</th></tr></thead><tbody>${L.CRATES.map((k) => `<tr><td>${k.name}</td><td>${k.l}″ × ${k.w}″ × ${k.h}″ (${Math.round(k.l * 2.54)} × ${Math.round(k.w * 2.54)} × ${Math.round(k.h * 2.54)} cm)</td><td>${esc(k.ex)}</td></tr>`).join("")}</tbody></table></div><p class="table-note">Outside dimensions of common wire crates. Inside space is a little smaller than the outside size, which the calculator allows for.</p>`,
    faq: [["Should a dog crate be big or small?", "Just big enough for your dog to stand, turn and lie stretched out. A much larger crate lets a puppy use one end as a toilet, which makes house-training harder."], ["What size crate for a puppy?", "Buy the crate for the adult size and use a divider panel to shrink the space while the puppy grows."]],
  };
  if (c.slug === "airline-cabin") return {
    form: `<div class="fld"><span>Weight from</span><div class="seg" role="group" data-field="mode"><button type="button" data-v="breed" aria-pressed="true">Breed</button><button type="button" data-v="weight" aria-pressed="false">My dog's weight</button></div></div>
<label class="fld" data-show="breed"><span>Breed</span><select name="breed">${breedOptions("Choose a breed")}</select></label>
<div class="fld" data-show="breed"><span>Sex</span>${sexSeg}</div>
<label class="fld" data-show="weight"><span>Dog's weight</span><span class="inline"><input name="weight" type="number" min="0.5" max="100" step="0.1" value="6"><span class="unit" data-unit="w">kg</span></span></label>
<label class="fld"><span>Carrier weight</span><span class="inline"><input name="carrier" type="number" min="0" max="10" step="0.1" value="1.5"><span class="unit" data-unit="w">kg</span></span></label>
<div class="fld"><span>Units</span>${unitSeg}</div>`,
    content: `<h2>How cabin rules work</h2><p>Airlines that allow pets in the cabin set two kinds of limit: a <strong>weight limit</strong>, usually for dog and carrier together, and a <strong>carrier size</strong> that fits under the seat in front. European airlines mostly cap the total at 8 kg (17.6 lb); several North American airlines set no weight limit but the dog must still fit in an under-seat carrier and be able to stand and turn around in it.</p>
<p>Soft carriers weigh about 1–2 kg (2–4 lb). Weigh yours with the bedding you'll use. For the full rules, see <a href="/articles/flying-with-a-dog-in-the-cabin/">flying with a dog in the cabin</a>.</p>`,
    faq: [["What is the weight limit for dogs in the airplane cabin?", "Most European airlines allow 8 kg (17.6 lb) for dog and carrier together. Several US airlines set no weight limit but require the carrier to fit under the seat. Some airlines, including British Airways, Ryanair and easyJet, don't accept pets in the cabin at all, apart from assistance dogs."], ["Which dog breeds can fly in the cabin?", "Breeds that stay under about 6.5 kg (14 lb), such as the Chihuahua, Yorkshire Terrier, Pomeranian, Maltese and Toy Poodle. Small breeds like the Shih Tzu or Miniature Dachshund often fit if the dog is on the lighter side."]],
  };
  return {
    form: `<div class="fld"><span>Dog's age</span><span class="inline"><input name="years" type="number" min="0" max="25" step="1" value="5" aria-label="Years"><span class="unit">years</span><input name="months" type="number" min="0" max="11" step="1" value="0" aria-label="Months"><span class="unit">months</span></span></div>
<label class="fld"><span>Breed</span><select name="breed">${breedOptions("Mixed breed / not sure")}</select></label>
<label class="fld" data-show="nobreed"><span>Adult size</span><select name="size">${SIZES.map((s) => `<option${s === "Medium" ? " selected" : ""}>${s}</option>`).join("")}</select></label>`,
    content: `<h2>Why "multiply by 7" is wrong</h2><p>Dogs mature very fast: a one-year-old dog is roughly as developed as a 15-year-old person, and a two-year-old as a 24-year-old. After that, ageing slows, but how much depends on size. Large and giant dogs age faster in later life, which is why they have shorter lifespans.</p>
<div class="table-scroll"><table class="data-table"><thead><tr><th>Dog age</th>${["Toy & small", "Medium", "Large", "Giant"].map((s) => `<th>${s}</th>`).join("")}</tr></thead><tbody>${[1, 2, 3, 5, 7, 10, 12, 14, 16].map((y) => `<tr><td>${y} year${y > 1 ? "s" : ""}</td>${["Small", "Medium", "Large", "Giant"].map((s) => `<td>${L.dogYears(s, y)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
<p class="table-note">Human-equivalent years by adult size, based on the widely used veterinary age chart.</p>
<h2>The DNA-based formula</h2><p>A 2019 study of DNA methylation in Labrador Retrievers proposed <strong>human age = 16 × ln(dog age) + 31</strong>. It ages young dogs even faster (a 1-year-old is 31) and was calibrated on one breed only, so the calculator shows it as a second opinion.</p>`,
    faq: [["How old is a 1-year-old dog in human years?", "About 15 human years for most dogs, about 12 for giant breeds that mature more slowly."], ["Do small dogs age slower?", "After about age 3, yes. A 10-year-old small dog is roughly 56 in human years, a 10-year-old giant breed nearer 79."]],
  };
}

function calcPages() {
  for (const c of CALCS) {
    const url = `/calculators/${c.slug}/`;
    const cr = crumbs([["/", "Home"], ["/calculators/", "Calculators"], [url, c.h1]]);
    const x = calcBody(c);
    const fq = faqBlock(x.faq);
    const extra = c.slug === "crate-size" ? `<script>window.CRATE_BODY=${JSON.stringify(Object.fromEntries(BREEDS.map((b) => { const u = bodyUnits(b); return [b.id, [round(u.len, 3), round(u.top, 3)]]; })))};window.CRATES=${JSON.stringify(L.CRATES)};</script>`
      : c.slug === "airline-cabin" ? `<script>window.AIRLINES=${JSON.stringify(AIRLINES)};</script>`
      : c.slug === "puppy-weight" ? `<script>window.GROWTH=${JSON.stringify(L.GROWTH)};</script>`
      : `<script>window.DOG_YEARS=${JSON.stringify(L.DOG_YEARS)};</script>`;
    const body = `${cr.html}
<header class="page-head"><h1>${esc(c.h1)}</h1><p class="lede">${esc(c.desc)}</p></header>
<section class="card calc" data-calc="${c.slug}"><form class="calc-form" onsubmit="return false">${x.form}</form><div class="calc-out" aria-live="polite"></div></section>
<aside class="disclaimer" role="note"><strong>Disclaimer:</strong> ${esc(CALC_DISCLAIMER[c.slug])}</aside>
<article class="prose">${x.content}</article>
${fq.html}
<section class="card"><h2>More calculators</h2><ul class="link-list">${CALCS.filter((o) => o !== c).map((o) => `<li><a href="/calculators/${o.slug}/">${esc(o.h1)}</a></li>`).join("")}</ul></section>
${extra}`;
    emit(url, page({ url, current: "/calculators/", title: c.title, description: c.desc, body, ld: [cr.ld, fq.ld, { "@type": "WebApplication", name: c.h1, url: L.SITE + url, applicationCategory: "UtilitiesApplication", operatingSystem: "Any", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } }], scripts: ["/js/breeds.js", "/js/calc.js"] }), 0.8);
  }
  const url = "/calculators/";
  const cr = crumbs([["/", "Home"], [url, "Calculators"]]);
  const body = `${cr.html}<header class="page-head"><h1>Dog size calculators</h1><p class="lede">Quick tools built on the same breed data as the comparison tool.</p></header>
<div class="art-grid">${CALCS.map((c) => `<a class="art-card" href="/calculators/${c.slug}/"><h2>${esc(c.h1)}</h2><p>${esc(c.desc)}</p></a>`).join("")}</div>`;
  emit(url, page({ url, current: url, title: "Dog Size Calculators: Puppy Weight, Crate Size, Airline Cabin, Dog Years", description: "Free dog calculators: predict your puppy's adult weight, pick a crate size, check airline cabin limits and convert dog years.", body, ld: [cr.ld] }), 0.8);
}

// ======================================================================
// Write everything
// ======================================================================
for (const d of OUT_DIRS) fs.rmSync(path.join(ROOT, d), { recursive: true, force: true });

BREEDS.forEach(breedPage);
breedsIndex();
PAIRS.forEach(comparePage);
compareIndex();
sizePages();
groupPages();
originPages();
const blocks = contentBlocks();
rankedArticles();
mdArticles(blocks);
articlesIndex();
aboutPage(blocks);
calcPages();
suggestPage();

for (const p of pages) {
  const file = path.join(ROOT, p.url, "index.html");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, p.html);
}

// social preview images
{
  const { spawnSync } = require("child_process");
  const py = [path.join(ROOT, ".venv/bin/python"), "python3"].find((p) => p === "python3" || fs.existsSync(p));
  const r = spawnSync(py, [path.join(ROOT, "tools/build_og.py")], { input: JSON.stringify(OG_JOBS), encoding: "utf8", maxBuffer: 1 << 26 });
  if (r.status === 0) process.stdout.write(r.stdout);
  else console.warn(`WARNING: preview images not rendered (${(r.stderr || r.error || "").toString().trim().split("\n").pop()}).\n  Set up once: python3 -m venv .venv && .venv/bin/pip install -r tools/requirements.txt`);
}

// index.html: SEO blocks, then top bar and site footer
require("./build_seo.js");
const indexFile = path.join(ROOT, "index.html");
let index = fs.readFileSync(indexFile, "utf8");
const put = (name, content) => {
  const re = new RegExp(`(<!-- site:${name} -->)[\\s\\S]*?(<!-- /site:${name} -->)`);
  if (!re.test(index)) throw new Error(`marker site:${name} missing in index.html`);
  index = index.replace(re, (_, a, b) => `${a}\n${content}\n${b}`);
};
put("topbar", L.topbar("/#"));
put("footer", L.siteFooter());
fs.writeFileSync(indexFile, index);

// sitemap
const urls = [{ url: "/", priority: 1 }, ...pages];
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((p) => `  <url><loc>${L.SITE}${p.url}</loc><lastmod>${today}</lastmod><priority>${p.priority.toFixed(1)}</priority></url>`).join("\n")}
</urlset>
`);
const count = (pre) => pages.filter((p) => p.url.startsWith(pre)).length;
console.log(`site: ${pages.length} pages (breeds ${count("/breeds/")}, compare ${count("/compare/")}, sizes ${count("/sizes/")}, groups ${count("/groups/")}, origins ${count("/origins/")}, articles ${count("/articles/")}, calculators ${count("/calculators/")}) + sitemap`);
