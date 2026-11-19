/*
 * German pages under /de/: one German page for every English page type.
 * Called from tools/build_site.js, which passes the shared comparison pairs and
 * helpers, writes the pages and fills in the hreflang links.
 *
 * Hand-written German text lives in content/de/ (breeds/, articles/, about.md).
 * Sentences built from data are written here in German directly, not translated
 * word for word from the English generator.
 */
const L = require("../lib");
const D = require("./lang");
const { fs, path, ROOT, esc, avg, round, BREEDS, BY_ID, N, GROUPS, SIZES, COUNTRIES, TRAIT_KEYS, CABIN, CABIN_MAX_DOG, cabin,
  share, nearest, scene, markdown, frontMatter, crumbs, faqBlock, spanH, spanW, MALE, FEMALE, COLORS } = L;
const { n, name, cap, pron, listDe, H, W, H1, W1, cm, kg, num, life, pct, SIZE_DE, sizeUrl, GROUP_DE, groupUrl, groupName,
  breedUrl, toolLink, breedCard, breedGrid, page, country, originName, ausOrigin, countryUrl, countryAdjList, TRAIT_DE } = D;

const SC = { lang: "de", nameOf: n };
const CONTENT = path.join(ROOT, "content/de");

module.exports = function buildDe(ctx) {
  const { PAIRS, PAIRS_BY_BREED, ogJob, ogDog, refFor, today, REPO, AIRLINES, spread, sizeLifeAvg } = ctx;
  const pages = [];
  const pairs = {}; // enUrl → deUrl
  const emit = (url, html, priority, enUrl) => { pages.push({ url, html, priority }); if (enUrl) pairs[enUrl] = url; };
  const other = (p, b) => (p.a === b ? p.b : p.a);
  const deCompareUrl = (p) => `/de/vergleich/${D.BREED_SLUG[p.a.id]}-vs-${D.BREED_SLUG[p.b.id]}/`;
  const home = ["/de/", "Start"];

  // ---------- ranks ----------
  const byHeight = [...BREEDS].sort((a, b) => b.hAvg - a.hAvg);
  const byWeight = [...BREEDS].sort((a, b) => b.wAvg - a.wAvg);
  /** "die größte Rasse", "die 3.-größte Rasse", "die 2.-kleinste Rasse" or null */
  function heightRank(b) {
    const i = byHeight.indexOf(b) + 1, j = N - i + 1;
    if (i <= 10) return i === 1 ? "die größte" : `die ${i}.-größte`;
    if (j <= 10) return j === 1 ? "die kleinste" : `die ${j}.-kleinste`;
    return null;
  }
  function weightRank(b) {
    const i = byWeight.indexOf(b) + 1, j = N - i + 1;
    if (i <= 10) return i === 1 ? "die schwerste" : `die ${i}.-schwerste`;
    if (j <= 10) return j === 1 ? "die leichteste" : `die ${j}.-leichteste`;
    return null;
  }
  /** Where a height falls against a standing adult of 175 cm. */
  function bodyLandmark(hCm, personCm = 175) {
    const f = hCm / personCm;
    return f < 0.12 ? "etwa bis zum Knöchel" : f < 0.19 ? "etwa bis zur Mitte des Schienbeins" : f < 0.26 ? "knapp unter das Knie" : f < 0.33 ? "etwa bis zum Knie" : f < 0.43 ? "etwa bis zur Mitte des Oberschenkels" : f < 0.55 ? "etwa bis zur Hüfte" : "etwa bis zur Taille";
  }
  const sizeAdj = (b) => SIZE_DE[b.size].adj; // "mittelgroße"
  const groupPhrase = (g) => (g === "Designer / Mixed" ? "eine Designerrasse ohne offiziellen Standard" : `gehört zu ${GROUP_DE[g].dat}`);

  // ---------- social preview images ----------
  const rng = (r, f, u) => (f(r[0]) === f(r[1]) ? `${f(r[0])} ${u}` : `${f(r[0])}–${f(r[1])} ${u}`);
  function breedOg(b, ref) {
    const sexLine = (s, lbl) => [`${lbl}  ${rng(b[s].h, cm, "cm")} · ${rng(b[s].w, kg, "kg")}`, "fact"];
    return ogJob({
      out: `img/og/de/rassen/${D.BREED_SLUG[b.id]}.png`, kind: "breed", kicker: "Hunderasse: Größe", title: n(b),
      lines: [...(b.sameSexes ? [sexLine("m", "Erwachsen")] : [sexLine("m", "Rüden"), sexLine("f", "Hündinnen")]),
        [`${SIZE_DE[b.size].short} · ${groupName(b.group)}`, "small"]],
      dogs: [ogDog(b, avg(b.m.h), n(b), `${cm(avg(b.m.h))} cm · ${kg(avg(b.m.w))} kg`, "#c2562b"),
        ogDog(ref, avg(ref.m.h), n(ref), `${cm(avg(ref.m.h))} cm · ${kg(avg(ref.m.w))} kg`, "#8c857a", true)],
    });
  }
  function compareOg(A, B, url) {
    return ogJob({
      out: `img/og${url.replace(/\/$/, "")}.png`, kind: "compare", kicker: "", title: `${n(A)} vs. ${n(B)}`,
      lines: [["Maßstabsgetreu", "fact"], ["durchschnittliche Rüden", "fact"]],
      dogs: [A, B].map((x, i) => ogDog(x, avg(x.m.h), n(x), `${cm(avg(x.m.h))} cm · ${kg(avg(x.m.w))} kg`, COLORS[i])),
    });
  }

  // ---------- photos ----------
  const photoCredit = (p) => {
    const lic = p.licenseUrl ? `<a href="${esc(p.licenseUrl)}" rel="license noopener" target="_blank">${esc(p.license)}</a>` : esc(p.license);
    return `Foto: <a href="${esc(p.source)}" rel="noopener" target="_blank">${esc(p.artist)}</a>, ${lic}, über Wikimedia Commons`;
  };
  const photoFigure = (b) => !b.photo ? "" : `<figure class="breed-photo">
    <img src="${b.photo.src}" width="${b.photo.width}" height="${b.photo.height}" alt="${esc(`${n(b)} (Foto)`)}" loading="eager" decoding="async">
    <figcaption>${photoCredit(b.photo)}</figcaption>
  </figure>`;
  const photoLd = (b) => b.photo && {
    "@type": "ImageObject", contentUrl: L.SITE + b.photo.src, width: b.photo.width, height: b.photo.height,
    name: n(b), creditText: b.photo.artist, creator: { "@type": "Person", name: b.photo.artist },
    license: b.photo.licenseUrl || undefined, acquireLicensePage: b.photo.source, copyrightNotice: `${b.photo.artist}, ${b.photo.license}`,
  };
  function comparePhotos(A, B) {
    if (!A.photo || !B.photo) return "";
    const fig = (x) => `<figure><a href="${breedUrl(x)}"><img src="${x.photo.src}" width="${x.photo.width}" height="${x.photo.height}" alt="${esc(`${n(x)} (Foto)`)}" decoding="async"></a><span class="cmp-name"><a href="${breedUrl(x)}">${esc(n(x))}</a></span><figcaption>${photoCredit(x.photo)}</figcaption></figure>`;
    return `<div class="cmp-photos">${fig(A)}${fig(B)}</div>`;
  }

  // ======================================================================
  // Breed pages
  // ======================================================================
  function breedIntro(b) {
    const s = [];
    s.push(`${cap(name.der(b))} ist eine ${sizeAdj(b)} Hunderasse ${ausOrigin(b.origin)} und ${b.group === "Designer / Mixed" ? "eine Designerrasse ohne offiziellen Rassestandard" : `gehört zu ${GROUP_DE[b.group].dat}`}.`);
    s.push(b.sameSexes
      ? `Erwachsene Tiere erreichen eine Schulterhöhe von ${H(b.m.h)} und wiegen ${W(b.m.w)}; der Standard nennt für Rüden und Hündinnen denselben Bereich.`
      : `Rüden erreichen eine Schulterhöhe von ${H(b.m.h)} und wiegen ${W(b.m.w)}. Hündinnen messen ${H(b.f.h)} und wiegen ${W(b.f.w)}.`);
    const rk = heightRank(b);
    if (rk) s.push(`Im Durchschnitt ist ${pron(b)} damit ${rk} der ${N} Rassen auf dieser Website.`);
    else {
      const wr = weightRank(b);
      s.push(`Im Durchschnitt ist ${pron(b)} größer als ${pct(share(b, "hAvg"))} der ${N} Rassen auf dieser Website${wr ? ` und ${wr} Rasse` : ` und schwerer als ${pct(share(b, "wAvg"))}`}.`);
    }
    s.push(`Mit der Schulter reicht ${b.sameSexes ? "ein durchschnittlicher Hund" : "ein durchschnittlicher Rüde"} dieser Rasse einem 175 cm großen Erwachsenen ${bodyLandmark(avg(b.m.h))}.`);
    return s.join(" ");
  }
  function lifeText(b) {
    const d = b.lifeAvg - sizeLifeAvg[b.size];
    const rel = Math.abs(d) < 0.6 ? `etwa der Durchschnitt ${SIZE_DE[b.size].gen}`
      : `${d > 0 ? "länger" : "kürzer"} als der Durchschnitt von ${num(round(sizeLifeAvg[b.size], 1))} Jahren bei ${SIZE_DE[b.size].dat}`;
    return `Die typische Lebenserwartung liegt bei ${D.lifeDat(b.life)}, ${rel}.`;
  }
  function cabinText(b) {
    const c = cabin(b);
    if (c === "yes") return `Mit ${W(spanW(b))} erfüllt ${pron(b)} selbst die strengste Kabinenregel der Airlines, bei der Hund und Transporttasche zusammen höchstens ${CABIN.limitKg} kg wiegen dürfen.`;
    if (c === "some") return `Leichtere Tiere passen unter die Kabinengrenze von ${CABIN.limitKg} kg für Hund und Tasche; schwerere brauchen eine Airline, die nur die Taschengröße prüft, oder fliegen im Frachtraum.`;
    if (b.size === "Small" || b.size === "Medium") return `Für Airlines, die Hund und Tasche auf ${CABIN.limitKg} kg begrenzen, ist ${pron(b)} zu schwer und fliegt daher meist im Frachtraum, sofern die Airline nicht nur die Taschengröße prüft.`;
    return "";
  }
  function sexText(b) {
    if (b.sameSexes) return "";
    const dh = avg(b.m.h) - avg(b.f.h), dw = avg(b.m.w) / avg(b.f.w) - 1;
    if (Math.abs(dh) < 0.5 && Math.abs(dw) < 0.03) return "Rüden und Hündinnen sind praktisch gleich groß.";
    const hPart = Math.abs(dh) < 0.5 ? "etwa gleich groß wie eine durchschnittliche Hündin" : `${num(round(Math.abs(dh), 1))} cm ${dh >= 0 ? "größer" : "kleiner"} als eine durchschnittliche Hündin`;
    const wPart = Math.abs(dw) < 0.03 ? "wiegt etwa gleich viel" : `ist ${pct(Math.abs(dw))} ${dw >= 0 ? "schwerer" : "leichter"}`;
    return `Ein durchschnittlicher Rüde ist ${hPart} und ${wPart}.`;
  }
  function traitsCard(b) {
    const t = b.traits;
    const rows = TRAIT_KEYS.map((k) => `<li><span class="tr-k">${TRAIT_DE[k].label}</span><span class="tr-v"><span class="dots" aria-hidden="true">${[1, 2, 3].map((i) => `<i${i <= t[k] ? ' class="on"' : ""}></i>`).join("")}</span>${TRAIT_DE[k].vals[t[k] - 1]}</span></li>`).join("");
    return `<div class="card traits"><h2>${esc(n(b))} auf einen Blick</h2><ul class="trait-list">${rows}</ul>
  <p class="muted small">Allgemeine Tendenzen der Rasse; einzelne Hunde sind verschieden.</p>
  <p><a href="/de/rassefinder/?size=${b.size.toLowerCase()}&amp;energy=${t.energy}">Ähnliche Rassen im Rassefinder →</a></p></div>`;
  }
  const SRC_NAME = { AKC: "des American Kennel Club (AKC)", FCI: "der FCI", UKC: "des United Kennel Club (UKC)", PTCA: "der PTCA", RSCE: "der Real Sociedad Canina de España (RSCE)", Xunta: "der Xunta de Galicia (offizieller galicischer Standard)" };

  function breedPage(b) {
    const url = breedUrl(b);
    const ref = refFor(b);
    const sexes = b.sameSexes ? ["m"] : ["m", "f"];
    const dogs = sexes.map((s) => ({ b, hCm: avg(b[s].h), label: `${n(b)}${b.sameSexes ? "" : ` ${s === "m" ? "♂" : "♀"}`}`, sub: `${cm(avg(b[s].h))} cm · ${kg(avg(b[s].w))} kg`, color: s === "m" ? MALE : FEMALE, dashed: s === "f" }));
    dogs.push({ b: ref, hCm: avg(ref.m.h), label: `${n(ref)} ♂`, sub: `${cm(avg(ref.m.h))} cm · ${kg(avg(ref.m.w))} kg`, color: "#8c857a" });
    const similar = nearest(b, 6);
    const sameGroup = BREEDS.filter((x) => x.group === b.group && x !== b).sort((x, y) => L.distance(b, x) - L.distance(b, y)).slice(0, 12);
    const bPairs = PAIRS_BY_BREED[b.id] || [];
    const custom = path.join(CONTENT, "breeds", `${b.id}.md`);
    const handWritten = fs.existsSync(custom) ? markdown(frontMatter(fs.readFileSync(custom, "utf8")).body) : "";
    const cr = crumbs([home, ["/de/rassen/", "Rassen"], [sizeUrl(b.size), SIZE_DE[b.size].list], [url, n(b)]]);
    const c = cabin(b);
    const cu = countryUrl(b.country);
    const rk = heightRank(b);
    const enAlias = n(b) !== b.name ? b.name : "";

    const faq = [
      [`Wie groß wird ${name.ein(b)}?`, b.sameSexes
        ? `${cap(name.ein(b))} erreicht ausgewachsen eine Schulterhöhe (Widerristhöhe) von ${H(b.m.h)} und wiegt ${W(b.m.w)}.`
        : `Ein ausgewachsener Rüde erreicht eine Schulterhöhe (Widerristhöhe) von ${H(b.m.h)} und wiegt ${W(b.m.w)}. Hündinnen messen ${H(b.f.h)} und wiegen ${W(b.f.w)}.`],
      [`Ist ${name.der(b)} ein kleiner, mittelgroßer oder großer Hund?`, `Mit einem Durchschnittsgewicht von etwa ${W1(b.wAvg)} zählt ${name.der(b)} auf dieser Website zu den ${SIZE_DE[b.size].dat} (${SIZE_DE[b.size].limit} im Durchschnitt). ${rk ? `${cap(pron(b))} ist ${rk} der ${N} aufgeführten Rassen.` : `${cap(pron(b))} ist größer als ${pct(share(b, "hAvg"))} der ${N} aufgeführten Rassen.`}`],
      [`Wie alt wird ${name.ein(b)}?`, lifeText(b)],
      [`Darf ${name.ein(b)} in der Flugzeugkabine mitfliegen?`, c === "yes" ? `Meistens ja. ${cabinText(b)} Prüfe vor der Buchung die Regeln und Taschenmaße deiner Airline.`
        : c === "some" ? `Manchmal. ${cabinText(b)} Die Regeln unterscheiden sich je nach Airline, prüfe sie also vor der Buchung.`
        : `Meistens nicht. ${cap(name.ein(b))} wiegt ${W(spanW(b))}, deutlich mehr als die ${CABIN.limitKg} kg, die viele Airlines für Hund und Tasche zusammen erlauben, und passt in keine Tasche unter dem Sitz. Die meisten Airlines befördern Hunde dieser Größe im Frachtraum.`],
    ];
    const fq = faqBlock(faq, `${n(b)}: häufige Fragen zur Größe`);

    const facts = [
      ["Größe", b.sameSexes ? H(b.m.h) : `♂ ${H(b.m.h)}<br>♀ ${H(b.f.h)}`],
      ["Gewicht", b.sameSexes ? W(b.m.w) : `♂ ${W(b.m.w)}<br>♀ ${W(b.f.w)}`],
      ["Größenklasse", `<a href="${sizeUrl(b.size)}">${SIZE_DE[b.size].short}</a>`],
      ["Gruppe", `<a href="${groupUrl(b.group)}">${esc(groupName(b.group))}</a>`],
      ["Herkunft", cu ? `<a href="${cu}">${esc(originName(b.origin))}</a>` : esc(originName(b.origin))],
      ["Lebenserwartung", life(b.life)],
      ["Flugzeugkabine", c === "yes" ? `<span class="cabin cabin-yes">✈ Passt</span>` : c === "some" ? `<span class="cabin cabin-some">✈ Leichtere Hunde</span>` : `Über ${CABIN.limitKg}-kg-Grenze`],
      ["Größen-Rang", `${byHeight.indexOf(b) + 1}. von ${N}`],
    ];
    const srcLine = !b.source ? "" : b.source.src === "Typical"
      ? "Es gibt keinen offiziellen Rassestandard, daher sind dies typische Bereiche."
      : `Die Größen folgen dem Rassestandard ${SRC_NAME[b.source.src] || b.source.src}.`;
    const sexTable = b.sameSexes ? "" : `<div class="table-scroll"><table class="data-table"><thead><tr><th></th><th class="sex-m">♂ Rüde</th><th class="sex-f">♀ Hündin</th></tr></thead><tbody>
    <tr><td>Schulterhöhe (min.–max.)</td><td>${H(b.m.h)}</td><td>${H(b.f.h)}</td></tr>
    <tr><td>Durchschnittliche Höhe</td><td>${H1(avg(b.m.h))}</td><td>${H1(avg(b.f.h))}</td></tr>
    <tr><td>Gewicht (min.–max.)</td><td>${W(b.m.w)}</td><td>${W(b.f.w)}</td></tr>
    <tr><td>Durchschnittsgewicht</td><td>${W1(avg(b.m.w))}</td><td>${W1(avg(b.f.w))}</td></tr></tbody></table></div>`;
    const calcLinks = `<li><a href="/de/rechner/welpengewicht/?breed=${b.id}">Wie groß wird mein Welpe?</a></li>`;

    const body = `${cr.html}
<header class="page-head">
  <h1>${esc(n(b))}: Größe und Gewicht</h1>
  <p class="lede">${esc(n(b))}: ${sizeAdj(b)} Hunderasse ${esc(ausOrigin(b.origin))}${b.group === "Designer / Mixed" ? "" : `, ${esc(GROUP_DE[b.group].one)}`}. ${enAlias ? `Englisch: ${esc(enAlias)}. ` : ""}${b.aliases.length ? `Auch bekannt als ${esc(listDe(b.aliases))}. ` : ""}Größe, Gewicht und Vergleich, maßstabsgetreu gezeichnet.</p>
</header>
<section class="card">
  ${scene(dogs, { ...SC, title: `${n(b)} maßstabsgetreu neben einem 175 cm großen Menschen und ${name.einem(ref)}` })}
  <p class="scene-note">Maßstabsgetreu bei durchschnittlicher Größe, neben einem 175 cm großen Menschen und einem durchschnittlichen Rüden der Rasse ${esc(n(ref))}. Gemessen wird am Widerrist (höchster Punkt der Schulter).</p>
  <div class="cta-row"><a class="btn" href="${toolLink([[b.id, "both"], [ref.id, "m"]])}">${esc(n(b))} mit anderen Rassen vergleichen →</a></div>
</section>
<section class="facts">${facts.map(([k, v]) => `<div class="fact"><span class="fact-k">${k}</span><span class="fact-v">${v}</span></div>`).join("")}</section>
<div class="cols">
<article class="prose">
  ${photoFigure(b)}
  <h2>Wie groß wird ${esc(name.ein(b))}?</h2>
  <p>${esc(breedIntro(b))}</p>
  <p>${esc([lifeText(b), cabinText(b)].filter(Boolean).join(" "))}</p>
  ${b.sameSexes ? "" : `<h2>${esc(n(b))}: Rüde und Hündin im Vergleich</h2><p>${esc(sexText(b))}</p>${sexTable}`}
  ${srcLine ? `<p class="src-note">${esc(srcLine)}</p>` : ""}
  ${handWritten ? `<h2>Über ${esc(name.den(b))}</h2>${handWritten}` : ""}
</article>
<aside class="side">
  ${traitsCard(b)}
  ${bPairs.length ? `<div class="card"><h2>${esc(n(b))} im Vergleich</h2><ul class="link-list">${bPairs.map((p) => `<li><a href="${deCompareUrl(p)}">${esc(n(p.a))} vs. ${esc(n(p.b))}</a></li>`).join("")}</ul></div>` : ""}
  <div class="card"><h2>Rechner für ${esc(name.den(b))}</h2><ul class="link-list">${calcLinks}<li><a href="/de/rechner/hundebox-groesse/?breed=${b.id}">Passende Hundebox</a></li>${b.size === "Toy" || b.size === "Small" ? `<li><a href="/de/rechner/flugzeugkabine/?breed=${b.id}">Darf ${esc(pron(b))} in die Kabine?</a></li>` : ""}<li><a href="/de/rechner/hundejahre/?breed=${b.id}">Alter in Menschenjahren</a></li></ul></div>
  <div class="card"><h2>Weitere ${esc(groupName(b.group))}</h2><ul class="link-list">${sameGroup.map((x) => `<li><a href="${breedUrl(x)}">${esc(n(x))}</a></li>`).join("")}</ul><p><a href="${groupUrl(b.group)}">Alle ${esc(groupName(b.group))} →</a></p></div>
</aside>
</div>
<section>
  <h2 class="sec-h">Rassen ähnlicher Größe</h2>
  ${breedGrid(similar)}
  <p><a href="${toolLink([[b.id, "m"], ...similar.map((x) => [x.id, "m"])])}">Alle ${similar.length + 1} nebeneinander im Vergleichstool ansehen →</a></p>
</section>
${fq.html}
<aside class="disclaimer" role="note">Die Größen sind Bereiche aus dem Rassestandard für erwachsene Hunde; einzelne Hunde, Arbeitslinien und Hunde aus anderen Ländern können größer oder kleiner sein. Hinweise zu Flügen sind nur eine allgemeine Orientierung. Frag bei deiner Airline und deiner Tierarztpraxis nach. <a href="/de/ueber-die-daten/#haftungsausschluss">Haftungsausschluss</a>.</aside>`;
    emit(url, page({
      url, current: "/de/rassen/",
      title: `${n(b)}: Größe & Gewicht${b.sameSexes ? "" : " von Rüde und Hündin"}`,
      description: `Wie groß wird ${name.ein(b)}${enAlias ? ` (${enAlias})` : ""}? ${b.sameSexes ? `Erwachsene: ${H(b.m.h)} Schulterhöhe, ${W(b.m.w)}.` : `Rüden: ${H(b.m.h)}, ${W(b.m.w)}; Hündinnen: ${H(b.f.h)}, ${W(b.f.w)}.`} Maßstabsgetreu neben einem Menschen.`,
      body, ld: [cr.ld, fq.ld, photoLd(b)].filter(Boolean), ogImage: breedOg(b, ref), ogAlt: `${n(b)} maßstabsgetreu neben ${name.dem(ref)}`,
    }), 0.7, b.url);
  }

  // ======================================================================
  // Comparison pages
  // ======================================================================
  function compareSentences(A, B) {
    const s = [];
    const hA = avg(A.m.h), hB = avg(B.m.h), wA = avg(A.m.w), wB = avg(B.m.w);
    const [tall, short, ht, hs] = hA >= hB ? [A, B, hA, hB] : [B, A, hB, hA];
    const d = ht - hs;
    if (d < 2) s.push(`${cap(name.der(A))} und ${name.der(B)} sind an der Schulter fast gleich groß: Ein durchschnittlicher Rüde misst ${H1(hA)} bzw. ${H1(hB)}.`);
    else s.push(`${cap(name.der(tall))} ist der größere Hund. Ein durchschnittlicher Rüde misst ${H1(ht)} an der Schulter, ${num(round(d, 1))} cm mehr als ein durchschnittlicher Rüde der Rasse ${n(short)} mit ${H1(hs)}${ht / hs >= 1.25 ? `, also etwa ${D.times(round(ht / hs, 1))} so groß` : ""}.`);
    const [hv, lt, wh, wl] = wA >= wB ? [A, B, wA, wB] : [B, A, wB, wA];
    const r = wh / wl;
    if (r < 1.1) s.push(`Beide wiegen etwa gleich viel: ${W1(wA)} (${n(A)}) und ${W1(wB)} (${n(B)}) für einen durchschnittlichen Rüden.`);
    else s.push(`Beim Gewicht liegt ${name.der(hv)} vorn und ist ${r < 1.95 ? `etwa ${pct(r - 1)} schwerer` : `etwa ${D.times(r >= 10 ? Math.round(r) : round(r, 1))} so schwer`}: ${W1(wh)} für einen durchschnittlichen Rüden gegenüber ${W1(wl)} bei ${name.dem(lt)}.`);
    if (A.group === B.group) s.push(`Beide ${A.group === "Designer / Mixed" ? "sind Designerrassen" : `gehören zu ${GROUP_DE[A.group].dat}`}${A.country === B.country ? ` und stammen ${ausOrigin(A.country)}` : ""}.`);
    else s.push(`${cap(name.der(A))} ${groupPhrase(A.group).replace(/^eine /, "ist eine ")} und stammt ${ausOrigin(A.origin)}; ${name.der(B)} ${groupPhrase(B.group).replace(/^eine /, "ist eine ")} und stammt ${ausOrigin(B.origin)}.`);
    const dl = A.lifeAvg - B.lifeAvg;
    s.push(Math.abs(dl) < 1 ? `Die Lebenserwartung ist ähnlich (${life(A.life)} bzw. ${life(B.life)}).` : `${cap(name.der(dl > 0 ? A : B))} lebt meist länger: ${life(dl > 0 ? A.life : B.life)} gegenüber ${D.lifeDat(dl > 0 ? B.life : A.life)}.`);
    const cA = cabin(A), cB = cabin(B);
    if (cA !== cB && (cA !== "no" || cB !== "no")) {
      const fits = cA === "yes" ? A : cB === "yes" ? B : cA === "some" ? A : B;
      const oth = fits === A ? B : A;
      s.push(`Bei Flugreisen passt ${name.der(fits)} ${cabin(fits) === "yes" ? "" : "manchmal "}unter die Kabinengrenze von ${CABIN.limitKg} kg für Hund und Tasche, ${name.der(oth)} ${cabin(oth) === "no" ? "nicht" : "nur manchmal"}.`.replace("  ", " "));
    }
    return s;
  }

  function comparePage(p) {
    const { a: A, b: B } = p;
    const url = deCompareUrl(p);
    const dogs = [];
    [[A, COLORS[0]], [B, COLORS[1]]].forEach(([x, col]) => {
      for (const s of x.sameSexes ? ["m"] : ["m", "f"]) dogs.push({ b: x, hCm: avg(x[s].h), label: `${n(x)}${x.sameSexes ? "" : s === "m" ? " ♂" : " ♀"}`, sub: `${cm(avg(x[s].h))} cm · ${kg(avg(x[s].w))} kg`, color: col, dashed: s === "f" });
    });
    const cr = crumbs([home, ["/de/vergleich/", "Vergleiche"], [url, `${n(A)} vs. ${n(B)}`]]);
    const sentences = compareSentences(A, B);
    const row = (k, fa, fb) => `<tr><td>${k}</td><td>${fa}</td><td>${fb}</td></tr>`;
    const cabinLbl = (x) => ({ yes: "✈ Passt", some: "✈ Nur leichtere Hunde", no: `Über ${CABIN.limitKg}-kg-Grenze` }[cabin(x)]);
    const table = `<div class="table-scroll"><table class="data-table cmp-table"><thead><tr><th></th><th><a href="${breedUrl(A)}">${esc(n(A))}</a></th><th><a href="${breedUrl(B)}">${esc(n(B))}</a></th></tr></thead><tbody>
    ${row("Größe ♂", H(A.m.h), H(B.m.h))}${row("Größe ♀", H(A.f.h), H(B.f.h))}
    ${row("Gewicht ♂", W(A.m.w), W(B.m.w))}${row("Gewicht ♀", W(A.f.w), W(B.f.w))}
    ${row("Größenklasse", `<a href="${sizeUrl(A.size)}">${SIZE_DE[A.size].short}</a>`, `<a href="${sizeUrl(B.size)}">${SIZE_DE[B.size].short}</a>`)}
    ${row("Gruppe", `<a href="${groupUrl(A.group)}">${esc(groupName(A.group))}</a>`, `<a href="${groupUrl(B.group)}">${esc(groupName(B.group))}</a>`)}
    ${row("Herkunft", esc(originName(A.origin)), esc(originName(B.origin)))}${row("Lebenserwartung", life(A.life), life(B.life))}
    ${row("Flugzeugkabine", cabinLbl(A), cabinLbl(B))}</tbody></table></div>`;
    const bigger = avg(A.m.h) >= avg(B.m.h) ? A : B, smaller = bigger === A ? B : A;
    const faq = faqBlock([
      [`Wer ist größer: ${name.der(A)} oder ${name.der(B)}?`, sentences[0]],
      [`Wie viel wiegt ${name.ein(A)} im Vergleich zu ${name.einem(B)}?`, `Ein Rüde der Rasse ${n(A)} wiegt ${W(A.m.w)}, eine Hündin ${W(A.f.w)}. Ein Rüde der Rasse ${n(B)} wiegt ${W(B.m.w)}, eine Hündin ${W(B.f.w)}.`],
    ], `${n(A)} vs. ${n(B)}: Fragen`);
    const more = (x) => (PAIRS_BY_BREED[x.id] || []).filter((q) => q !== p).slice(0, 8);
    const moreList = (x) => more(x).length ? `<div class="card"><h2>Weitere Vergleiche: ${esc(n(x))}</h2><ul class="link-list">${more(x).map((q) => `<li><a href="${deCompareUrl(q)}">${esc(n(x))} vs. ${esc(n(other(q, x)))}</a></li>`).join("")}</ul></div>` : "";
    const body = `${cr.html}
<header class="page-head"><h1>${esc(n(A))} vs. ${esc(n(B))}: Größenvergleich</h1>
<p class="lede">${esc(n(bigger))} oder ${esc(n(smaller))}? Schulterhöhe und Gewicht von Rüden und Hündinnen, beide Rassen maßstabsgetreu neben einem Menschen.</p></header>
<section class="card">
  ${scene(dogs, { ...SC, title: `${n(A)} und ${n(B)} maßstabsgetreu` })}
  <p class="scene-note">Durchschnittlicher Rüde und durchschnittliche Hündin beider Rassen, maßstabsgetreu neben einem 175 cm großen Menschen. Durchgezogene Linie = Rüde, gestrichelt = Hündin.</p>
  <div class="cta-row"><a class="btn" href="${toolLink([[A.id, "both"], [B.id, "both"]])}">Im Vergleichstool öffnen →</a></div>
</section>
<div class="cols">
<article class="prose">
  ${comparePhotos(A, B)}
  <h2>So unterscheiden sich die beiden Rassen</h2>
  ${sentences.map((t) => `<p>${esc(t)}</p>`).join("")}
  <h2>Nebeneinander</h2>
  ${table}
</article>
<aside class="side">
  <div class="card"><h2>Rasseporträts</h2>${breedCard(A)}${breedCard(B)}</div>
  ${moreList(A)}${moreList(B)}
</aside>
</div>
${faq.html}`;
    emit(url, page({
      url, current: "/de/vergleich/",
      title: `${n(A)} vs. ${n(B)}: Größenvergleich`,
      description: `${n(A)} vs. ${n(B)}: ${sentences[0]} Beide Rassen maßstabsgetreu, mit Größe und Gewicht von Rüde und Hündin.`.slice(0, 300),
      body, ld: [cr.ld, faq.ld, photoLd(A), photoLd(B)].filter(Boolean), ogImage: compareOg(A, B, url), ogAlt: `${n(A)} und ${n(B)} maßstabsgetreu nebeneinander`,
    }), p.curated ? 0.6 : 0.5, p.url);
  }

  function compareIndex() {
    const url = "/de/vergleich/";
    const cr = crumbs([home, [url, "Vergleiche"]]);
    const li = (p) => `<li><a href="${deCompareUrl(p)}">${esc(n(p.a))} vs. ${esc(n(p.b))}</a></li>`;
    const byGroup = GROUPS.map((g) => [g, PAIRS.filter((p) => !p.curated && p.a.group === g)]).filter(([, ps]) => ps.length);
    const body = `${cr.html}
<header class="page-head"><h1>Hunderassen im Größenvergleich</h1>
<p class="lede">${PAIRS.length} direkte Vergleiche beliebter und ähnlicher Rassen, jeweils maßstabsgetreu gezeichnet. Du suchst ein anderes Paar? <a href="/de/">Stell deinen eigenen Vergleich zusammen</a>, mit bis zu 10 Rassen.</p></header>
<section class="card"><h2>Beliebte Vergleiche</h2><ul class="link-cols">${PAIRS.filter((p) => p.curated).map(li).join("")}</ul></section>
${byGroup.map(([g, ps]) => `<section class="card"><h2>${esc(groupName(g))}</h2><ul class="link-cols">${ps.map(li).join("")}</ul></section>`).join("\n")}`;
    emit(url, page({ url, current: url, title: "Hunderassen im Größenvergleich: Wer ist größer?", description: `${PAIRS.length} Größenvergleiche von Hunderassen, maßstabsgetreu, mit Größe und Gewicht von Rüden und Hündinnen.`, body, ld: [cr.ld] }), 0.8, "/compare/");
  }

  // ======================================================================
  // Collections: breeds index, sizes, groups, origins
  // ======================================================================
  function collectionScene(bs, title) {
    const pick = spread([...bs].sort((a, b) => b.hAvg - a.hAvg), 6);
    return scene(pick.map((b, i) => ({ b, hCm: avg(b.m.h), label: n(b), sub: `${cm(avg(b.m.h))} cm`, color: COLORS[i] })), { ...SC, title, human: pick[0].hAvg > 25 ? 175 : 0 });
  }
  function collectionPage({ url, enUrl, title, h1, lede, intro, bs, related, crumbLabel, parent, desc }) {
    const sorted = [...bs].sort((a, b) => b.hAvg - a.hAvg);
    const cr = crumbs([home, parent, [url, crumbLabel]]);
    const tall = sorted[0], short = sorted[sorted.length - 1];
    const heavy = [...bs].sort((a, b) => b.wAvg - a.wAvg)[0], light = [...bs].sort((a, b) => a.wAvg - b.wAvg)[0];
    /** "der <a>Deutsche Schäferhund</a>" */
    const aDer = (b) => `${{ m: "der", f: "die", n: "das" }[D.gender(b)]} <a href="${breedUrl(b)}">${esc(name.weak(b))}</a>`;
    const stats = bs.length > 2 ? `<p>Am größten ist ${aDer(tall)} (Rüden ${H(tall.m.h)}), am kleinsten ${aDer(short)} (${H(short.m.h)}). Am schwersten ist ${aDer(heavy)} mit bis zu ${W1(heavy.m.w[1])}, am leichtesten ${aDer(light)} mit ${W(light.m.w)}.</p>` : "";
    const body = `${cr.html}
<header class="page-head"><h1>${esc(h1)}</h1><p class="lede">${lede}</p></header>
<section class="card">${collectionScene(bs, h1)}<p class="scene-note">Eine Auswahl von groß nach klein, durchschnittliche Rüden maßstabsgetreu${sorted[0].hAvg > 25 ? " neben einem 175 cm großen Menschen" : ""}.</p>
<div class="cta-row"><a class="btn" href="${toolLink(spread(sorted, 10).map((b) => [b.id, "m"]))}">Diese Rassen im Tool vergleichen →</a></div></section>
<article class="prose">${intro}${stats}</article>
<section><h2 class="sec-h">Alle ${bs.length} Rassen, die größten zuerst</h2>${breedGrid(sorted)}</section>
${related ? `<section class="card"><h2>Weitere Listen</h2><ul class="link-cols">${related}</ul></section>` : ""}`;
    emit(url, page({ url, current: "/de/rassen/", title, description: desc, body, ld: [cr.ld, { "@type": "ItemList", itemListElement: sorted.map((b, i) => ({ "@type": "ListItem", position: i + 1, url: L.SITE + breedUrl(b), name: n(b) })) }] }), 0.7, enUrl);
  }
  const sizeCounts = (bs) => listDe(SIZES.map((s) => [s, bs.filter((b) => b.size === s).length]).filter(([, k]) => k).map(([s, k]) => `${k} ${s === "Toy" ? (k === 1 ? "Zwerghunderasse" : "Zwerghunderassen") : `${SIZE_DE[s].adj} ${k === 1 ? "Rasse" : "Rassen"}`}`));

  function sizePages() {
    for (const s of SIZES) {
      const bs = BREEDS.filter((b) => b.size === s);
      const info = SIZE_DE[s];
      const nCabin = bs.filter((b) => cabin(b) !== "no").length;
      const intro = `<p>Auf dieser Website gilt eine Rasse als <strong>${s === "Toy" ? "Zwerghunderasse" : info.adj.replace(/e$/, "")}</strong>, wenn das durchschnittliche Gewicht erwachsener Rüden und Hündinnen ${s === "Giant" ? "bei 45 kg oder mehr" : s === "Toy" ? "unter 5 kg" : `zwischen ${info.limit.replace("–", " und ")}`} liegt. ${bs.length} der ${N} Rassen fallen in diese Klasse. Zuchtverbände und Tierärzte verwenden leicht andere Grenzen; eine Rasse nahe der Grenze kann anderswo ${s === "Toy" ? "als klein" : s === "Giant" ? "als groß" : "eine Klasse höher oder tiefer"} gelten. Mehr dazu unter <a href="/de/ratgeber/groessenklassen-bei-hunden/">Größenklassen bei Hunden</a>.</p>`
        + (nCabin ? `<p>${nCabin === bs.length ? "Alle" : nCabin} davon passen, zumindest als leichtere Tiere, unter die Kabinengrenze von ${CABIN.limitKg} kg für Hund und Tasche. Mehr unter <a href="/de/ratgeber/mit-hund-in-der-flugzeugkabine/">Mit Hund in der Flugzeugkabine</a>.</p>` : "")
        + `<p>Die typische Lebenserwartung dieser Rassen liegt hier im Schnitt bei ${num(round(sizeLifeAvg[s], 1))} Jahren.</p>`;
      collectionPage({
        url: sizeUrl(s), enUrl: L.sizeUrl(s), crumbLabel: info.list, parent: ["/de/rassen/", "Rassen"],
        title: `${info.list}: ${bs.length} Rassen nach Größe & Gewicht`,
        h1: info.list, lede: `${bs.length} Rassen: ${info.blurb}, im Durchschnitt ${info.limit} als erwachsene Hunde. Nach Größe sortiert, mit Werten für Rüden und Hündinnen.`,
        desc: `Alle ${bs.length} ${info.list.replace(/^\w/, (c) => c.toLowerCase())} (${info.limit}) mit Größe und Gewicht von Rüden und Hündinnen, maßstabsgetreu.`,
        intro, bs,
        related: SIZES.filter((x) => x !== s).map((x) => `<li><a href="${sizeUrl(x)}">${SIZE_DE[x].list}</a></li>`).join(""),
      });
    }
  }
  function groupPages() {
    for (const g of GROUPS) {
      const bs = BREEDS.filter((b) => b.group === g);
      const sorted = [...bs].sort((a, b) => b.hAvg - a.hAvg);
      collectionPage({
        url: groupUrl(g), enUrl: L.groupUrl(g), crumbLabel: groupName(g), parent: ["/de/rassen/", "Rassen"],
        title: `${groupName(g)} nach Größe: Größe & Gewicht aller Rassen`,
        h1: `${groupName(g)} nach Größe`,
        lede: `${bs.length} Rassen, ${esc(vom(sorted[0]))} bis ${esc(zum(sorted[sorted.length - 1]))}.`,
        desc: `Größe aller ${bs.length} Rassen der Gruppe ${groupName(g)}: Schulterhöhe und Gewicht von Rüden und Hündinnen, maßstabsgetreu.`,
        intro: `<p>${GROUP_DE[g].text}</p><p>Nach Größe umfasst die Gruppe ${sizeCounts(bs)}.</p><p class="muted small">${D.GROUP_NOTE}</p>`,
        bs,
        related: GROUPS.filter((x) => x !== g).map((x) => `<li><a href="${groupUrl(x)}">${esc(groupName(x))}</a></li>`).join(""),
      });
    }
  }
  /** "vom Irischen Wolfshund", "von der Deutschen Dogge" */
  const vom = (b) => name.dem(b).replace(/^dem /, "vom ").replace(/^der /, "von der ");
  const zum = (b) => name.dem(b).replace(/^dem /, "zum ").replace(/^der /, "zur ");
  function originPages() {
    for (const c of COUNTRIES) {
      const bs = BREEDS.filter((b) => b.country === c);
      const sorted = [...bs].sort((a, b) => b.hAvg - a.hAvg);
      const label = countryAdjList(c);
      collectionPage({
        url: countryUrl(c), enUrl: L.countryUrl(c), crumbLabel: label, parent: ["/de/rassen/", "Rassen"],
        title: `${label} nach Größe (${bs.length} Rassen)`,
        h1: label, lede: `${bs.length} Rassen aus ${esc(country(c).aus)}, nach Größe sortiert.`,
        desc: `${bs.length} Hunderassen aus ${country(c).aus}, ${vom(sorted[0])} bis ${zum(sorted[sorted.length - 1])}, mit Größe und Gewicht.`,
        intro: `<p>${bs.length} Rassen auf dieser Website stammen ursprünglich aus ${esc(country(c).aus)}: ${sizeCounts(bs)}. Rassen mit gemeinsamer oder umstrittener Herkunft stehen unter dem Land, das ihr Standard zuerst nennt.</p>`,
        bs,
        related: COUNTRIES.filter((x) => x !== c).map((x) => `<li><a href="${countryUrl(x)}">${esc(countryAdjList(x))}</a></li>`).join(""),
      });
    }
  }
  function breedsIndex() {
    const url = "/de/rassen/";
    const cr = crumbs([home, [url, "Rassen"]]);
    const sorted = D.sortDe(BREEDS);
    const first = (b) => n(b)[0].toUpperCase().replace("Ä", "A").replace("Ö", "O").replace("Ü", "U");
    const letters = [...new Set(sorted.map(first))];
    const body = `${cr.html}
<header class="page-head"><h1>Alle ${N} Hunderassen nach Größe</h1><p class="lede">Jede Rasse der Website mit Schulterhöhe und Gewicht für Rüden (♂) und Hündinnen (♀). Öffne eine Rasse für ihr vollständiges Größenprofil oder stöbere nach Größe, Gruppe oder Herkunftsland.</p></header>
<section class="card"><p class="finder-cta">Unsicher, welche Rasse passt? <a href="/de/rassefinder/">Nutze den Rassefinder</a> und filtere nach Größe, Energie, Haaren und Lebensstil.</p><h2>Nach Größe</h2><div class="pill-row">${SIZES.map((s) => `<a class="pill-link" href="${sizeUrl(s)}">${SIZE_DE[s].short} <span>${BREEDS.filter((b) => b.size === s).length}</span></a>`).join("")}</div>
<h2>Nach Gruppe</h2><div class="pill-row">${GROUPS.map((g) => `<a class="pill-link" href="${groupUrl(g)}">${esc(groupName(g))} <span>${BREEDS.filter((b) => b.group === g).length}</span></a>`).join("")}</div>
<h2>Nach Herkunft</h2><div class="pill-row">${COUNTRIES.map((c) => `<a class="pill-link" href="${countryUrl(c)}">${esc(country(c).name)} <span>${BREEDS.filter((b) => b.country === c).length}</span></a>`).join("")}</div></section>
<nav class="az" aria-label="Zu Buchstabe springen">${letters.map((l) => `<a href="#${l}">${l}</a>`).join("")}</nav>
${letters.map((l) => `<section id="${l}" class="az-sec"><h2 class="sec-h">${l}</h2>${breedGrid(sorted.filter((b) => first(b) === l))}</section>`).join("\n")}
<aside class="card suggest-cta"><h2>Fehlt eine Rasse?</h2><p>Wir ergänzen Rassen, nach denen gefragt wird. <a href="/de/rasse-vorschlagen/">Rasse vorschlagen →</a></p></aside>`;
    emit(url, page({ url, current: url, title: `Alle ${N} Hunderassen nach Größe: Größe & Gewicht von A–Z`, description: `Größe und Gewicht von ${N} Hunderassen von A bis Z, für Rüden und Hündinnen. Nach Größenklasse, Rassegruppe oder Herkunftsland.`, body, ld: [cr.ld] }), 0.9, "/breeds/");
  }

  // ======================================================================
  // Articles
  // ======================================================================
  const ARTICLES = [];
  const articleLd = (h1, date) => ({ "@type": "Article", headline: h1, inLanguage: "de", dateModified: date, author: { "@type": "Organization", name: D.SITE_NAME_DE }, publisher: { "@type": "Organization", name: "MILIVON" }, copyrightHolder: { "@type": "Organization", name: "MILIVON" } });
  function rankedArticle({ slug: s, en, title, h1, description, lede, intro, ranked, n: count, sceneN = 5, human = true, itemText, outro = "" }) {
    const url = `/de/ratgeber/${s}/`;
    const top = ranked.slice(0, count);
    const cr = crumbs([home, ["/de/ratgeber/", "Ratgeber"], [url, h1]]);
    const sc = scene(top.slice(0, sceneN).map((b, i) => ({ b, hCm: avg(b.m.h), label: `${i + 1}. ${n(b)}`, sub: `${cm(avg(b.m.h))} cm · ${kg(avg(b.m.w))} kg`, color: COLORS[i] })), { ...SC, title: h1, human: human ? 175 : 0 });
    const items = top.map((b, i) => `<li class="rank-item" id="${b.id}"><div class="rank-head"><span class="rank-n">${i + 1}</span><h3><a href="${breedUrl(b)}">${esc(n(b))}</a></h3></div>
    <div class="rank-body"><img src="${b.img}" alt="${esc(n(b))}" loading="lazy" decoding="async" width="140" height="96"><div><p class="rank-st">${b.sameSexes ? `${H(b.m.h)} · ${W(b.m.w)}` : `♂ ${H(b.m.h)} · ${W(b.m.w)}<br>♀ ${H(b.f.h)} · ${W(b.f.w)}`} · ${life(b.life)}</p><p>${esc(itemText(b, i))}</p></div></div></li>`).join("");
    const body = `${cr.html}
<header class="page-head"><h1>${esc(h1)}</h1><p class="lede">${lede}</p><p class="byline">Aktualisiert am ${deDate(today)} · Daten aus den Rassestandards der Zuchtverbände</p></header>
<section class="card">${sc}<p class="scene-note">Die ersten ${Math.min(sceneN, count)}, durchschnittliche Rüden maßstabsgetreu${human ? " neben einem 175 cm großen Menschen" : ""}.</p>
<div class="cta-row"><a class="btn" href="${toolLink(top.slice(0, 10).map((b) => [b.id, "m"]))}">Die ersten 10 im Tool vergleichen →</a></div></section>
<article class="prose">${intro}<ol class="rank-list">${items}</ol>${outro}</article>`;
    ARTICLES.push({ url, title: h1, description, date: today });
    emit(url, page({ url, current: "/de/ratgeber/", title, description, body, ld: [cr.ld, articleLd(h1, today), { "@type": "ItemList", itemListElement: top.map((b, i) => ({ "@type": "ListItem", position: i + 1, url: L.SITE + breedUrl(b), name: n(b) })) }] }), 0.7, `/articles/${en}/`);
  }
  const deDate = (iso) => { const [y, m, d] = iso.split("-"); return `${+d}. ${["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"][+m - 1]} ${y}`; };
  const groupIn = (b) => (b.group === "Designer / Mixed" ? "eine Designerrasse" : `zählt zu ${GROUP_DE[b.group].dat}`);

  function rankedArticles() {
    const byW = [...BREEDS].sort((a, b) => a.wAvg - b.wAvg);
    rankedArticle({
      slug: "kleinste-hunderassen", en: "smallest-dog-breeds", n: 15, human: false,
      title: "Die 15 kleinsten Hunderassen der Welt im Ranking",
      h1: "Die 15 kleinsten Hunderassen",
      description: `Die kleinsten Hunderassen nach durchschnittlichem Gewicht, angeführt vom ${n(byW[0])}, mit Größe und Gewicht von Rüden und Hündinnen.`,
      lede: "Sortiert nach dem durchschnittlichen Gewicht erwachsener Hunde, dem fairsten einzelnen Maß dafür, wie klein ein Hund ist. Alle passen in eine Transporttasche für die Flugzeugkabine.",
      intro: `<p>Größe und Gewicht stimmen nicht immer überein: Ein langer, niedriger Hund wie der Zwergdackel gehört zu den kleinsten Rassen, wiegt aber mehr als viele Schoßhunde. Diese Liste sortiert nach dem <strong>Durchschnittsgewicht</strong> von Rüden und Hündinnen. Nur nach Schulterhöhe sortiert findest du sie bei den <a href="${sizeUrl("Toy")}">Zwerghunderassen</a>.</p>`,
      ranked: byW,
      itemText: (b, i) => `${i === 0 ? "Die kleinste Rasse überhaupt. " : ""}${cap(name.der(b))} wiegt ${W(spanW(b))} und misst ${H(spanH(b))} an der Schulter, ${bodyLandmark(b.hAvg)} eines Erwachsenen. ${cap(pron(b))} ${groupIn(b)} und stammt ${ausOrigin(b.origin)}.`,
      outro: `<h2>Klein, aber nicht zerbrechlich</h2><p>Sehr kleine Hunde brauchen Vorsicht bei Treppen, Sofas und Kindern, und sie kühlen schnell aus. Dafür leben sie meist am längsten: Die Zwerghunderassen hier werden im Schnitt ${num(round(sizeLifeAvg.Toy, 1))} Jahre alt. Siehe <a href="/de/ratgeber/langlebigste-hunderassen/">die langlebigsten Hunderassen</a>.</p>`,
    });
    const byH = [...BREEDS].sort((a, b) => b.hAvg - a.hAvg);
    rankedArticle({
      slug: "groesste-hunderassen", en: "tallest-dog-breeds", n: 15,
      title: "Die 15 größten Hunderassen nach Schulterhöhe",
      h1: "Die 15 größten Hunderassen",
      description: `Die größten Hunderassen nach Schulterhöhe, angeführt vom ${n(byH[0])}, maßstabsgetreu neben einem Menschen.`,
      lede: "Sortiert nach der durchschnittlichen Schulterhöhe (Widerristhöhe) von Rüden und Hündinnen.",
      intro: `<p>Gemessen wird am Widerrist, nicht am Kopf. Ein großer Hund mit erhobenem Kopf wirkt daher viel größer als diese Zahlen. Ein Rüde der Rasse ${n(byH[0])} mit ${H1(byH[0].m.h[1])} kann sein Kinn auf die Küchenarbeitsplatte legen, und viele dieser Rassen kommen auf den Hinterbeinen stehend leicht an sie heran.</p>`,
      ranked: byH,
      itemText: (b) => `Rüden messen ${H(b.m.h)} an der Schulter, ${bodyLandmark(avg(b.m.h))} eines 175 cm großen Erwachsenen, und wiegen ${W(b.m.w)}. ${b.group === "Hound" && b.type === "sighthound" ? "Ein schlanker Windhund, auf Tempo gebaut und daher leichter, als seine Größe vermuten lässt." : ""}`.trim(),
      outro: `<h2>Groß oder schwer?</h2><p>Windhunde wie der Irische Wolfshund und der Deerhound sind groß, aber schlank; Doggen und Mastiffs sind bei gleicher Größe deutlich schwerer. Nach Gewicht sortiert: <a href="/de/ratgeber/schwerste-hunderassen/">die schwersten Hunderassen</a>.</p>`,
    });
    const byWd = [...BREEDS].sort((a, b) => b.wAvg - a.wAvg);
    rankedArticle({
      slug: "schwerste-hunderassen", en: "heaviest-dog-breeds", n: 15,
      title: "Die 15 schwersten Hunderassen nach Gewicht",
      h1: "Die 15 schwersten Hunderassen",
      description: `Die schwersten Hunderassen nach durchschnittlichem Gewicht, angeführt vom ${n(byWd[0])}, mit Gewichten für Rüden und Hündinnen.`,
      lede: "Sortiert nach dem durchschnittlichen Gewicht von Rüden und Hündinnen. Vor allem Mastiffs und Herdenschutzhunde.",
      intro: `<p>Für sehr große Rassen nennen Standards oft nur ein Mindestgewicht, und einzelne Rüden können deutlich schwerer sein als die Bereiche unten. Die Gewichte folgen den Standards der Zuchtverbände und Angaben der Rasseclubs; siehe <a href="/de/ueber-die-daten/">Über die Daten</a>.</p>`,
      ranked: byWd,
      itemText: (b) => `Rüden wiegen ${W(b.m.w)}, Hündinnen ${W(b.f.w)}. Mit ${H(b.m.h)} Schulterhöhe bei Rüden ${b.hAvg > 75 ? `gehört ${pron(b)} auch zu den größten Rassen` : `trägt ${pron(b)} das Gewicht auf einem vergleichsweise kompakten Körper`}.`,
      outro: `<h2>Was das Gewicht im Alltag bedeutet</h2><p>Hunde dieser Größe brauchen eine XL- oder XXL-Box (siehe <a href="/de/rechner/hundebox-groesse/">Hundebox-Rechner</a>), fliegen wenn überhaupt im Frachtraum und haben die kürzeste Lebenserwartung: Sehr große Rassen werden hier im Schnitt ${num(round(sizeLifeAvg.Giant, 1))} Jahre alt.</p>`,
    });
    const byL = [...BREEDS].sort((a, b) => b.lifeAvg - a.lifeAvg || b.life[1] - a.life[1] || a.wAvg - b.wAvg);
    rankedArticle({
      slug: "langlebigste-hunderassen", en: "longest-living-dog-breeds", n: 20, human: false,
      title: "Die 20 langlebigsten Hunderassen (und warum kleine Hunde länger leben)",
      h1: "Die 20 langlebigsten Hunderassen",
      description: "Hunderassen mit der höchsten typischen Lebenserwartung im Ranking, und wie die Größe die Lebensdauer über alle Rassen hinweg beeinflusst.",
      lede: "Sortiert nach der Mitte der typischen Lebenserwartung jeder Rasse. Kleine Rassen dominieren.",
      intro: `<p>Über alle ${N} Rassen dieser Website sinkt die typische Lebenserwartung mit der Größe: Zwerghunderassen werden im Schnitt ${num(round(sizeLifeAvg.Toy, 1))} Jahre alt, kleine ${num(round(sizeLifeAvg.Small, 1))}, mittelgroße ${num(round(sizeLifeAvg.Medium, 1))}, große ${num(round(sizeLifeAvg.Large, 1))} und sehr große ${num(round(sizeLifeAvg.Giant, 1))}. Große Hunde altern schneller, ein Muster, das die Forschung noch zu erklären versucht. Die Zahlen sind Schätzungen der Rasseclubs, keine Garantie.</p>`,
      ranked: byL,
      itemText: (b) => `Typische Lebenserwartung ${life(b.life)}. ${cap(SIZE_DE[b.size].adj)} Rasse mit ${W(spanW(b))}.`,
      outro: `<p>Große Rassen, die dem Trend trotzen, stehen bei den <a href="/de/ratgeber/langlebigste-grosse-hunderassen/">langlebigsten großen Hunderassen</a>. Das Alter deines Hundes in Menschenjahren berechnet der <a href="/de/rechner/hundejahre/">Hundejahre-Rechner</a>.</p>`,
    });
    const bigL = BREEDS.filter((b) => b.size === "Large" || b.size === "Giant").sort((a, b) => b.lifeAvg - a.lifeAvg || b.life[1] - a.life[1]);
    rankedArticle({
      slug: "langlebigste-grosse-hunderassen", en: "longest-living-large-dog-breeds", n: 12,
      title: "12 große Hunderassen, die am längsten leben",
      h1: "Große Hunderassen, die am längsten leben",
      description: "Große und sehr große Hunderassen mit der höchsten typischen Lebenserwartung, mit Größe und Gewicht.",
      lede: `Große und sehr große Rassen (Durchschnittsgewicht ab 25 kg), sortiert nach typischer Lebenserwartung. Der Durchschnitt großer Rassen liegt hier bei ${num(round(sizeLifeAvg.Large, 1))} Jahren.`,
      intro: `<p>Du möchtest einen großen Hund, der voraussichtlich lange bei dir bleibt? Diese großen und sehr großen Rassen haben unter den ${bigL.length} auf dieser Website die höchste typische Lebenserwartung.</p>`,
      ranked: bigL,
      itemText: (b) => `Typische Lebenserwartung ${life(b.life)}, bei ${W(spanW(b))} und ${H(spanH(b))} Schulterhöhe.`,
    });
  }

  // blocks usable inside content/de/*.md as {{name}}
  function contentBlocks() {
    const cabinYes = BREEDS.filter((b) => cabin(b) === "yes").sort((a, b) => a.wAvg - b.wAvg);
    const cabinSome = BREEDS.filter((b) => cabin(b) === "some").sort((a, b) => a.wAvg - b.wAvg);
    const NOTES = JSON.parse(fs.readFileSync(path.join(CONTENT, "airlines.json"), "utf8"));
    const tr = (s) => { if (!s) return s; if (!(s in NOTES)) throw new Error(`content/de/airlines.json: no German text for "${s}"`); return NOTES[s]; };
    const fmtLimit = (a) => (a.limitKg == null ? "Keine Gewichtsgrenze" : `${kg(a.limitKg)} kg${a.includesCarrier ? " inkl. Tasche" : ""}`);
    const spread3 = (bs) => spread(bs, 3);
    return {
      airline_table: `<div class="table-scroll"><table class="data-table"><thead><tr><th>Airline</th><th>Hund in der Kabine</th><th>Gewichtsgrenze</th><th>Max. Taschengröße</th><th>Hinweise</th><th>Quelle</th></tr></thead><tbody>${AIRLINES.airlines.map((a) => `<tr><td>${esc(a.name)}</td><td>${a.cabin ? "Ja" : "Nein"}</td><td>${a.cabin ? fmtLimit(a) : "–"}</td><td>${esc(tr(a.carrier) || "–")}</td><td>${esc(tr(a.notes) || "")}</td><td>${a.verified ? `<a href="${esc(a.source)}" rel="noopener nofollow">Website der Airline</a>` : `<a href="${esc(a.source)}" rel="noopener nofollow">Nicht bestätigt*</a>`}</td></tr>`).join("")}</tbody></table></div><p class="table-note">Zuletzt geprüft: ${esc(tr(AIRLINES.reviewed))}, jeweils anhand der Tier-Bestimmungen auf der Website der Airline. * Auf der Website der Airline konnten wir das nicht bestätigen; die Angabe stammt aus Reiseratgebern. Regeln ändern sich und unterscheiden sich oft nach Strecke, Flugzeug und Klasse. Frag vor der Buchung immer bei der Airline nach.</p>`,
      cabin_breeds: `<h3>Passen über den ganzen Gewichtsbereich (${cabinYes.length})</h3>${breedGrid(cabinYes)}<h3>Passen, wenn der Hund eher leicht ist (${cabinSome.length})</h3>${breedGrid(cabinSome)}`,
      cabin_count: `<p>${cabinYes.length} Rassen auf dieser Website bleiben über ihren ganzen Gewichtsbereich bei höchstens ${num(CABIN_MAX_DOG)} kg, ${cabinSome.length} weitere, wenn der einzelne Hund eher leicht ist.</p>`,
      size_class_table: `<div class="table-scroll"><table class="data-table"><thead><tr><th>Größenklasse</th><th>Durchschnittsgewicht erwachsen</th><th>Rassen auf dieser Website</th><th>Typische Schulterhöhe</th><th>Beispiele</th></tr></thead><tbody>${SIZES.map((s) => { const bs = BREEDS.filter((b) => b.size === s); const hs = bs.map((b) => b.hAvg).sort((a, b) => a - b); const ex = [...bs].sort((a, b) => b.hAvg - a.hAvg); return `<tr><td><a href="${sizeUrl(s)}">${SIZE_DE[s].short}</a></td><td>${SIZE_DE[s].limit}</td><td>${bs.length}</td><td>${cm(hs[Math.floor(hs.length * 0.1)])}–${cm(hs[Math.floor(hs.length * 0.9)])} cm</td><td>${spread3(ex).map((b) => `<a href="${breedUrl(b)}">${esc(n(b))}</a>`).join(", ")}</td></tr>`; }).join("")}</tbody></table></div>`,
      group_table: `<div class="table-scroll"><table class="data-table"><thead><tr><th>Gruppe</th><th>Rassen</th><th>Gezüchtet für</th></tr></thead><tbody>${GROUPS.map((g) => `<tr><td><a href="${groupUrl(g)}">${esc(groupName(g))}</a></td><td>${BREEDS.filter((b) => b.group === g).length}</td><td>${esc(GROUP_DE[g].text.split(". ")[0])}.</td></tr>`).join("")}</tbody></table></div><p class="table-note">${D.GROUP_NOTE}</p>`,
      measure_diagram: measureDiagram(),
      breed_count: String(N),
    };
  }
  function measureDiagram() {
    const b = BY_ID["labrador-retriever"], s = L.shapeOf(b);
    const k = 200, w = s.maxX * k, h = s.maxY * k, gx = 60, gy = 40 + h;
    const wx = gx + s.withersX * k, wy = gy - k;
    const u = L.bodyUnits(b);
    return `<figure class="scene diagram"><svg viewBox="0 0 ${gx + w + 120} ${gy + 50}" role="img" aria-label="Wo man einen Hund misst: Schulterhöhe, Länge und Kopfhöhe">
  <image href="${b.img}" x="${gx}" y="${gy - h}" width="${w}" height="${h}" preserveAspectRatio="none"/>
  <line class="sc-ground" x1="20" x2="${gx + w + 100}" y1="${gy}" y2="${gy}"/>
  <line class="dg-line" x1="${wx}" x2="${wx}" y1="${gy}" y2="${wy}"/><line class="dg-line" x1="${wx - 30}" x2="${wx + 30}" y1="${wy}" y2="${wy}"/>
  <text class="dg-text" x="${wx - 36}" y="${wy - 8}" text-anchor="end">Widerristhöhe</text>
  <line class="dg-line dg-alt" x1="${gx + w + 30}" x2="${gx + w + 30}" y1="${gy}" y2="${gy - h}"/><text class="dg-text" x="${gx + w + 36}" y="${gy - h + 14}">Kopfhöhe</text>
  <line class="dg-line dg-alt2" x1="${gx + w - u.len * k * 0.98}" x2="${gx + w * 0.98}" y1="${gy + 22}" y2="${gy + 22}"/><text class="dg-text" x="${gx + w / 2}" y="${gy + 42}" text-anchor="middle">Länge: Nase bis Rutenansatz</text>
  </svg></figure>`;
  }

  function mdArticles(blocks) {
    const dir = path.join(CONTENT, "articles");
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort()) {
      const { meta, body: md } = frontMatter(fs.readFileSync(path.join(dir, f), "utf8"));
      const s = f.replace(/\.md$/, "");
      const url = `/de/ratgeber/${s}/`;
      const h1 = meta.h1 || meta.title;
      const cr = crumbs([home, ["/de/ratgeber/", "Ratgeber"], [url, h1]]);
      const date = meta.date || today;
      const body = `${cr.html}
<header class="page-head"><h1>${esc(h1)}</h1>${meta.lede ? `<p class="lede">${L.inline(meta.lede)}</p>` : ""}<p class="byline">Aktualisiert am ${deDate(date)}</p></header>
<article class="prose prose-wide">${markdown(md, blocks)}</article>`;
      ARTICLES.push({ url, title: h1, description: meta.description, date });
      emit(url, page({ url, current: "/de/ratgeber/", title: meta.title, description: meta.description, body, ld: [cr.ld, articleLd(h1, date)] }), 0.7, meta.en ? `/articles/${meta.en}/` : null);
    }
  }
  function articlesIndex() {
    const url = "/de/ratgeber/";
    const cr = crumbs([home, [url, "Ratgeber"]]);
    const body = `${cr.html}
<header class="page-head"><h1>Ratgeber und Artikel</h1><p class="lede">Ranglisten auf Basis der Rassestandards und praktische Ratgeber zum Messen, zur Hundebox und zum Fliegen mit Hund.</p></header>
<div class="art-grid">${ARTICLES.map((a) => `<a class="art-card" href="${a.url}"><h2>${esc(a.title)}</h2><p>${esc(a.description)}</p></a>`).join("")}</div>`;
    emit(url, page({ url, current: url, title: "Ratgeber zu Hundegrößen", description: "Die kleinsten, größten und schwersten Hunderassen, Airline-Regeln für Flüge mit Hund und wie du deinen Hund richtig misst.", body, ld: [cr.ld] }), 0.8, "/articles/");
  }
  function aboutPage(blocks) {
    const url = "/de/ueber-die-daten/";
    const file = path.join(CONTENT, "about.md");
    if (!fs.existsSync(file)) return;
    const { meta, body: md } = frontMatter(fs.readFileSync(file, "utf8"));
    const cr = crumbs([home, [url, "Über die Daten"]]);
    const body = `${cr.html}<header class="page-head"><h1>${esc(meta.h1)}</h1><p class="lede">${L.inline(meta.lede)}</p></header><article class="prose prose-wide">${markdown(md, blocks)}</article>`;
    emit(url, page({ url, title: meta.title, description: meta.description, body, ld: [cr.ld] }), 0.4, "/about/");
  }

  // ======================================================================
  // Bildnachweise
  // ======================================================================
  function photoCreditsPage() {
    const url = L.PHOTO_CREDITS_URL.de;
    const rows = BREEDS.filter((b) => b.photo).sort((a, b) => n(a).localeCompare(n(b), "de")).map((b) => ({ b, name: n(b), url: breedUrl(b) }));
    const cr = crumbs([home, ["/de/ueber-die-daten/", "Über die Daten"], [url, "Bildnachweise"]]);
    const body = `${cr.html}
<header class="page-head"><h1>Bildnachweise</h1><p class="lede">Die ${rows.length} Rassefotos auf dieser Website stammen von Wikimedia Commons. Danke an alle, die sie aufgenommen und geteilt haben.</p></header>
<section class="card prose prose-wide">
<p>Jedes Foto wird unter der unten genannten Lizenz verwendet: Creative Commons Namensnennung (CC BY), Namensnennung – Weitergabe unter gleichen Bedingungen (CC BY-SA), CC0 oder gemeinfrei. Über den Quell-Link findest du die Originaldatei, die vollständigen Angaben zum Urheber und die Lizenzbedingungen. Für die Fotos gilt nicht der Urheberrechtshinweis dieser Website. Du darfst sie unter ihren eigenen Lizenzen weiterverwenden.</p>
<p><strong>Änderungen:</strong> Die Fotos sind verkleinert und ins WebP-Format umgewandelt. Die kleinen Vorschaubilder auf den Rassekarten sind zusätzlich auf ein 4:3-Format zugeschnitten. Bei CC BY-SA stehen diese bearbeiteten Fassungen unter derselben Lizenz wie das Original.</p>
<p>Die Urheber sind so genannt, wie sie auf der jeweiligen Commons-Dateiseite stehen, teils mit ihrem Wikimedia-Benutzernamen. Wenn du eines dieser Fotos aufgenommen hast und anders genannt werden möchtest oder es entfernt haben willst, <a href="https://github.com/${REPO}/issues">sag uns Bescheid</a>.</p>
</section>
<section class="card">${L.photoCreditsTable(rows, "de")}</section>`;
    emit(url, page({ url, title: "Bildnachweise", description: `Urheber, Lizenzen und Quellen der ${rows.length} Rassefotos von Wikimedia Commons auf dem Hundegrößen-Vergleich.`, body, ld: [cr.ld] }), 0.2, L.PHOTO_CREDITS_URL.en);
  }

  // ======================================================================
  // Poster
  // ======================================================================
  function postersPage() {
    const url = L.POSTERS_URL.de;
    const cr = crumbs([home, [url, "Poster"]]);
    const body = `${cr.html}
<header class="page-head"><h1>Hundegrößen-Poster</h1><p class="lede">Kostenlose Poster mit Hunderassen in maßstabsgetreuer Darstellung, mit denselben Illustrationen und Rassestandard-Größen wie im <a href="/de/">Vergleichstool</a>.</p></header>
${L.posterCards(["podencosDe", "akc"], "de")}
<section class="card prose prose-wide"><h2>Teilen und drucken</h2>
<p>Du darfst die Poster gern für zu Hause, die Schule oder den Verein ausdrucken und in Foren, Gruppen und sozialen Netzwerken teilen. Bitte lass den Hinweis auf dem Poster stehen und verlinke nach Möglichkeit auf dogsizecomparison.com. Für eine kommerzielle Nutzung <a href="https://github.com/${REPO}/issues">frag uns bitte vorher</a>.</p>
<p>Die Größen sind die Widerristhöhen (höchster Punkt der Schulter) laut Rassestandard. Einzelne Hunde können größer oder kleiner sein. Woher die Zahlen stammen, steht unter <a href="/de/ueber-die-daten/">Über die Daten</a>.</p></section>`;
    emit(url, page({ url, title: "Hundegrößen-Poster: Alle Podencos und alle AKC-Rassen maßstabsgetreu", description: "Kostenlose Poster zum Ausdrucken: alle Podencos mit ihren Verwandten rund ums Mittelmeer und alle vom AKC anerkannten Rassen, maßstabsgetreu.", body, ld: [cr.ld] }), 0.5, L.POSTERS_URL.en);
  }

  // ======================================================================
  // Suggest a breed
  // ======================================================================
  function suggestPage() {
    const url = "/de/rasse-vorschlagen/";
    const cr = crumbs([home, ["/de/rassen/", "Rassen"], [url, "Rasse vorschlagen"]]);
    const known = BREEDS.map((b) => [n(b), breedUrl(b), [b.name, ...b.aliases]]);
    const body = `${cr.html}
<header class="page-head"><h1>Hunderasse vorschlagen</h1><p class="lede">Dir fehlt eine Rasse? Sag uns, welche, dann suchen wir ihren Rassestandard heraus und nehmen sie ins Vergleichstool auf. Derzeit sind ${N} Rassen aufgeführt.</p></header>
<section class="card">
<form id="suggest-form" class="calc-form suggest-form" novalidate>
  <label class="fld"><span>Name der Rasse *</span><input name="breed" required maxlength="80" autocomplete="off" placeholder="z. B. Podenco Campanero"></label>
  <p id="suggest-known" class="suggest-known" hidden></p>
  <label class="fld"><span>Herkunftsland</span><input name="origin" maxlength="60" placeholder="z. B. Spanien"></label>
  <label class="fld"><span>Zuchtverband oder Standard, falls bekannt</span><input name="standard" maxlength="200" placeholder="z. B. FCI-Nr. 123, RSCE, Link zum Standard"></label>
  <label class="fld"><span>Sonst noch etwas?</span><textarea name="notes" rows="4" maxlength="1000" placeholder="Größen, Varietäten, andere Namen …"></textarea></label>
  <div><button class="btn" type="submit">Vorschlag senden</button></div>
  <p class="muted small">Vorschläge werden als öffentliches Issue auf unserer <a href="https://github.com/${REPO}/issues">GitHub-Seite</a> veröffentlicht; dafür brauchst du ein kostenloses GitHub-Konto. Bitte gib keine persönlichen Daten an.</p>
</form>
</section>
<script>
(function () {
  var KNOWN = ${JSON.stringify(known).replace(/</g, "\\u003c")};
  var REPO = ${JSON.stringify(REPO)};
  var slug = function (s) { return s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim(); };
  var f = document.getElementById("suggest-form"), out = document.getElementById("suggest-known");
  var q = new URLSearchParams(location.search).get("breed");
  if (q) f.breed.value = q.slice(0, 80);
  function check() {
    var v = slug(f.breed.value);
    var hits = v.length < 3 ? [] : KNOWN.filter(function (k) { return [k[0]].concat(k[2]).some(function (n) { var s = slug(n); return s.indexOf(v) >= 0 || v.indexOf(s) >= 0; }); }).slice(0, 4);
    out.hidden = !hits.length;
    out.innerHTML = hits.length ? "Schon auf der Website: " + hits.map(function (k) { return '<a href="' + k[1] + '">' + k[0].replace(/[&<>]/g, "") + "</a>"; }).join(", ") : "";
  }
  f.breed.addEventListener("input", check); check();
  f.addEventListener("submit", function (e) {
    e.preventDefault();
    var b = f.breed.value.trim();
    if (!b) { f.breed.focus(); return; }
    var body = "**Breed:** " + b + "\\n**Origin:** " + (f.origin.value.trim() || "-") + "\\n**Standard:** " + (f.standard.value.trim() || "-") + "\\n\\n" + (f.notes.value.trim() || "") + "\\n\\n_Sent from dogsizecomparison.com/de/rasse-vorschlagen/_";
    window.open("https://github.com/" + REPO + "/issues/new?title=" + encodeURIComponent("Breed suggestion: " + b) + "&body=" + encodeURIComponent(body), "_blank", "noopener");
  });
})();
</script>`;
    emit(url, page({ url, current: "/de/rassen/", title: "Hunderasse vorschlagen", description: `Dir fehlt eine Hunderasse? Schlag sie vor, und wir nehmen sie in den Hundegrößen-Vergleich auf. Bisher ${N} Rassen.`, body, ld: [cr.ld] }), 0.3, "/suggest-a-breed/");
  }

  // ======================================================================
  // Breed finder
  // ======================================================================
  function finderPage() {
    const url = "/de/rassefinder/";
    const cr = crumbs([home, ["/de/rassen/", "Rassen"], [url, "Rassefinder"]]);
    const chips = (nm, opts) => `<div class="chips" role="group" data-f="${nm}">${opts.map(([v, t]) => `<button type="button" data-v="${v}" aria-pressed="false">${t}</button>`).join("")}</div>`;
    const check = (nm, label) => `<label class="chk"><input type="checkbox" name="${nm}"> <span>${label}</span></label>`;
    const lvl = ["Niedrig", "Mittel", "Hoch"];
    const card = (b) => {
      const t = b.traits;
      const attrs = ` data-id="${b.id}" data-size="${b.size.toLowerCase()}" data-group="${L.groupSlug(b.group)}" data-h="${round(b.hAvg, 1)}" data-w="${round(b.wAvg, 1)}" data-cabin="${cabin(b)}" ${TRAIT_KEYS.map((k) => `data-${k}="${t[k]}"`).join(" ")}`;
      return breedCard(b, { attrs, extra: `${SIZE_DE[b.size].short} · Energie ${lvl[t.energy - 1].toLowerCase()} · haart ${["wenig", "mittel", "stark"][t.shed - 1]}` });
    };
    const sorted = D.sortDe(BREEDS);
    const nm = (id) => n(BY_ID[id]);
    const faq = faqBlock([
      ["Welche Hunderassen eignen sich für die Wohnung?", `Kleine, ruhige Rassen kommen meist am besten mit dem Leben in einer Wohnung zurecht, zum Beispiel ${listDe(["cavalier-king-charles-spaniel", "french-bulldog", "shih-tzu", "bichon-frise", "havanese"].map((id) => name.der(BY_ID[id])))}. Auch manche große, aber gelassene Rassen wie der Greyhound kommen gut zurecht. Die Energie zählt mehr als die Größe: Ein gelangweilter Terrier oder Hütehund ist in einer Wohnung schwieriger als ein verschlafener Riese.`],
      ["Welche Hunderassen haaren am wenigsten?", "Rassen mit ständig nachwachsendem Fell wie Pudel, Bichon Frisé, Malteser, Havaneser und die Schnauzer haaren sehr wenig, ebenso Nackthunde wie der Chinesische Schopfhund. Kein Hund ist wirklich hypoallergen: Wenig haarendes Fell muss dafür regelmäßig geschnitten oder gebürstet werden."],
      ["Welche Rassen eignen sich für Anfänger?", `Rassen, die als lernwillig und unkompliziert gelten, etwa ${listDe(["cavalier-king-charles-spaniel", "labrador-retriever", "golden-retriever", "standard-poodle", "papillon"].map((id) => name.der(BY_ID[id])))}. Eigenständige Wachhunde, Windhunde und triebstarke Arbeitsrassen sind bei erfahrenen Haltern besser aufgehoben.`],
      ["Wie kommen die Bewertungen zustande?", "Jede Rasse wird von 1 bis 3 bewertet: Energie, Haaren, Fellpflege, wie sie meist mit Kindern ist und wie gut sie zu Anfängern und zum Wohnungsleben passt. Die Bewertungen fassen Beschreibungen von Rasseclubs und Zuchtverbänden zusammen. Sie beschreiben typische Hunde der Rasse, nicht einen einzelnen Hund. Lerne den Hund also immer kennen und sprich mit Züchtern oder dem Tierschutz."],
    ], "Rassefinder: häufige Fragen");
    const body = `${cr.html}
<header class="page-head"><h1>Rassefinder für Hunde</h1><p class="lede">Filtere ${N} Rassen nach Größe, Energie, Haaren und Lebensstil und finde Hunde, die zu deinem Zuhause passen. Jedes Ergebnis führt zum vollständigen Größenprofil der Rasse.</p></header>
<div class="finder">
<form class="card finder-form" id="finder" onsubmit="return false" aria-label="Rassefilter">
  <div class="ff"><span class="ff-k">Größe</span>${chips("size", SIZES.map((s) => [s.toLowerCase(), SIZE_DE[s].short]))}</div>
  <div class="ff"><span class="ff-k">Energie</span>${chips("energy", lvl.map((t, i) => [i + 1, t]))}</div>
  <div class="ff"><span class="ff-k">Lebensstil</span>
    ${check("shed", "Haart wenig")}
    ${check("groom", "Pflegeleichtes Fell")}
    ${check("kids", "Sehr gut mit Kindern")}
    ${check("novice", "Gut für Anfänger")}
    ${check("apt", "Passt in eine Wohnung")}
    ${check("cabin", "Darf in die Kabine (8-kg-Grenze)")}
  </div>
  <label class="ff"><span class="ff-k">Gruppe</span><select name="group"><option value="">Alle Gruppen</option>${GROUPS.map((g) => `<option value="${L.groupSlug(g)}">${esc(groupName(g))}</option>`).join("")}</select></label>
  <label class="ff"><span class="ff-k">Sortieren</span><select name="sort"><option value="name">Name</option><option value="h-desc">Größte zuerst</option><option value="h-asc">Kleinste zuerst</option><option value="w-desc">Schwerste zuerst</option><option value="w-asc">Leichteste zuerst</option></select></label>
  <button type="button" class="btn-link" id="finder-reset">Filter zurücksetzen</button>
</form>
<section class="finder-res" aria-live="polite">
  <div class="finder-bar"><p id="finder-count"><strong>${N}</strong> Rassen</p><a class="btn" id="finder-compare" href="${toolLink(sorted.slice(0, 10).map((b) => [b.id, "m"]))}">Im Tool vergleichen →</a></div>
  <div class="bgrid" id="finder-grid">${sorted.map(card).join("")}</div>
  <p id="finder-empty" class="card" hidden>Keine Rasse erfüllt alle diese Filter. Entferne einen Filter oder <a href="/de/rasse-vorschlagen/">schlag eine fehlende Rasse vor</a>.</p>
</section>
</div>
<aside class="disclaimer" role="note">Die Bewertungen sind allgemeine Tendenzen der Rassen, zusammengefasst aus Beschreibungen von Rasseclubs und Zuchtverbänden. Einzelne Hunde unterscheiden sich je nach Genetik, Aufzucht und Erziehung stark. Lerne den Hund kennen und sprich vor der Entscheidung mit Züchtern, Tierschutz und deiner Tierarztpraxis. <a href="/de/ueber-die-daten/#haftungsausschluss">Haftungsausschluss</a>.</aside>
${faq.html}
<script src="/js/i18n-de.js" defer></script>
<script src="/js/finder.js" defer></script>`;
    emit(url, page({
      url, current: url,
      title: "Rassefinder: Hunderassen nach Größe, Energie & Haaren filtern",
      description: `Finde die passende Hunderasse: Filtere ${N} Rassen nach Größe, Energie, Haaren, Fellpflege, Wohnungstauglichkeit, Kindern und Eignung für Anfänger.`,
      body, ld: [cr.ld, faq.ld, { "@type": "WebApplication", name: "Rassefinder für Hunde", inLanguage: "de", url: L.SITE + url, applicationCategory: "ReferenceApplication", operatingSystem: "Any", offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" } }],
    }), 0.8, "/breed-finder/");
  }

  // ======================================================================
  // Calculators
  // ======================================================================
  const CALC_DISCLAIMER = {
    "puppy-weight": "Das ist eine grobe Schätzung auf Basis typischer Wachstumskurven, keine Vorhersage für deinen Welpen. Das Wachstum hängt von Genetik, Futter und Gesundheit ab. Wenn du dir Sorgen um Gewicht oder Wachstum deines Welpen machst, frag in deiner Tierarztpraxis nach.",
    "crate-size": "Ergebnisse nach Rasse sind Schätzungen aus typischen Körperproportionen. Miss deinen Hund und prüfe vor dem Kauf die Innenmaße des Herstellers. Für Flugboxen gelten die eigenen (IATA-)Maßregeln der Airlines.",
    "airline-cabin": "Airline-Regeln ändern sich oft und unterscheiden sich nach Strecke, Flugzeug, Klasse und Zielland. Dieser Check prüft nur das Gewicht und ist keine Reiseberatung: Prüfe vor der Buchung immer die aktuellen Tier-Bestimmungen, Taschenmaße und Einreiseregeln bei deiner Airline. Für Reiseentscheidungen auf Basis dieses Tools übernehmen wir keine Haftung.",
    "dog-years": "Die Umrechnung von Hunde- in Menschenjahre ist eine Annäherung zur groben Orientierung und kein Maß für die Gesundheit deines Hundes. Wie dein Hund altert, kann dir deine Tierarztpraxis sagen.",
  };
  const CALCS = [
    { slug: "puppy-weight", de: "welpengewicht", title: "Welpen-Rechner: Wie groß wird mein Welpe?", h1: "Wie groß wird mein Welpe?", desc: "Schätze das Endgewicht deines Welpen anhand von Rasse, Alter und aktuellem Gewicht und vergleiche es mit dem Rassestandard." },
    { slug: "crate-size", de: "hundebox-groesse", title: "Hundebox-Rechner: Die richtige Größe nach Rasse oder Maßen", h1: "Hundebox-Rechner", desc: "Finde die passende Boxgröße für deinen Hund, nach Rasse oder nach eigenen Maßen, mit gängigen Boxgrößen in Zentimetern." },
    { slug: "airline-cabin", de: "flugzeugkabine", title: "Darf mein Hund in die Flugzeugkabine? Gewichts-Check für Airlines", h1: "Darf mein Hund in die Kabine?", desc: "Prüfe das Gewicht deines Hundes gegen die Kabinenregeln großer Airlines, nach Rasse oder genauem Gewicht." },
    { slug: "dog-years", de: "hundejahre", title: "Hundejahre in Menschenjahre umrechnen (nach Größe)", h1: "Hundejahre in Menschenjahre", desc: "Rechne das Alter deines Hundes in Menschenjahre um, mit größenabhängiger Alterung und der neueren DNA-basierten Formel." },
  ];
  const breedOptions = (placeholder) => `<option value="">${placeholder}</option>` + D.sortDe(BREEDS).map((b) => `<option value="${b.id}">${esc(n(b))}</option>`).join("");
  const sizeOptions = () => SIZES.map((s) => `<option value="${s}"${s === "Medium" ? " selected" : ""}>${SIZE_DE[s].short}</option>`).join("");

  function calcBody(c) {
    const sexSeg = `<div class="seg" role="group" aria-label="Geschlecht" data-field="sex"><button type="button" data-v="m" aria-pressed="true">♂ Rüde</button><button type="button" data-v="f" aria-pressed="false">♀ Hündin</button></div>`;
    if (c.slug === "puppy-weight") return {
      form: `<label class="fld"><span>Rasse</span><select name="breed">${breedOptions("Mischling / weiß nicht")}</select></label>
<label class="fld" data-show="nobreed"><span>Erwartete Größe</span><select name="size">${sizeOptions()}</select></label>
<div class="fld"><span>Geschlecht</span>${sexSeg}</div>
<label class="fld"><span>Alter</span><span class="inline"><input name="age" type="number" min="6" max="104" step="1" value="16" inputmode="numeric"><select name="ageUnit"><option value="w">Wochen</option><option value="m">Monate</option></select></span></label>
<label class="fld"><span>Aktuelles Gewicht</span><span class="inline"><input name="weight" type="number" min="0.2" max="100" step="0.1" value="8" inputmode="decimal"><span class="unit" data-unit="w">kg</span></span></label>`,
      content: `<h2>So funktioniert die Schätzung</h2><p>Welpen wachsen anfangs schnell und dann immer langsamer. Kleine Rassen erreichen ihr Endgewicht mit etwa 9–12 Monaten, sehr große Rassen legen noch bis zum Alter von 18–24 Monaten zu. Der Rechner teilt das aktuelle Gewicht deines Welpen durch den Anteil am Endgewicht, den ein typischer Welpe dieser Größe in diesem Alter erreicht hat.</p>
<div class="table-scroll"><table class="data-table"><thead><tr><th>Alter</th>${SIZES.map((s) => `<th>${SIZE_DE[s].short}</th>`).join("")}</tr></thead><tbody>${[8, 12, 16, 20, 26, 39, 52, 78].map((wk) => `<tr><td>${wk < 26 ? `${wk} Wochen` : `${round(wk / 4.345, 0)} Monate`}</td>${SIZES.map((s) => `<td>${pct(L.growthShare(s, wk))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
<p class="table-note">Typischer Anteil am Endgewicht nach Größe des erwachsenen Hundes. Erstellt aus veröffentlichten Wachstumskurven; einzelne Welpen weichen um 15 % oder mehr ab.</p>
<h2>Warum es nur eine Schätzung ist</h2><ul><li>Welpen wachsen in Schüben, eine einzelne Messung kann täuschen. Wiege wöchentlich und nimm den Durchschnitt.</li><li>Mischlinge können nach einem der Elternteile kommen. Pfotengröße und das Gewicht der Eltern sind so aussagekräftig wie jede Formel.</li><li>Zu wenig oder zu viel Futter verändert die Kurve. Ob dein Welpe gut im Futter steht, kann dir deine Tierarztpraxis sagen.</li></ul>`,
      faq: [["Wann ist ein Hund ausgewachsen?", "Zwerghunde und kleine Rassen erreichen ihre Endgröße mit etwa 6–8 Monaten und ihr Endgewicht mit 9–12 Monaten. Mittelgroße Rassen sind mit etwa 12 Monaten fertig, große mit 12–18 Monaten und sehr große mit 18–24 Monaten."], ["Wiegt ein Welpe mit 4 Monaten die Hälfte seines Endgewichts?", "Bei mittelgroßen Rassen stimmt das ungefähr mit 4–5 Monaten. Kleine Rassen haben die Hälfte mit 4 Monaten schon überschritten; große und sehr große Rassen erreichen die Hälfte später, mit etwa 5–7 Monaten."]],
    };
    if (c.slug === "crate-size") return {
      form: `<div class="fld"><span>Größe nach</span><div class="seg" role="group" data-field="mode"><button type="button" data-v="breed" aria-pressed="true">Rasse</button><button type="button" data-v="measure" aria-pressed="false">Eigenen Maßen</button></div></div>
<label class="fld" data-show="breed"><span>Rasse</span><select name="breed">${breedOptions("Rasse wählen")}</select></label>
<div class="fld" data-show="breed"><span>Geschlecht</span>${sexSeg}</div>
<label class="fld" data-show="measure"><span>Länge, Nase bis Rutenansatz</span><span class="inline"><input name="len" type="number" min="10" max="200" step="1" value="80"><span class="unit" data-unit="h">cm</span></span></label>
<label class="fld" data-show="measure"><span>Höhe, Boden bis Scheitel</span><span class="inline"><input name="top" type="number" min="10" max="150" step="1" value="65"><span class="unit" data-unit="h">cm</span></span></label>`,
      content: `<h2>So findest du die richtige Boxgröße</h2><p>Ein Hund sollte in der Box stehen können, ohne den Kopf einzuziehen, sich umdrehen und ausgestreckt auf der Seite liegen können. Die übliche Regel: Die Innenlänge der Box ist die Länge deines Hundes von der Nase bis zum Rutenansatz plus etwa 7,5 cm, die Innenhöhe seine Kopfhöhe im Stehen plus etwa 5 cm. Siehe <a href="/de/ratgeber/hund-richtig-messen/">Hund richtig messen</a>.</p>
<p>Bei Rassen geht der Rechner von einem Hund im oberen Teil des Größenbereichs aus, damit die meisten erwachsenen Hunde hineinpassen. Ist dein Hund groß für seine Rasse, miss ihn nach. Für einen Welpen kaufst du die Box in Endgröße und verkleinerst sie mit einem Trenngitter.</p>
<h2>Gängige Boxgrößen</h2><div class="table-scroll"><table class="data-table"><thead><tr><th>Größe</th><th>Länge × Breite × Höhe</th><th>Typische Hunde</th></tr></thead><tbody>${L.CRATES.map((k) => `<tr><td>${k.name}</td><td>${Math.round(k.l * 2.54)} × ${Math.round(k.w * 2.54)} × ${Math.round(k.h * 2.54)} cm</td><td>${esc(crateExamples(k))}</td></tr>`).join("")}</tbody></table></div><p class="table-note">Außenmaße gängiger Drahtboxen (nach Zoll-Größen, gerundet). Innen ist etwas weniger Platz als außen; das berücksichtigt der Rechner.</p>`,
      faq: [["Sollte eine Hundebox eher groß oder klein sein?", "Gerade groß genug, dass dein Hund stehen, sich umdrehen und ausgestreckt liegen kann. In einer viel größeren Box nutzt ein Welpe leicht eine Ecke als Toilette, das erschwert die Stubenreinheit."], ["Welche Boxgröße für einen Welpen?", "Kauf die Box für die Endgröße und verkleinere den Raum mit einem Trenngitter, solange der Welpe wächst."]],
    };
    if (c.slug === "airline-cabin") return {
      form: `<div class="fld"><span>Gewicht nach</span><div class="seg" role="group" data-field="mode"><button type="button" data-v="breed" aria-pressed="true">Rasse</button><button type="button" data-v="weight" aria-pressed="false">Gewicht meines Hundes</button></div></div>
<label class="fld" data-show="breed"><span>Rasse</span><select name="breed">${breedOptions("Rasse wählen")}</select></label>
<div class="fld" data-show="breed"><span>Geschlecht</span>${sexSeg}</div>
<label class="fld" data-show="weight"><span>Gewicht des Hundes</span><span class="inline"><input name="weight" type="number" min="0.5" max="100" step="0.1" value="6"><span class="unit" data-unit="w">kg</span></span></label>
<label class="fld"><span>Gewicht der Tasche</span><span class="inline"><input name="carrier" type="number" min="0" max="10" step="0.1" value="1.5"><span class="unit" data-unit="w">kg</span></span></label>`,
      content: `<h2>So funktionieren die Kabinenregeln</h2><p>Airlines, die Haustiere in der Kabine erlauben, setzen zwei Arten von Grenzen: eine <strong>Gewichtsgrenze</strong>, meist für Hund und Tasche zusammen, und eine <strong>Taschengröße</strong>, die unter den Vordersitz passt. Europäische Airlines begrenzen das Gesamtgewicht meist auf 8 kg; mehrere nordamerikanische Airlines setzen keine Gewichtsgrenze, aber der Hund muss trotzdem in eine Tasche unter dem Sitz passen und darin stehen und sich umdrehen können.</p>
<p>Weiche Transporttaschen wiegen etwa 1–2 kg. Wiege deine mit der Decke, die du verwenden willst. Alle Regeln findest du unter <a href="/de/ratgeber/mit-hund-in-der-flugzeugkabine/">Mit Hund in der Flugzeugkabine</a>.</p>`,
      faq: [["Wie schwer darf ein Hund in der Flugzeugkabine sein?", "Die meisten europäischen Airlines erlauben 8 kg für Hund und Tasche zusammen. Mehrere US-Airlines setzen keine Gewichtsgrenze, verlangen aber eine Tasche, die unter den Sitz passt. Manche Airlines, darunter British Airways, Ryanair und easyJet, nehmen außer Assistenzhunden gar keine Tiere in der Kabine mit."], ["Welche Hunderassen dürfen in die Kabine?", "Rassen, die unter etwa 6,5 kg bleiben, wie Chihuahua, Yorkshire Terrier, Zwergspitz, Malteser und Toypudel. Kleine Rassen wie Shih Tzu oder Zwergdackel passen oft, wenn der Hund eher leicht ist."]],
    };
    return {
      form: `<div class="fld"><span>Alter des Hundes</span><span class="inline"><input name="years" type="number" min="0" max="25" step="1" value="5" aria-label="Jahre"><span class="unit">Jahre</span><input name="months" type="number" min="0" max="11" step="1" value="0" aria-label="Monate"><span class="unit">Monate</span></span></div>
<label class="fld"><span>Rasse</span><select name="breed">${breedOptions("Mischling / weiß nicht")}</select></label>
<label class="fld" data-show="nobreed"><span>Größe erwachsen</span><select name="size">${sizeOptions()}</select></label>`,
      content: `<h2>Warum „mal 7“ falsch ist</h2><p>Hunde entwickeln sich sehr schnell: Ein einjähriger Hund ist etwa so weit wie ein 15-jähriger Mensch, ein zweijähriger wie ein 24-jähriger. Danach altern Hunde langsamer, wie viel langsamer, hängt aber von der Größe ab. Große und sehr große Hunde altern später schneller, deshalb leben sie kürzer.</p>
<div class="table-scroll"><table class="data-table"><thead><tr><th>Alter des Hundes</th>${["Zwerg & klein", "Mittel", "Groß", "Riesig"].map((s) => `<th>${s}</th>`).join("")}</tr></thead><tbody>${[1, 2, 3, 5, 7, 10, 12, 14, 16].map((y) => `<tr><td>${y} ${y > 1 ? "Jahre" : "Jahr"}</td>${["Small", "Medium", "Large", "Giant"].map((s) => `<td>${L.dogYears(s, y)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
<p class="table-note">Menschenjahre nach Größe des erwachsenen Hundes, nach der verbreiteten tierärztlichen Alterstabelle.</p>
<h2>Die DNA-basierte Formel</h2><p>Eine Studie von 2019 zur DNA-Methylierung bei Labrador Retrievern schlug <strong>Menschenalter = 16 × ln(Hundealter) + 31</strong> vor. Sie lässt junge Hunde noch schneller altern (ein Einjähriger wäre 31) und wurde nur an einer Rasse kalibriert, deshalb zeigt der Rechner sie als zweite Meinung.</p>`,
      faq: [["Wie alt ist ein einjähriger Hund in Menschenjahren?", "Bei den meisten Hunden etwa 15 Menschenjahre, bei sehr großen Rassen, die langsamer reifen, etwa 12."], ["Altern kleine Hunde langsamer?", "Ab etwa 3 Jahren ja. Ein zehnjähriger kleiner Hund ist ungefähr 56 Menschenjahre alt, ein zehnjähriger sehr großer Hund eher 79."]],
    };
  }
  const CRATE_EX = { XS: ["chihuahua", "yorkshire-terrier"], S: ["shih-tzu", "pug", "dachshund-miniature"], M: ["beagle", "american-cocker-spaniel", "french-bulldog"], L: ["border-collie", "bulldog-english", "australian-shepherd"], XL: ["labrador-retriever", "golden-retriever", "boxer"], XXL: ["german-shepherd-dog", "rottweiler", "doberman-pinscher"], Giant: ["great-dane", "mastiff-english", "irish-wolfhound"] };
  const crateExamples = (k) => (CRATE_EX[k.name] || []).map((id) => n(BY_ID[id])).join(", ");

  function calcPages() {
    for (const c of CALCS) {
      const url = `/de/rechner/${c.de}/`;
      const cr = crumbs([home, ["/de/rechner/", "Rechner"], [url, c.h1]]);
      const x = calcBody(c);
      const fq = faqBlock(x.faq, "Häufige Fragen");
      const extra = c.slug === "crate-size" ? `<script>window.CRATE_BODY=${JSON.stringify(Object.fromEntries(BREEDS.map((b) => { const u = L.bodyUnits(b); return [b.id, [round(u.len, 3), round(u.top, 3)]]; })))};window.CRATES=${JSON.stringify(L.CRATES)};</script>`
        : c.slug === "airline-cabin" ? `<script>window.AIRLINES=${JSON.stringify(AIRLINES)};</script>`
        : c.slug === "puppy-weight" ? `<script>window.GROWTH=${JSON.stringify(L.GROWTH)};</script>`
        : `<script>window.DOG_YEARS=${JSON.stringify(L.DOG_YEARS)};</script>`;
      const body = `${cr.html}
<header class="page-head"><h1>${esc(c.h1)}</h1><p class="lede">${esc(c.desc)}</p></header>
<section class="card calc" data-calc="${c.slug}"><form class="calc-form" onsubmit="return false">${x.form}</form><div class="calc-out" aria-live="polite"></div></section>
<aside class="disclaimer" role="note"><strong>Haftungsausschluss:</strong> ${esc(CALC_DISCLAIMER[c.slug])}</aside>
<article class="prose">${x.content}</article>
${fq.html}
<section class="card"><h2>Weitere Rechner</h2><ul class="link-list">${CALCS.filter((o) => o !== c).map((o) => `<li><a href="/de/rechner/${o.de}/">${esc(o.h1)}</a></li>`).join("")}</ul></section>
${extra}`;
      emit(url, page({ url, current: "/de/rechner/", title: c.title, description: c.desc, body, ld: [cr.ld, fq.ld, { "@type": "WebApplication", name: c.h1, inLanguage: "de", url: L.SITE + url, applicationCategory: "UtilitiesApplication", operatingSystem: "Any", offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" } }], scripts: ["/js/breeds.js", "/js/i18n-de.js", "/js/calc.js"] }), 0.8, `/calculators/${c.slug}/`);
    }
    const url = "/de/rechner/";
    const cr = crumbs([home, [url, "Rechner"]]);
    const body = `${cr.html}<header class="page-head"><h1>Rechner rund um die Hundegröße</h1><p class="lede">Schnelle Werkzeuge auf Basis derselben Rassedaten wie das Vergleichstool.</p></header>
<div class="art-grid">${CALCS.map((c) => `<a class="art-card" href="/de/rechner/${c.de}/"><h2>${esc(c.h1)}</h2><p>${esc(c.desc)}</p></a>`).join("")}</div>`;
    emit(url, page({ url, current: url, title: "Hunde-Rechner: Welpengewicht, Hundebox, Flugzeugkabine, Hundejahre", description: "Kostenlose Hunde-Rechner: Endgewicht deines Welpen schätzen, Hundebox-Größe finden, Kabinengrenzen der Airlines prüfen und Hundejahre umrechnen.", body, ld: [cr.ld] }), 0.8, "/calculators/");
  }

  // ======================================================================
  // Build
  // ======================================================================
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
  photoCreditsPage();
  postersPage();
  calcPages();
  suggestPage();
  finderPage();
  pairs["/"] = "/de/";
  // Links to English pages (e.g. in content/de/*.md, which may keep English URLs) point to
  // the German page where one exists: /breeds/beagle/ → /de/rassen/beagle/, /#b=… → /de/#b=…
  for (const p of pages) {
    p.html = p.html.replace(/href="(\/(?!de\/)[^"#?]*)([^"]*)"/g, (m, u, rest) => (pairs[u] ? `href="${pairs[u]}${rest}"` : m));
  }
  return { pages, pairs };
};
