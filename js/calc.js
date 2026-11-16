/*
 * Calculator pages (/calculators/…). Each page has <section data-calc="name">
 * with a form and an output box. Tables (growth curve, crates, airlines, dog
 * years) are written into the page by tools/build_site.js.
 */
(function () {
  "use strict";
  const root = document.querySelector("[data-calc]");
  if (!root) return;
  const kind = root.dataset.calc;
  const form = root.querySelector(".calc-form");
  const out = root.querySelector(".calc-out");

  // ---------- data ----------
  const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const avg = (r) => (r[0] + r[1]) / 2;
  const BY_ID = {};
  for (const r of window.BREED_ROWS) {
    const b = { name: r[0], m: { h: [r[4], r[5]], w: [r[8], r[9]] }, f: { h: [r[6], r[7]], w: [r[10], r[11]] }, life: [r[12], r[13]] };
    b.id = slug(b.name);
    const w = (avg(b.m.w) + avg(b.f.w)) / 2;
    b.size = w < 5 ? "Toy" : w < 10 ? "Small" : w < 25 ? "Medium" : w < 45 ? "Large" : "Giant";
    BY_ID[b.id] = b;
  }

  // ---------- units ----------
  let units = "metric";
  const round = (v, d = 0) => { const p = 10 ** d; return Math.round(v * p) / p; };
  const kgTo = (kg) => (units === "metric" ? kg : kg * 2.20462);
  const toKg = (v) => (units === "metric" ? v : v / 2.20462);
  const cmTo = (c) => (units === "metric" ? c : c / 2.54);
  const toCm = (v) => (units === "metric" ? v : v * 2.54);
  const wu = () => (units === "metric" ? "kg" : "lb");
  const hu = () => (units === "metric" ? "cm" : "in");
  const fW = (kg) => { const v = kgTo(kg); return `${round(v, v < 10 ? 1 : 0)} ${wu()}`; };
  const fWR = (r) => { const a = kgTo(r[0]), b = kgTo(r[1]); const d = (v) => round(v, v < 10 ? 1 : 0); return d(a) === d(b) ? `${d(a)} ${wu()}` : `${d(a)}–${d(b)} ${wu()}`; };
  const fH = (c) => `${round(cmTo(c), units === "metric" ? 0 : 1)} ${hu()}`;
  const both = (kg) => `${round(kg, kg < 10 ? 1 : 0)} kg (${round(kg * 2.20462, kg * 2.2 < 10 ? 1 : 0)} lb)`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------- form plumbing ----------
  const val = (name) => form.elements[name] && form.elements[name].value;
  const num = (name) => parseFloat(val(name));
  const seg = (field) => { const b = form.querySelector(`[data-field="${field}"] [aria-pressed="true"]`); return b && b.dataset.v; };
  function showFields() {
    const mode = seg("mode");
    const nobreed = form.elements.breed && !val("breed");
    form.querySelectorAll("[data-show]").forEach((el) => {
      const s = el.dataset.show;
      el.hidden = s === "nobreed" ? !nobreed : mode ? s !== mode : false;
    });
  }
  form.addEventListener("click", (e) => {
    const b = e.target.closest(".seg button");
    if (!b) return;
    const group = b.parentElement;
    if (b.dataset.u && b.dataset.u !== units) {
      // convert number inputs that carry a unit
      form.querySelectorAll(".unit[data-unit]").forEach((u) => {
        const input = u.parentElement.querySelector("input");
        const v = parseFloat(input.value);
        if (!isFinite(v)) return;
        const f = u.dataset.unit === "w" ? (b.dataset.u === "metric" ? 1 / 2.20462 : 2.20462) : (b.dataset.u === "metric" ? 2.54 : 1 / 2.54);
        input.value = round(v * f, 1);
      });
      units = b.dataset.u;
      form.querySelectorAll(".unit[data-unit]").forEach((u) => (u.textContent = u.dataset.unit === "w" ? wu() : hu()));
    }
    group.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    run();
  });
  form.addEventListener("input", run);
  form.addEventListener("change", run);

  // ---------- puppy weight ----------
  function growthShare(size, wk) {
    const G = window.GROWTH, W = G.weeks, S = G[size];
    if (wk >= W[W.length - 1]) return 1;
    let i = 1;
    while (W[i] < wk) i++;
    return S[i - 1] + ((S[i] - S[i - 1]) * (wk - W[i - 1])) / (W[i] - W[i - 1]);
  }
  function weeksTo(size, share) {
    for (let wk = 1; wk <= 104; wk++) if (growthShare(size, wk) >= share) return wk;
    return 104;
  }
  function meter(range, point, maxV) {
    const p = (v) => Math.max(0, Math.min(100, (v / maxV) * 100));
    return `<div class="meter" aria-hidden="true"><div class="rng" style="left:${p(range[0])}%;width:${p(range[1]) - p(range[0])}%"></div><div class="pt" style="left:${p(point)}%"></div>`
      + `<span class="lbl" style="left:${p(range[0])}%">${fW(range[0])}</span><span class="lbl" style="left:${p(range[1])}%">${fW(range[1])}</span></div>`;
  }
  function puppy() {
    const b = BY_ID[val("breed")];
    const size = b ? b.size : val("size");
    const sex = seg("sex");
    const age = num("age"), wkAge = val("ageUnit") === "m" ? age * 4.345 : age;
    const cur = toKg(num("weight"));
    if (!(age > 0) || !(cur > 0)) return `<p>Enter your puppy's age and weight.</p>`;
    if (wkAge < 6) return `<p>Puppies younger than 6 weeks grow too unevenly for a useful estimate. Try again at 8 weeks or later.</p>`;
    const share = growthShare(size, wkAge);
    const est = cur / share;
    const lo = est / 1.15, hi = est * 1.15;
    let html = `<p class="kicker">Estimated adult weight</p><p class="big">${fW(est)} <small>likely ${fWR([lo, hi])}</small></p>`;
    if (share >= 0.995) html += `<p>At this age a ${size.toLowerCase()} dog is usually fully grown, so the current weight is the adult weight.</p>`;
    else html += `<p>A typical ${size.toLowerCase()}-breed puppy has reached about <strong>${Math.round(share * 100)}%</strong> of its adult weight at ${val("ageUnit") === "m" ? `${age} months` : `${age} weeks`}, and reaches 90% at about ${Math.round(weeksTo(size, 0.9) / 4.345)} months.</p>`;
    if (b) {
      const r = b[sex].w;
      const where = est < r[0] * 0.95 ? "below" : est > r[1] * 1.05 ? "above" : "within";
      html += `<p>The breed standard for a ${sex === "m" ? "male" : "female"} ${esc(b.name)} is <strong>${fWR(r)}</strong>. Your estimate is <strong class="${where === "within" ? "ok" : "warn-t"}">${where}</strong> that range.${where !== "within" ? " Mixed ancestry, working or show lines and feeding all shift adult size; ask your vet if you're unsure." : ""}</p>`;
      html += meter(r, est, Math.max(r[1], hi) * 1.15);
      html += `<p><a href="/breeds/${b.id}/">${esc(b.name)} size profile →</a></p>`;
    }
    return html;
  }

  // ---------- crate size ----------
  function crate() {
    let len, top, note = "";
    if (seg("mode") === "breed") {
      const b = BY_ID[val("breed")];
      if (!b) return `<p>Choose a breed, or switch to <strong>My measurements</strong>.</p>`;
      const sex = seg("sex");
      const [lu, tu] = window.CRATE_BODY[b.id];
      // a dog in the upper part of the breed range; head held naturally
      // (the illustrations hold heads high and ears up, so trim them)
      const r = b[sex].h, withers = r[0] + 0.75 * (r[1] - r[0]);
      len = lu * withers * 0.88; top = withers * Math.max(1.14, tu * 0.8);
      note = `<p>Estimated for a fully grown ${sex === "m" ? "male" : "female"} ${esc(b.name)} (${fH(withers)} at the shoulder): about ${fH(len)} long and ${fH(top)} tall to the top of the head. Measure your own dog for a precise fit.</p>`;
    } else {
      len = toCm(num("len")); top = toCm(num("top"));
      if (!(len > 0) || !(top > 0)) return `<p>Enter your dog's length and head height.</p>`;
    }
    const needL = len + 7.5, needH = top + 5;
    const fit = window.CRATES.find((k) => k.l * 2.54 - 1 >= needL && k.h * 2.54 - 1 >= needH);
    const dims = (k) => units === "metric" ? `${Math.round(k.l * 2.54)} × ${Math.round(k.w * 2.54)} × ${Math.round(k.h * 2.54)} cm` : `${k.l} × ${k.w} × ${k.h} in`;
    let html = `<p class="kicker">Recommended crate</p>`;
    if (fit) html += `<p class="big">${fit.l}″ ${fit.name} <small>${dims(fit)}</small></p>`;
    else html += `<p class="big">Giant / custom <small>larger than 54″ crates</small></p><p>Your dog needs more room than standard wire crates offer. Look for heavy-duty giant-breed crates (60″ and up) or a custom-built kennel.</p>`;
    html += `<p>Inside, the crate should be at least <strong>${fH(needL)} long</strong> and <strong>${fH(needH)} high</strong>: dog length plus ${units === "metric" ? "7.5 cm" : "3 in"}, head height plus ${units === "metric" ? "5 cm" : "2 in"}.</p>${note}`;
    if (fit) {
      const i = window.CRATES.indexOf(fit);
      html += `<table class="data-table"><tbody>${window.CRATES.slice(Math.max(0, i - 1), i + 2).map((k) => `<tr><td>${k.name} (${k.l}″)</td><td>${dims(k)}</td><td>${k === fit ? `<span class="ok">Best fit</span>` : window.CRATES.indexOf(k) < i ? `<span class="bad">Too small</span>` : "Roomier"}</td></tr>`).join("")}</tbody></table>`;
    }
    return html;
  }

  // ---------- airline cabin ----------
  function airline() {
    let w, label;
    if (seg("mode") === "breed") {
      const b = BY_ID[val("breed")];
      if (!b) return `<p>Choose a breed, or switch to <strong>My dog's weight</strong>.</p>`;
      const sex = seg("sex");
      w = b[sex].w; label = `A ${sex === "m" ? "male" : "female"} ${esc(b.name)} weighs ${fWR(w)}`;
    } else {
      const x = toKg(num("weight"));
      if (!(x > 0)) return `<p>Enter your dog's weight.</p>`;
      w = [x, x]; label = `Your dog weighs ${fW(x)}`;
    }
    const carrier = toKg(num("carrier")) || 0;
    const rows = window.AIRLINES.airlines.map((a) => {
      let res, cls;
      if (!a.cabin) { res = "No pets in cabin"; cls = "bad"; }
      else if (a.limitKg == null) {
        res = w[0] > 9 ? "No weight limit, but too big for an under-seat carrier" : w[1] > 9 ? "No weight limit; bigger dogs won't fit under the seat" : "Fits (no weight limit, carrier must fit under seat)";
        cls = w[0] > 9 ? "bad" : w[1] > 9 ? "warn-t" : "ok";
      } else {
        const tot = [w[0] + carrier, w[1] + carrier];
        if (tot[1] <= a.limitKg) { res = `Fits (${fW(tot[1])} of ${fW(a.limitKg)})`; cls = "ok"; }
        else if (tot[0] <= a.limitKg) { res = `Lighter dogs only (limit ${fW(a.limitKg)})`; cls = "warn-t"; }
        else { res = `${fW(tot[0] - a.limitKg)} over the ${fW(a.limitKg)} limit`; cls = "bad"; }
      }
      return { a, res, cls };
    });
    const n = rows.filter((r) => r.cls === "ok").length, s = rows.filter((r) => r.cls === "warn-t").length;
    return `<p class="kicker">Result</p><p class="big">${n} <small>of ${rows.length} airlines${s ? `, plus ${s} if your dog is on the lighter side` : ""}</small></p>
      <p>${label}${carrier ? `, ${fW(carrier)} with the carrier added` : ""}.</p>
      <table class="data-table"><thead><tr><th>Airline</th><th>Cabin rule</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(r.a.name)}${r.a.verified ? "" : "*"}</td><td class="${r.cls}">${esc(r.res)}</td></tr>`).join("")}</tbody></table>
      <p class="table-note">Rules last reviewed ${esc(window.AIRLINES.reviewed)}. * Not confirmed on the airline's own website. Always confirm with the airline; limits can differ by route and aircraft.</p>`;
  }

  // ---------- dog years ----------
  function dogYears() {
    const y = (num("years") || 0) + (num("months") || 0) / 12;
    if (!(y > 0)) return `<p>Enter your dog's age.</p>`;
    const b = BY_ID[val("breed")];
    const size0 = b ? b.size : val("size");
    const size = size0 === "Toy" ? "Small" : size0;
    const T = window.DOG_YEARS[size];
    let human;
    if (y < 1) human = T[0] * y;
    else if (y >= T.length) human = T[T.length - 1] + (y - T.length) * (T[T.length - 1] - T[T.length - 2]);
    else { const i = Math.floor(y); human = T[i - 1] + (T[i] - T[i - 1]) * (y - i); }
    const dna = y >= 0.5 ? 16 * Math.log(y) + 31 : null;
    let html = `<p class="kicker">In human years</p><p class="big">${Math.round(human)} <small>years old</small></p>`;
    html += `<p>Based on the veterinary age chart for ${size0.toLowerCase()} dogs.${dna != null ? ` The DNA-based formula (16 × ln(age) + 31) gives <strong>${Math.round(dna)}</strong>.` : ""}</p>`;
    const stage = human < 12 ? "a puppy" : human < 20 ? "an adolescent" : human < 50 ? "an adult" : human < 70 ? "a mature adult" : "a senior";
    html += `<p>Life stage: <strong>${stage}</strong>.</p>`;
    if (b) {
      const l = avg(b.life);
      html += `<p>The ${esc(b.name)} typically lives ${b.life[0]}–${b.life[1]} years, so your dog is about <strong>${Math.round((y / l) * 100)}%</strong> of the way through a typical lifespan. <a href="/breeds/${b.id}/">${esc(b.name)} profile →</a></p>`;
    }
    return html;
  }

  function run() {
    showFields();
    out.innerHTML = { "puppy-weight": puppy, "crate-size": crate, "airline-cabin": airline, "dog-years": dogYears }[kind]();
  }
  // preselect a breed from ?breed=
  const q = new URLSearchParams(location.search).get("breed");
  if (q && BY_ID[q] && form.elements.breed) form.elements.breed.value = q;
  run();
})();
