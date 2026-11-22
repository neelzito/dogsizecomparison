/*
 * Wolves and other wild canids: an overview page, one page per animal and
 * "<breed> vs wolf" comparison pages, in English (/wolves/, /compare/…-vs-wolf/)
 * and German (/de/woelfe/, /de/vergleich/…-vs-wolf/).
 *
 * Data: js/wild.js (sizes, aliases) and content/wild.json (Latin and German names,
 * range, facts, sources). Wild animals never count as dog breeds: every share and
 * rank here is measured against the N breeds.
 */
const L = require("./lib");
const D = require("./de/lang");
const { esc, avg, round, pct, BREEDS, BY_ID, N, WILD, WILD_BY_ID, WILD_VS, scene, crumbs, faqBlock, COLORS, MALE, FEMALE, bodyLandmark } = L;

// "the gray wolf" is represented by the two best-known subspecies
const WOLF_A = WILD_BY_ID["eurasian-wolf"], WOLF_B = WILD_BY_ID["northwestern-wolf"];
const byHeight = [...WILD].sort((a, b) => b.hAvg - a.hAvg);
const shorterShare = (hCm) => BREEDS.filter((x) => avg(x.m.h) < hCm).length / N;
const lighterShare = (wKg) => BREEDS.filter((x) => avg(x.m.w) < wKg).length / N;
const enUrlVs = (b) => `/compare/${b.id}-vs-wolf/`;
const deUrlVs = (b) => `/de/vergleich/${D.BREED_SLUG[b.id]}-vs-wolf/`;
/** Which wolf page a breed links to, or null. */
const vsWolf = { en: (b) => (WILD_VS.includes(b) ? enUrlVs(b) : null), de: (b) => (WILD_VS.includes(b) ? deUrlVs(b) : null) };
/** Dog used next to an animal on its page: the closest breed by size, plus a German Shepherd (or Labrador) for reference. */
const refDog = (w) => (L.nearest(w, 1)[0] === BY_ID["german-shepherd-dog"] ? BY_ID["labrador-retriever"] : BY_ID["german-shepherd-dog"]);

module.exports = function buildWild({ emit, emitDe, ogJob, ogDog }) {
  en();
  de();

  // ======================================================================
  // English
  // ======================================================================
  function en() {
    const { H, W, H1, W1, FT, cm, kg, inch, breedCard, breedGrid, toolLink, page } = L;
    /** "Eurasian wolf", "coyote": name as used inside a sentence. */
    const pn = (w) => (w.wild ? (/^(Red|Maned|Coyote|Dingo|Dhole)/.test(w.name) ? w.name.toLowerCase() : w.name.replace(/ Golden/, " golden").replace(/ Wolf$/, " wolf")) : w.name);
    const kindText = (w) => ({ gray: "gray wolf subspecies", wolf: "wolf species of its own", relative: "wild relative of the wolf" }[w.kind]);
    const sexDogs = (x, color) => (x.sameSexes ? ["m"] : ["m", "f"]).map((s) => ({ b: x, hCm: avg(x[s].h), label: `${x.name}${x.sameSexes ? "" : s === "m" ? " ♂" : " ♀"}`, sub: `${cm(avg(x[s].h))} cm · ${kg(avg(x[s].w))} kg`, color: color || (s === "m" ? MALE : FEMALE), dashed: s === "f" }));
    const one = (x, color, muted) => ({ b: x, hCm: avg(x.m.h), label: `${x.name} ♂`, sub: `${cm(avg(x.m.h))} cm · ${kg(avg(x.m.w))} kg`, color: color || "#8c857a", dashed: false, muted });
    const vsLinks = WILD_VS.map((b) => `<li><a href="${enUrlVs(b)}">${esc(b.name)} vs wolf</a></li>`).join("");
    const sourceLine = (w) => `<p class="src-note">Wild animals have no breed standard: these are typical adult ranges, and size varies a lot between regions and individuals. ${w.info.note ? esc(w.info.note) + " " : ""}Source: <a href="https://en.wikipedia.org/wiki/${encodeURIComponent(w.info.wiki.replace(/ /g, "_"))}" rel="noopener" target="_blank">Wikipedia, “${esc(w.info.wiki)}”</a>, which summarises published field studies.</p>`;
    /** One-sentence height/weight comparison of a dog and an animal (average males). */
    function vsSentence(b, w) {
      const hb = avg(b.m.h), hw = avg(w.m.h), wb = avg(b.m.w), ww = avg(w.m.w), dh = hw - hb;
      const hPart = Math.abs(dh) < 2 ? `about the same height as` : `${round(Math.abs(dh), 1)} cm (${inch(Math.abs(dh))} in) ${dh > 0 ? "taller than" : "shorter than"}`;
      const r = ww / wb;
      const wPart = Math.abs(r - 1) < 0.1 ? "weighs about the same" : r > 1 ? `is ${r < 1.95 ? `about ${pct(r - 1)} heavier` : `about ${round(r, 1)}× as heavy`}` : `is ${r > 0.5 ? `about ${pct(1 - r)} lighter` : `less than half as heavy`}`;
      return `An average male ${pn(w)}, at ${H1(hw)} and ${W1(ww)}, is ${hPart} an average male ${b.name} (${cm(hb)} cm, ${kg(wb)} kg) and ${wPart}.`;
    }

    // ---------- one page per animal ----------
    for (const w of WILD) {
      const url = w.url;
      const ref = refDog(w);
      const close = L.nearest(w, 6);
      const twin = close[0];
      const cr = crumbs([["/", "Home"], ["/wolves/", "Wolves vs dogs"], [url, w.name]]);
      const hm = avg(w.m.h), hf = avg(w.f.h), wm = avg(w.m.w);
      const dogs = [...sexDogs(w), one(twin, COLORS[2]), ...(twin === ref ? [] : [one(ref)])];
      const facts = [
        ["Height", w.sameSexes ? H(w.m.h) : `♂ ${H(w.m.h)}<br>♀ ${H(w.f.h)}`],
        ["Weight", w.sameSexes ? W(w.m.w) : `♂ ${W(w.m.w)}<br>♀ ${W(w.f.w)}`],
        ["Height in feet", w.sameSexes ? FT(w.m.h) : `♂ ${FT(w.m.h)}<br>♀ ${FT(w.f.h)}`],
        ["Scientific name", `<i>${esc(w.latin)}</i>`],
        ["Lives in", esc(w.info.range)],
        ["Taller than", `${pct(shorterShare(hm))} of dog breeds`],
      ];
      const human = [
        `Next to a 175 cm (5′9″) adult, an average ${w.sameSexes ? "" : "male "}${pn(w)} stands ${H1(hm)} at the shoulder: ${pct(hm / 175)} of the person's height, reaching ${bodyLandmark(hm)}.`,
        w.sameSexes ? "" : `An average female, at ${H1(hf)}, reaches ${bodyLandmark(hf)}.`,
        `In feet, ${w.sameSexes ? "adults stand" : "males stand"} ${FT(w.m.h)} tall at the shoulder${w.sameSexes ? "" : ` and females ${FT(w.f.h)}`}.`,
        `Next to a 120 cm (3′11″) child, about seven years old, the shoulder comes to ${bodyLandmark(hm, 120)}.`,
      ].filter(Boolean).join(" ");
      const others = byHeight.filter((x) => x !== w);
      const faq = faqBlock([
        [`How big is ${L.article(pn(w))} ${pn(w)}?`, w.sameSexes ? `An adult ${pn(w)} stands ${H(w.m.h)} at the shoulder and weighs ${W(w.m.w)}.` : `A male ${pn(w)} stands ${H(w.m.h)} at the shoulder and weighs ${W(w.m.w)}; a female stands ${H(w.f.h)} and weighs ${W(w.f.w)}.`],
        [`How big is ${L.article(pn(w))} ${pn(w)} compared to a human?`, `At ${FT(w.m.h)} at the shoulder, an average ${w.sameSexes ? "" : "male "}${pn(w)} reaches ${bodyLandmark(hm)} on a 5′9″ (175 cm) adult. Its head sits higher than its shoulder, so it looks taller than this figure.`],
        [`Which dog breed is the same size as ${L.article(pn(w))} ${pn(w)}?`, `By height and weight, the closest breeds are the ${close.slice(0, 3).map((b) => b.name).join(", the ")}. ${vsSentence(twin, w)}`],
        [`Is ${L.article(pn(w))} ${pn(w)} bigger than a German Shepherd?`, vsSentence(BY_ID["german-shepherd-dog"], w)],
      ], `${w.name} size: common questions`);
      const body = `${cr.html}
<header class="page-head">
  <h1>${esc(w.name)} size compared to dogs and humans</h1>
  <p class="lede">The ${esc(pn(w))} (<i>${esc(w.latin)}</i>) is a ${kindText(w)} from ${esc(w.info.range.replace(/^./, (c) => c.toLowerCase()))}. Height, weight and how it measures up to dog breeds, drawn to scale.</p>
</header>
<section class="card">
  ${scene(dogs, { title: `${w.name} drawn to scale next to a 175 cm person and dog breeds` })}
  <p class="scene-note">Drawn to scale at average shoulder height, next to a 175 cm (5′9″) person, an average male ${esc(twin.name)} (the closest breed in size)${twin === ref ? "" : ` and an average male ${esc(ref.name)}`}.</p>
  <div class="cta-row"><a class="btn" href="${toolLink([[w.id, "both"], [twin.id, "m"], ...(twin === ref ? [] : [[ref.id, "m"]])])}">Compare the ${esc(pn(w))} with any breed →</a></div>
</section>
<section class="facts">${facts.map(([k, v]) => `<div class="fact"><span class="fact-k">${k}</span><span class="fact-v">${v}</span></div>`).join("")}</section>
<div class="cols">
<article class="prose">
  <h2>How big is ${L.article(pn(w))} ${esc(pn(w))}?</h2>
  <p>${esc(w.sameSexes ? `Adults stand ${H(w.m.h)} at the shoulder and weigh ${W(w.m.w)}.` : `Males stand ${H(w.m.h)} at the shoulder and weigh ${W(w.m.w)}. Females stand ${H(w.f.h)} and weigh ${W(w.f.w)}.`)} ${esc(`An average male is taller than ${pct(shorterShare(hm))} of the ${N} dog breeds on this site and heavier than ${pct(lighterShare(wm))} of them.`)}</p>
  <p>${esc(w.info.facts)}</p>
  <h2>${esc(w.name)} compared to a human</h2>
  <p>${esc(human)}</p>
  <h2>${esc(w.name)} vs dogs</h2>
  <p>${esc(vsSentence(twin, w))} ${twin === BY_ID["german-shepherd-dog"] ? "" : esc(vsSentence(BY_ID["german-shepherd-dog"], w))}</p>
  ${sourceLine(w)}
</article>
<aside class="side">
  <div class="card"><h2>Other wolves and wild canids</h2><ul class="link-list">${others.map((x) => `<li><a href="${x.url}">${esc(x.name)}</a> <span class="muted small">${cm(avg(x.m.h))} cm</span></li>`).join("")}</ul><p><a href="/wolves/">All wolves compared →</a></p></div>
  <div class="card"><h2>Dog breeds vs wolf</h2><ul class="link-list">${WILD_VS.slice(0, 10).map((b) => `<li><a href="${enUrlVs(b)}">${esc(b.name)} vs wolf</a></li>`).join("")}</ul></div>
</aside>
</div>
<section>
  <h2 class="sec-h">Dog breeds the size of ${L.article(pn(w))} ${esc(pn(w))}</h2>
  ${breedGrid(close)}
  <p><a href="${toolLink([[w.id, "m"], ...close.map((x) => [x.id, "m"])])}">See them all side by side in the comparison tool →</a></p>
</section>
${faq.html}`;
      emit(url, page({
        url, current: "/breeds/",
        title: `${w.name} Size Compared to Dogs and Humans: Height & Weight`,
        description: `How big is ${L.article(pn(w))} ${pn(w)}? ${w.sameSexes ? `Adults stand ${H(w.m.h)} and weigh ${W(w.m.w)}.` : `Males stand ${H(w.m.h)} and weigh ${W(w.m.w)}; females ${H(w.f.h)}, ${W(w.f.w)}.`} Drawn to scale next to dog breeds and a person.`,
        body, ld: [cr.ld, faq.ld],
        ogImage: wildOg(w, twin, `img/og/wolves/${w.id}.png`, "Wolf & wild canid size", w.name, [[`Males  ${H(w.m.h).split(" (")[0]} · ${W(w.m.w).split(" (")[0]}`, "fact"], [`${H(w.m.h).split(" (")[1].replace(")", "")} · ${W(w.m.w).split(" (")[1].replace(")", "")}`, "small"]], w.name, twin.name),
        ogAlt: `${w.name} drawn to scale next to a ${twin.name}`,
      }), 0.6);
    }

    // ---------- breed vs wolf ----------
    for (const b of WILD_VS) {
      const url = enUrlVs(b);
      const cr = crumbs([["/", "Home"], ["/wolves/", "Wolves vs dogs"], [url, `${b.name} vs wolf`]]);
      const dogs = [...sexDogs(b, COLORS[0]), one(WOLF_A, COLORS[1]), one(WOLF_B, COLORS[3])];
      const hb = avg(b.m.h), ha = avg(WOLF_A.m.h), hbig = avg(WOLF_B.m.h);
      const verdict = hb > hbig + 2 ? `taller than even the big Northwestern wolf` : hb > ha + 2 ? `taller than a Eurasian wolf but not as tall as a Northwestern wolf` : hb > ha - 2 ? `about as tall as a Eurasian wolf` : `shorter than both wolves`;
      const wb = avg(b.m.w), wa = avg(WOLF_A.m.w), wbig = avg(WOLF_B.m.w);
      const wVerdict = wb > wbig * 1.05 ? `heavier than both` : wb > wa * 1.05 ? `heavier than a Eurasian wolf and ${wb > wbig * 0.95 ? "about as heavy as" : "lighter than"} a Northwestern wolf` : wb > wa * 0.95 ? `about as heavy as a Eurasian wolf` : `lighter than both`;
      const lead = `An average male ${b.name} is ${verdict}. By weight, it is ${wVerdict}.`;
      const row = (k, ...v) => `<tr><td>${k}</td>${v.map((x) => `<td>${x}</td>`).join("")}</tr>`;
      const table = `<div class="table-scroll"><table class="data-table cmp-table"><thead><tr><th></th><th><a href="${b.url}">${esc(b.name)}</a></th><th><a href="${WOLF_A.url}">Eurasian wolf</a></th><th><a href="${WOLF_B.url}">Northwestern wolf</a></th></tr></thead><tbody>
        ${row("Height ♂", H(b.m.h), H(WOLF_A.m.h), H(WOLF_B.m.h))}${row("Height ♀", H(b.f.h), H(WOLF_A.f.h), H(WOLF_B.f.h))}
        ${row("Weight ♂", W(b.m.w), W(WOLF_A.m.w), W(WOLF_B.m.w))}${row("Weight ♀", W(b.f.w), W(WOLF_A.f.w), W(WOLF_B.f.w))}</tbody></table></div>`;
      const faq = faqBlock([
        [`Is a ${b.name} bigger than a wolf?`, `${lead} ${vsSentence(b, WOLF_A)}`],
        [`How much does a ${b.name} weigh compared with a wolf?`, `A male ${b.name} weighs ${W(b.m.w)} and a female ${W(b.f.w)}. A male Eurasian wolf weighs ${W(WOLF_A.m.w)} and a male Northwestern wolf ${W(WOLF_B.m.w)}.`],
      ], `${b.name} vs wolf: questions`);
      const more = WILD_VS.filter((x) => x !== b).slice(0, 10);
      const body = `${cr.html}
<header class="page-head"><h1>${esc(b.name)} vs wolf: size comparison</h1>
<p class="lede">How does the ${esc(b.name)} measure up to a gray wolf? Shoulder heights and weights against the Eurasian wolf and the larger Northwestern wolf, drawn to scale next to a person.</p></header>
<section class="card">
  ${scene(dogs, { title: `${b.name} and gray wolves drawn to scale` })}
  <p class="scene-note">Average male and female ${esc(b.name)} next to average male wolves, drawn to scale with a 175 cm (5′9″) person. Solid line = male, dashed = female.</p>
  <div class="cta-row"><a class="btn" href="${toolLink([[b.id, "both"], [WOLF_A.id, "m"], [WOLF_B.id, "m"]])}">Open in the comparison tool →</a></div>
</section>
<div class="cols">
<article class="prose">
  <h2>Is the ${esc(b.name)} bigger than a wolf?</h2>
  <p>${esc(lead)}</p>
  <p>${esc(vsSentence(b, WOLF_A))}</p>
  <p>${esc(vsSentence(b, WOLF_B))}</p>
  <p>Wolves are built for travelling long distances: compared with most dogs of the same shoulder height they have longer legs, a narrower chest and bigger feet, so they often look larger than the numbers suggest. Wolf sizes also vary a lot by region; northern wolves are the biggest.</p>
  <h2>Side by side</h2>
  ${table}
  <p class="src-note">Dog sizes follow the breed standard; wolf sizes are typical adult ranges from field studies. See the <a href="${WOLF_A.url}">Eurasian wolf</a> and <a href="${WOLF_B.url}">Northwestern wolf</a> pages for sources.</p>
</article>
<aside class="side">
  <div class="card"><h2>Breed and wolf pages</h2>${breedCard(b)}${breedCard(WOLF_A)}${breedCard(WOLF_B)}</div>
  <div class="card"><h2>More breeds vs wolf</h2><ul class="link-list">${more.map((x) => `<li><a href="${enUrlVs(x)}">${esc(x.name)} vs wolf</a></li>`).join("")}</ul><p><a href="/wolves/">All wolves and wild canids →</a></p></div>
</aside>
</div>
${faq.html}`;
      emit(url, page({
        url, current: "/compare/",
        title: `${b.name} vs Wolf: Size Comparison`,
        description: `${b.name} vs wolf: ${lead} See it to scale with the Eurasian and Northwestern wolf, with heights and weights.`.slice(0, 300),
        body, ld: [cr.ld, faq.ld],
        ogImage: ogJob({ out: `img/og${url.replace(/\/$/, "")}.png`, kind: "compare", kicker: "", title: `${b.name} vs Wolf`, lines: [["Drawn to scale", "fact"], ["average adult males", "fact"]],
          dogs: [b, WOLF_A].map((x, i) => ogDog(x, avg(x.m.h), x === WOLF_A ? "Eurasian wolf" : x.name, `${cm(avg(x.m.h))} cm (${inch(avg(x.m.h))} in) · ${kg(avg(x.m.w))} kg`, COLORS[i])) }),
        ogAlt: `${b.name} and a wolf drawn to scale side by side`,
      }), 0.6);
    }

    // ---------- overview ----------
    {
      const url = "/wolves/";
      const cr = crumbs([["/", "Home"], [url, "Wolves vs dogs"]]);
      const pick = [BY_ID["great-dane"], WOLF_B, WOLF_A, BY_ID["german-shepherd-dog"], WILD_BY_ID.coyote, WILD_BY_ID["arabian-wolf"]];
      const scn = scene(pick.map((x, i) => ({ b: x, hCm: avg(x.m.h), label: x.name, sub: `${cm(avg(x.m.h))} cm`, color: x.wild ? COLORS[[1, 3, 5, 6][i % 4]] : "#8c857a" })), { title: "Wolves and dog breeds drawn to scale" });
      const taller = BREEDS.filter((b) => avg(b.m.h) > avg(WOLF_B.m.h)).sort((a, b) => b.hAvg - a.hAvg);
      const heavier = BREEDS.filter((b) => avg(b.m.w) > avg(WOLF_B.m.w)).sort((a, b) => b.wAvg - a.wAvg);
      const link = (x) => `<a href="${x.url}">${esc(x.name)}</a>`;
      const tableRows = byHeight.map((x) => `<tr><td><a href="${x.url}">${esc(x.name)}</a><br><i class="muted small">${esc(x.latin)}</i></td><td>${H(x.m.h)}</td><td>${W(x.m.w)}</td><td>${esc(x.info.range)}</td></tr>`).join("");
      const smallest = byHeight[byHeight.length - 1], tallest = byHeight[0];
      const intro = `A gray wolf is bigger than most dogs. An average male Eurasian wolf stands ${H1(avg(WOLF_A.m.h))} at the shoulder and weighs ${W1(avg(WOLF_A.m.w))}, taller than ${pct(shorterShare(avg(WOLF_A.m.h)))} of the ${N} dog breeds on this site. The Northwestern wolf of Canada and Alaska is bigger still, at ${H1(avg(WOLF_B.m.h))} and ${W1(avg(WOLF_B.m.w))} for an average male.`;
      const faq = faqBlock([
        ["Is a wolf bigger than a German Shepherd?", `Yes. ${vsSentence(BY_ID["german-shepherd-dog"], WOLF_A)}`],
        ["Which dog breeds are bigger than a wolf?", `Only giant breeds. ${taller.length === 1 ? `Only the ${taller[0].name} is` : `${taller.length} breeds are`} taller on average than a male Northwestern wolf${taller.length === 1 ? "" : `, including the ${L.list(taller.slice(0, 4).map((b) => b.name)).replace(/ and /, " and the ").replace(/, /g, ", the ")}`}. By weight, ${heavier.length} breeds are heavier, among them the ${L.list(heavier.slice(0, 4).map((b) => b.name)).replace(/ and /, " and the ").replace(/, /g, ", the ")}.`],
        ["What is the biggest wolf?", `Among living wolves, northern gray wolves such as the Northwestern wolf are the biggest: males stand ${H(WOLF_B.m.h)} and weigh ${W(WOLF_B.m.w)}. The maned wolf of South America has the tallest shoulders of any wild canid, at ${H(WILD_BY_ID["maned-wolf"].m.h)}, thanks to its long legs, but weighs only ${W(WILD_BY_ID["maned-wolf"].m.w)} and is not a true wolf.`],
        ["What is the smallest wolf?", `The Arabian wolf is the smallest gray wolf, at ${H(WILD_BY_ID["arabian-wolf"].m.h)} and about 20 kg. The African golden wolf is smaller still, at about 40 cm and ${W(WILD_BY_ID["african-golden-wolf"].m.w)}.`],
        ["How big is a wolf compared to a human?", `An average male Eurasian wolf reaches ${bodyLandmark(avg(WOLF_A.m.h))} on a 175 cm (5′9″) adult, at ${FT(WOLF_A.m.h)} tall at the shoulder. A Northwestern wolf, at ${H1(avg(WOLF_B.m.h))}, ${bodyLandmark(avg(WOLF_B.m.h)) === bodyLandmark(avg(WOLF_A.m.h)) ? "also reaches" : "reaches"} ${bodyLandmark(avg(WOLF_B.m.h))}.`],
      ], "Wolf vs dog: common questions");
      const body = `${cr.html}
<header class="page-head"><h1>Wolf vs dog size: wolves and wild canids compared</h1>
<p class="lede">${WILD.length} wolves and wild relatives of the dog, from the big Northwestern wolf to the small ${esc(pn(smallest))}, with heights and weights, drawn to scale next to dog breeds and a person.</p></header>
<section class="card">${scn}<p class="scene-note">Average males drawn to scale next to a 175 cm (5′9″) person. Wolves in colour, dog breeds in grey.</p>
<div class="cta-row"><a class="btn" href="${toolLink(pick.map((x) => [x.id, "m"]))}">Compare wolves and breeds in the tool →</a></div></section>
<article class="prose">
  <h2>How big is a wolf compared to a dog?</h2>
  <p>${esc(intro)}</p>
  <p>Only the giant breeds are bigger. ${taller.length === 1 ? "Only one breed is" : `${taller.length} breeds are`} taller on average than a male Northwestern wolf: ${taller.length === 1 ? "the " : "among them the "}${L.list(taller.slice(0, 4).map(link)).replace(/, (?=<a)/g, ", the ").replace(/ and (?=<a)/, " and the ")}. ${heavier.length} breeds are heavier, among them the ${L.list(heavier.slice(0, 4).map(link)).replace(/, (?=<a)/g, ", the ").replace(/ and (?=<a)/, " and the ")}. Wolves often look bigger than dogs of the same height because they have longer legs, a narrower chest and large feet.</p>
  <p>Wolf size depends on where they live: wolves in the far north are the biggest, and wolves in deserts and hot grasslands, such as the Arabian and Indian wolf, are much smaller. The list below also includes other wolf species and wild relatives like the coyote, dingo and dhole.</p>
</article>
<section class="card"><h2>All ${WILD.length} wolves and wild canids, tallest first</h2>
<div class="table-scroll"><table class="data-table"><thead><tr><th>Animal</th><th>Height ♂</th><th>Weight ♂</th><th>Lives in</th></tr></thead><tbody>${tableRows}</tbody></table></div>
<p class="src-note">Typical adult ranges from field studies; wild animals vary a lot by region. Sources on each animal's page.</p></section>
<section><h2 class="sec-h">Wolves and wild canids</h2>${breedGrid(byHeight)}</section>
<section class="card"><h2>Dog breeds vs wolf</h2><ul class="link-cols">${vsLinks}</ul></section>
${faq.html}`;
      emit(url, page({
        url, current: "/breeds/",
        title: `Wolf vs Dog Size: ${WILD.length} Wolves and Wild Canids Compared to Dog Breeds`,
        description: `How big is a wolf compared to a dog? ${WILD.length} wolves and wild canids, from the Northwestern wolf to the dhole, drawn to scale next to dog breeds and a person, with heights and weights.`,
        body, ld: [cr.ld, faq.ld, { "@type": "ItemList", itemListElement: byHeight.map((x, i) => ({ "@type": "ListItem", position: i + 1, url: L.SITE + x.url, name: x.name })) }],
      }), 0.8);
    }
  }

  // ======================================================================
  // German
  // ======================================================================
  function de() {
    const { n, name, cap, H, W, H1, W1, cm, kg, pct: dpct, breedCard, breedGrid, toolLink, page, breedUrl } = D;
    const P = (v) => dpct(v);
    const kindText = (w) => ({ gray: "Unterart des Grauwolfs", wolf: "eigene Wolfsart", relative: "wilder Verwandter des Wolfs" }[w.kind]);
    const landmark = (hCm, personCm = 175) => { const f = hCm / personCm; return f < 0.12 ? "etwa bis zum Knöchel" : f < 0.19 ? "etwa bis zur Mitte des Schienbeins" : f < 0.26 ? "knapp unter das Knie" : f < 0.33 ? "etwa bis zum Knie" : f < 0.43 ? "etwa bis zur Mitte des Oberschenkels" : f < 0.55 ? "etwa bis zur Hüfte" : "etwa bis zur Taille"; };
    const sexDogs = (x, color) => (x.sameSexes ? ["m"] : ["m", "f"]).map((s) => ({ b: x, hCm: avg(x[s].h), label: `${n(x)}${x.sameSexes ? "" : s === "m" ? " ♂" : " ♀"}`, sub: `${cm(avg(x[s].h))} cm · ${kg(avg(x[s].w))} kg`, color: color || (s === "m" ? MALE : FEMALE), dashed: s === "f" }));
    const one = (x, color) => ({ b: x, hCm: avg(x.m.h), label: `${n(x)} ♂`, sub: `${cm(avg(x.m.h))} cm · ${kg(avg(x.m.w))} kg`, color: color || "#8c857a" });
    const SC = { lang: "de", nameOf: n };
    const home = ["/de/", "Start"];
    const hub = ["/de/woelfe/", "Wolf und Hund"];
    /** "Ein Eurasischer Wolf (Rüde: 81,5 cm, 46,5 kg) ist an der Schulter 19 cm höher als ein …" (average males) */
    function vsSentence(b, w) {
      const hb = avg(b.m.h), hw = avg(w.m.h), wb = avg(b.m.w), ww = avg(w.m.w), dh = hw - hb;
      const hPart = Math.abs(dh) < 2 ? "etwa so hoch wie" : `${D.num(round(Math.abs(dh), 1))} cm ${dh > 0 ? "höher als" : "niedriger als"}`;
      const r = ww / wb;
      const wPart = Math.abs(r - 1) < 0.1 ? "etwa gleich schwer" : r > 1 ? (r < 1.95 ? `etwa ${P(r - 1)} schwerer` : `etwa ${D.num(round(r, 1))}-mal so schwer`) : (r > 0.5 ? `etwa ${P(1 - r)} leichter` : "weniger als halb so schwer");
      return `${cap(name.ein(w))} (Rüde: ${H1(hw)}, ${W1(ww)}) ist an der Schulter ${hPart} ${name.ein(b)} (Rüde: ${H1(hb)}, ${W1(wb)}) und ${wPart}.`;
    }
    const sourceLine = (w) => `<p class="src-note">Wildtiere haben keinen Rassestandard: Die Werte sind typische Bereiche für erwachsene Tiere, und die Größe schwankt stark je nach Region und Tier. Quelle: <a href="https://de.wikipedia.org/wiki/${encodeURIComponent(w.info.wikiDe.replace(/ /g, "_"))}" rel="noopener" target="_blank">Wikipedia, „${esc(w.info.wikiDe)}“</a> und <a href="https://en.wikipedia.org/wiki/${encodeURIComponent(w.info.wiki.replace(/ /g, "_"))}" rel="noopener" target="_blank">englische Wikipedia</a>, die veröffentlichte Feldstudien zusammenfassen.</p>`;

    for (const w of WILD) {
      const url = breedUrl(w);
      const ref = refDog(w);
      const close = L.nearest(w, 6);
      const twin = close[0];
      const gsd = BY_ID["german-shepherd-dog"];
      const cr = crumbs([home, hub, [url, n(w)]]);
      const hm = avg(w.m.h), hf = avg(w.f.h), wm = avg(w.m.w);
      const dogs = [...sexDogs(w), one(twin, COLORS[2]), ...(twin === ref ? [] : [one(ref)])];
      const facts = [
        ["Schulterhöhe", w.sameSexes ? H(w.m.h) : `♂ ${H(w.m.h)}<br>♀ ${H(w.f.h)}`],
        ["Gewicht", w.sameSexes ? W(w.m.w) : `♂ ${W(w.m.w)}<br>♀ ${W(w.f.w)}`],
        ["Wissenschaftlicher Name", `<i>${esc(w.latin)}</i>`],
        ["Verbreitung", esc(w.info.rangeDe)],
        ["Größer als", `${P(shorterShare(hm))} der Hunderassen`],
        ["Ähnlich groß wie", `<a href="${breedUrl(twin)}">${esc(n(twin))}</a>`],
      ];
      const human = [
        `Neben einem 175 cm großen Erwachsenen misst ${w.sameSexes ? "ein durchschnittliches Tier" : "ein durchschnittlicher Rüde"} ${H1(hm)} an der Schulter, also ${P(hm / 175)} der Körpergröße des Menschen, und reicht ihm ${landmark(hm)}.`,
        w.sameSexes ? "" : `Eine durchschnittliche Fähe mit ${H1(hf)} reicht ${landmark(hf)}.`,
        `Einem 120 cm großen Kind, etwa sieben Jahre alt, reicht die Schulter ${landmark(hm, 120)}.`,
      ].filter(Boolean).join(" ");
      const others = byHeight.filter((x) => x !== w);
      const faq = faqBlock([
        [`Wie groß wird ${name.ein(w)}?`, w.sameSexes ? `Erwachsene Tiere erreichen eine Schulterhöhe von ${H(w.m.h)} und wiegen ${W(w.m.w)}.` : `Rüden erreichen eine Schulterhöhe von ${H(w.m.h)} und wiegen ${W(w.m.w)}; Fähen messen ${H(w.f.h)} und wiegen ${W(w.f.w)}.`],
        [`Wie groß ist ${name.ein(w)} im Vergleich zum Menschen?`, `Mit ${H1(hm)} Schulterhöhe reicht ${w.sameSexes ? "ein durchschnittliches Tier" : "ein durchschnittlicher Rüde"} einem 175 cm großen Erwachsenen ${landmark(hm)}. Der Kopf liegt höher als die Schulter, deshalb wirkt das Tier größer.`],
        [`Welche Hunderasse ist so groß wie ${name.ein(w)}?`, `Nach Größe und Gewicht am ähnlichsten sind ${close.slice(0, 3).map((b) => name.der(b)).join(", ")}. ${vsSentence(twin, w)}`],
        [`Ist ${name.ein(w)} größer als ein Deutscher Schäferhund?`, vsSentence(gsd, w)],
      ], `${n(w)}: häufige Fragen zur Größe`);
      const body = `${cr.html}
<header class="page-head">
  <h1>${esc(n(w))}: Größe im Vergleich zu Hund und Mensch</h1>
  <p class="lede">${esc(cap(name.der(w)))} (<i>${esc(w.latin)}</i>) ist ${w.kind === "gray" ? "eine" : "ein"} ${kindText(w)} aus folgendem Gebiet: ${esc(w.info.rangeDe)}. Größe, Gewicht und Vergleich mit Hunderassen, maßstabsgetreu gezeichnet.</p>
</header>
<section class="card">
  ${scene(dogs, { ...SC, title: `${n(w)} maßstabsgetreu neben einem 175 cm großen Menschen und Hunderassen` })}
  <p class="scene-note">Maßstabsgetreu bei durchschnittlicher Schulterhöhe, neben einem 175 cm großen Menschen, einem durchschnittlichen Rüden der Rasse ${esc(n(twin))} (die ähnlichste Rasse)${twin === ref ? "" : ` und einem durchschnittlichen Rüden der Rasse ${esc(n(ref))}`}.</p>
  <div class="cta-row"><a class="btn" href="${toolLink([[w.id, "both"], [twin.id, "m"], ...(twin === ref ? [] : [[ref.id, "m"]])])}">${esc(n(w))} mit jeder Rasse vergleichen →</a></div>
</section>
<section class="facts">${facts.map(([k, v]) => `<div class="fact"><span class="fact-k">${k}</span><span class="fact-v">${v}</span></div>`).join("")}</section>
<div class="cols">
<article class="prose">
  <h2>Wie groß wird ${esc(name.ein(w))}?</h2>
  <p>${esc(w.sameSexes ? `Erwachsene Tiere erreichen eine Schulterhöhe von ${H(w.m.h)} und wiegen ${W(w.m.w)}.` : `Rüden erreichen eine Schulterhöhe von ${H(w.m.h)} und wiegen ${W(w.m.w)}. Fähen messen ${H(w.f.h)} und wiegen ${W(w.f.w)}.`)} ${esc(`Ein durchschnittlicher Rüde ist größer als ${P(shorterShare(hm))} der ${N} Hunderassen auf dieser Website und schwerer als ${P(lighterShare(wm))}.`)}</p>
  <p>${esc(w.info.factsDe)}</p>
  <h2>${esc(n(w))} im Größenvergleich mit dem Menschen</h2>
  <p>${esc(human)}</p>
  <h2>${esc(n(w))} im Vergleich mit Hunden</h2>
  <p>${esc(vsSentence(twin, w))} ${twin === gsd ? "" : esc(vsSentence(gsd, w))}</p>
  ${sourceLine(w)}
</article>
<aside class="side">
  <div class="card"><h2>Weitere Wölfe und Wildhunde</h2><ul class="link-list">${others.map((x) => `<li><a href="${breedUrl(x)}">${esc(n(x))}</a> <span class="muted small">${cm(avg(x.m.h))} cm</span></li>`).join("")}</ul><p><a href="/de/woelfe/">Alle Wölfe im Vergleich →</a></p></div>
  <div class="card"><h2>Hunderassen vs. Wolf</h2><ul class="link-list">${WILD_VS.slice(0, 10).map((b) => `<li><a href="${deUrlVs(b)}">${esc(n(b))} vs. Wolf</a></li>`).join("")}</ul></div>
</aside>
</div>
<section>
  <h2 class="sec-h">Hunderassen so groß wie ${esc(name.ein(w))}</h2>
  ${breedGrid(close)}
  <p><a href="${toolLink([[w.id, "m"], ...close.map((x) => [x.id, "m"])])}">Alle nebeneinander im Vergleichstool ansehen →</a></p>
</section>
${faq.html}`;
      emitDe(url, page({
        url, current: "/de/rassen/",
        title: `${n(w)}: Größe & Gewicht im Vergleich zu Hund und Mensch`,
        description: `Wie groß wird ${name.ein(w)}? ${w.sameSexes ? `Erwachsene: ${H(w.m.h)} Schulterhöhe, ${W(w.m.w)}.` : `Rüden: ${H(w.m.h)}, ${W(w.m.w)}; Fähen: ${H(w.f.h)}, ${W(w.f.w)}.`} Maßstabsgetreu neben Hunderassen und einem Menschen.`,
        body, ld: [cr.ld, faq.ld],
        ogImage: wildOg(w, twin, `img/og/de/woelfe/${D.WILD_SLUG[w.id]}.png`, "Wolf & Wildhund: Größe", n(w), [[`Rüden  ${H(w.m.h)} · ${W(w.m.w)}`, "fact"], [`Fähen  ${H(w.f.h)} · ${W(w.f.w)}`, "fact"]], n(w), n(twin)),
        ogAlt: `${n(w)} maßstabsgetreu neben ${name.dem(twin)}`,
      }), 0.6, w.url);
    }

    for (const b of WILD_VS) {
      const url = deUrlVs(b);
      const cr = crumbs([home, hub, [url, `${n(b)} vs. Wolf`]]);
      const dogs = [...sexDogs(b, COLORS[0]), one(WOLF_A, COLORS[1]), one(WOLF_B, COLORS[3])];
      const hb = avg(b.m.h), ha = avg(WOLF_A.m.h), hbig = avg(WOLF_B.m.h), wb = avg(b.m.w), wa = avg(WOLF_A.m.w), wbig = avg(WOLF_B.m.w);
      const verdict = hb > hbig + 2 ? "höher als selbst der große Mackenzie-Wolf" : hb > ha + 2 ? "höher als ein Eurasischer Wolf, aber nicht so hoch wie ein Mackenzie-Wolf" : hb > ha - 2 ? "etwa so hoch wie ein Eurasischer Wolf" : "niedriger als beide Wölfe";
      const wVerdict = wb > wbig * 1.05 ? "schwerer als beide" : wb > wa * 1.05 ? `schwerer als ein Eurasischer Wolf und ${wb > wbig * 0.95 ? "etwa so schwer wie" : "leichter als"} ein Mackenzie-Wolf` : wb > wa * 0.95 ? "etwa so schwer wie ein Eurasischer Wolf" : "leichter als beide";
      const lead = `Ein durchschnittlicher Rüde der Rasse ${n(b)} ist an der Schulter ${verdict}. Beim Gewicht ist er ${wVerdict}.`;
      const row = (k, ...v) => `<tr><td>${k}</td>${v.map((x) => `<td>${x}</td>`).join("")}</tr>`;
      const table = `<div class="table-scroll"><table class="data-table cmp-table"><thead><tr><th></th><th><a href="${breedUrl(b)}">${esc(n(b))}</a></th><th><a href="${breedUrl(WOLF_A)}">Eurasischer Wolf</a></th><th><a href="${breedUrl(WOLF_B)}">Mackenzie-Wolf</a></th></tr></thead><tbody>
        ${row("Schulterhöhe ♂", H(b.m.h), H(WOLF_A.m.h), H(WOLF_B.m.h))}${row("Schulterhöhe ♀", H(b.f.h), H(WOLF_A.f.h), H(WOLF_B.f.h))}
        ${row("Gewicht ♂", W(b.m.w), W(WOLF_A.m.w), W(WOLF_B.m.w))}${row("Gewicht ♀", W(b.f.w), W(WOLF_A.f.w), W(WOLF_B.f.w))}</tbody></table></div>`;
      const faq = faqBlock([
        [`Ist ${name.ein(b)} größer als ein Wolf?`, `${lead} ${vsSentence(b, WOLF_A)}`],
        [`Wie schwer ist ${name.ein(b)} im Vergleich zum Wolf?`, `Ein Rüde wiegt ${W(b.m.w)}, eine Hündin ${W(b.f.w)}. Ein Eurasischer Wolf (Rüde) wiegt ${W(WOLF_A.m.w)}, ein Mackenzie-Wolf (Rüde) ${W(WOLF_B.m.w)}.`],
      ], `${n(b)} vs. Wolf: Fragen`);
      const more = WILD_VS.filter((x) => x !== b).slice(0, 10);
      const body = `${cr.html}
<header class="page-head"><h1>${esc(n(b))} vs. Wolf: Größenvergleich</h1>
<p class="lede">Wie groß ist ${esc(name.der(b))} im Vergleich zum Wolf? Schulterhöhe und Gewicht neben dem Eurasischen Wolf und dem größeren Mackenzie-Wolf, maßstabsgetreu neben einem Menschen.</p></header>
<section class="card">
  ${scene(dogs, { ...SC, title: `${n(b)} und Grauwölfe maßstabsgetreu` })}
  <p class="scene-note">Durchschnittlicher Rüde und durchschnittliche Hündin der Rasse ${esc(n(b))} neben durchschnittlichen Wolfsrüden, maßstabsgetreu mit einem 175 cm großen Menschen. Durchgezogen = Rüde, gestrichelt = Hündin.</p>
  <div class="cta-row"><a class="btn" href="${toolLink([[b.id, "both"], [WOLF_A.id, "m"], [WOLF_B.id, "m"]])}">Im Vergleichstool öffnen →</a></div>
</section>
<div class="cols">
<article class="prose">
  <h2>Ist ${esc(name.der(b))} größer als ein Wolf?</h2>
  <p>${esc(lead)}</p>
  <p>${esc(vsSentence(b, WOLF_A))}</p>
  <p>${esc(vsSentence(b, WOLF_B))}</p>
  <p>Wölfe sind für lange Strecken gebaut: Im Vergleich zu den meisten Hunden mit gleicher Schulterhöhe haben sie längere Beine, eine schmalere Brust und größere Pfoten und wirken deshalb oft größer, als die Zahlen vermuten lassen. Außerdem schwankt die Größe je nach Region stark; Wölfe im hohen Norden sind am größten.</p>
  <h2>Im direkten Vergleich</h2>
  ${table}
  <p class="src-note">Hundegrößen folgen dem Rassestandard; Wolfsgrößen sind typische Bereiche aus Feldstudien. Quellen auf den Seiten zum <a href="${breedUrl(WOLF_A)}">Eurasischen Wolf</a> und zum <a href="${breedUrl(WOLF_B)}">Mackenzie-Wolf</a>.</p>
</article>
<aside class="side">
  <div class="card"><h2>Rasse und Wölfe</h2>${breedCard(b)}${breedCard(WOLF_A)}${breedCard(WOLF_B)}</div>
  <div class="card"><h2>Weitere Rassen vs. Wolf</h2><ul class="link-list">${more.map((x) => `<li><a href="${deUrlVs(x)}">${esc(n(x))} vs. Wolf</a></li>`).join("")}</ul><p><a href="/de/woelfe/">Alle Wölfe und Wildhunde →</a></p></div>
</aside>
</div>
${faq.html}`;
      emitDe(url, page({
        url, current: "/de/vergleich/",
        title: `${n(b)} vs. Wolf: Größenvergleich`,
        description: `${n(b)} vs. Wolf: ${lead} Maßstabsgetreu neben dem Eurasischen Wolf und dem Mackenzie-Wolf, mit Größe und Gewicht.`.slice(0, 300),
        body, ld: [cr.ld, faq.ld],
        ogImage: ogJob({ out: `img/og${url.replace(/\/$/, "")}.png`, kind: "compare", kicker: "", title: `${n(b)} vs. Wolf`, lines: [["Maßstabsgetreu", "fact"], ["durchschnittliche Rüden", "fact"]],
          dogs: [b, WOLF_A].map((x, i) => ogDog(x, avg(x.m.h), n(x), `${cm(avg(x.m.h))} cm · ${kg(avg(x.m.w))} kg`, COLORS[i])) }),
        ogAlt: `${n(b)} und ein Wolf maßstabsgetreu nebeneinander`,
      }), 0.6, enUrlVs(b));
    }

    {
      const url = "/de/woelfe/";
      const cr = crumbs([home, [url, "Wolf und Hund"]]);
      const pick = [BY_ID["great-dane"], WOLF_B, WOLF_A, BY_ID["german-shepherd-dog"], WILD_BY_ID.coyote, WILD_BY_ID["arabian-wolf"]];
      const scn = scene(pick.map((x, i) => ({ b: x, hCm: avg(x.m.h), label: n(x), sub: `${cm(avg(x.m.h))} cm`, color: x.wild ? COLORS[[1, 3, 5, 6][i % 4]] : "#8c857a" })), { ...SC, title: "Wölfe und Hunderassen maßstabsgetreu" });
      const taller = BREEDS.filter((b) => avg(b.m.h) > avg(WOLF_B.m.h)).sort((a, b) => b.hAvg - a.hAvg);
      const heavier = BREEDS.filter((b) => avg(b.m.w) > avg(WOLF_B.m.w)).sort((a, b) => b.wAvg - a.wAvg);
      const link = (x) => `<a href="${breedUrl(x)}">${esc(name.der(x))}</a>`;
      const tableRows = byHeight.map((x) => `<tr><td><a href="${breedUrl(x)}">${esc(n(x))}</a><br><i class="muted small">${esc(x.latin)}</i></td><td>${H(x.m.h)}</td><td>${W(x.m.w)}</td><td>${esc(x.info.rangeDe)}</td></tr>`).join("");
      const gsd = BY_ID["german-shepherd-dog"];
      const faq = faqBlock([
        ["Ist ein Wolf größer als ein Deutscher Schäferhund?", `Ja. ${vsSentence(gsd, WOLF_A)}`],
        ["Welche Hunderassen sind größer als ein Wolf?", `Nur sehr große Rassen. ${taller.length === 1 ? `Nur ${name.der(taller[0])} ist` : `${taller.length} Rassen sind`} im Schnitt höher als ein Mackenzie-Wolf-Rüde${taller.length === 1 ? "" : `, darunter ${D.listDe(taller.slice(0, 4).map((b) => name.der(b)))}`}. Schwerer sind ${heavier.length} Rassen, etwa ${D.listDe(heavier.slice(0, 4).map((b) => name.der(b)))}.`],
        ["Welcher Wolf ist der größte?", `Unter den heutigen Wölfen sind nördliche Grauwölfe wie der Mackenzie-Wolf am größten: Rüden messen ${H(WOLF_B.m.h)} und wiegen ${W(WOLF_B.m.w)}. Der Mähnenwolf Südamerikas hat dank seiner langen Beine mit ${H(WILD_BY_ID["maned-wolf"].m.h)} die größte Schulterhöhe aller wilden Hundeartigen, wiegt aber nur ${W(WILD_BY_ID["maned-wolf"].m.w)} und ist kein echter Wolf.`],
        ["Welcher Wolf ist der kleinste?", `Der Arabische Wolf ist der kleinste Grauwolf, mit ${H(WILD_BY_ID["arabian-wolf"].m.h)} und etwa 20 kg. Der Afrikanische Goldwolf ist noch kleiner, mit etwa 40 cm und ${W(WILD_BY_ID["african-golden-wolf"].m.w)}.`],
        ["Wie groß ist ein Wolf im Vergleich zum Menschen?", `Ein durchschnittlicher Rüde des Eurasischen Wolfs reicht einem 175 cm großen Erwachsenen ${landmark(avg(WOLF_A.m.h))}, ein Mackenzie-Wolf ${landmark(avg(WOLF_B.m.h))}.`],
      ], "Wolf und Hund: häufige Fragen");
      const body = `${cr.html}
<header class="page-head"><h1>Wolf und Hund im Größenvergleich: Wölfe und Wildhunde</h1>
<p class="lede">${WILD.length} Wölfe und wilde Verwandte des Hundes, vom Mackenzie-Wolf bis zum Afrikanischen Goldwolf, mit Größe und Gewicht, maßstabsgetreu neben Hunderassen und einem Menschen.</p></header>
<section class="card">${scn}<p class="scene-note">Durchschnittliche Rüden, maßstabsgetreu neben einem 175 cm großen Menschen. Wölfe farbig, Hunderassen grau.</p>
<div class="cta-row"><a class="btn" href="${toolLink(pick.map((x) => [x.id, "m"]))}">Wölfe und Rassen im Tool vergleichen →</a></div></section>
<article class="prose">
  <h2>Wie groß ist ein Wolf im Vergleich zum Hund?</h2>
  <p>${esc(`Ein Grauwolf ist größer als die meisten Hunde. Ein durchschnittlicher Rüde des Eurasischen Wolfs, der Art, die nach Deutschland zurückgekehrt ist, misst ${H1(avg(WOLF_A.m.h))} an der Schulter und wiegt ${W1(avg(WOLF_A.m.w))}; damit ist er größer als ${P(shorterShare(avg(WOLF_A.m.h)))} der ${N} Hunderassen auf dieser Website. Der Mackenzie-Wolf aus Kanada und Alaska ist noch größer, mit ${H1(avg(WOLF_B.m.h))} und ${W1(avg(WOLF_B.m.w))}.`)}</p>
  <p>Größer sind nur die Riesenrassen. ${taller.length === 1 ? `Nur ${link(taller[0])} ist` : `${taller.length} Rassen sind`} im Schnitt höher als ein Mackenzie-Wolf-Rüde${taller.length === 1 ? "" : `, etwa ${D.listDe(taller.slice(0, 4).map(link))}`}, und ${heavier.length} Rassen sind schwerer, etwa ${D.listDe(heavier.slice(0, 4).map(link))}. Wölfe wirken oft größer als gleich hohe Hunde, weil sie längere Beine, eine schmalere Brust und große Pfoten haben.</p>
  <p>Wie groß ein Wolf wird, hängt davon ab, wo er lebt: Im hohen Norden sind Wölfe am größten, in Wüsten und heißem Grasland, etwa beim Arabischen und Indischen Wolf, deutlich kleiner. Die Liste unten enthält außerdem andere Wolfsarten und wilde Verwandte wie Kojote, Dingo und Rothund.</p>
</article>
<section class="card"><h2>Alle ${WILD.length} Wölfe und Wildhunde, die größten zuerst</h2>
<div class="table-scroll"><table class="data-table"><thead><tr><th>Tier</th><th>Schulterhöhe ♂</th><th>Gewicht ♂</th><th>Verbreitung</th></tr></thead><tbody>${tableRows}</tbody></table></div>
<p class="src-note">Typische Bereiche für erwachsene Tiere aus Feldstudien; Wildtiere schwanken stark je nach Region. Quellen auf der Seite des jeweiligen Tiers.</p></section>
<section><h2 class="sec-h">Wölfe und Wildhunde</h2>${breedGrid(byHeight)}</section>
<section class="card"><h2>Hunderassen vs. Wolf</h2><ul class="link-cols">${WILD_VS.map((b) => `<li><a href="${deUrlVs(b)}">${esc(n(b))} vs. Wolf</a></li>`).join("")}</ul></section>
${faq.html}`;
      emitDe(url, page({
        url, current: "/de/rassen/",
        title: `Wolf und Hund im Größenvergleich: ${WILD.length} Wölfe und Wildhunde`,
        description: `Wie groß ist ein Wolf im Vergleich zum Hund? ${WILD.length} Wölfe und Wildhunde, vom Mackenzie-Wolf bis zum Rothund, maßstabsgetreu neben Hunderassen und einem Menschen, mit Größe und Gewicht.`,
        body, ld: [cr.ld, faq.ld, { "@type": "ItemList", itemListElement: byHeight.map((x, i) => ({ "@type": "ListItem", position: i + 1, url: L.SITE + breedUrl(x), name: n(x) })) }],
      }), 0.8, "/wolves/");
    }
  }

  // social preview: the animal next to its closest breed
  function wildOg(w, dog, out, kicker, title, lines, wName, dName) {
    return ogJob({
      out, kind: "breed", kicker, title, lines,
      dogs: [ogDog(w, avg(w.m.h), wName, `${L.cm(avg(w.m.h))} cm · ${L.kg(avg(w.m.w))} kg`, "#c2562b"),
        ogDog(dog, avg(dog.m.h), dName, `${L.cm(avg(dog.m.h))} cm · ${L.kg(avg(dog.m.w))} kg`, "#8c857a", true)],
    });
  }
};
module.exports.vsWolf = vsWolf;
