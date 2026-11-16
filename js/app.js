(function () {
  "use strict";

  // ---------- data ----------
  const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const avg = (r) => (r[0] + r[1]) / 2;

  const BREEDS = window.BREED_ROWS.map((r) => {
    const b = {
      name: r[0], group: r[1], origin: r[2], type: r[3],
      m: { h: [r[4], r[5]], w: [r[8], r[9]] },
      f: { h: [r[6], r[7]], w: [r[10], r[11]] },
      life: [r[12], r[13]],
      ov: r[14] || null,
    };
    b.id = slug(b.name);
    const w = (avg(b.m.w) + avg(b.f.w)) / 2;
    b.size = w < 5 ? "Toy" : w < 10 ? "Small" : w < 25 ? "Medium" : w < 45 ? "Large" : "Giant";
    b.hAvg = (avg(b.m.h) + avg(b.f.h)) / 2;
    b.wAvg = w;
    return b;
  }).sort((a, b) => a.name.localeCompare(b.name));
  const BY_ID = Object.fromEntries(BREEDS.map((b) => [b.id, b]));
  const SIZES = ["Toy", "Small", "Medium", "Large", "Giant"];
  const GROUPS = [...new Set(BREEDS.map((b) => b.group))].sort();
  const COLORS = ["#c2562b", "#2f6db5", "#3d8b5a", "#8a4fbf", "#c9962a", "#1f8a8a", "#c2457a", "#6b6f2a", "#5b5bd6", "#8c5a3c"];
  const MAX = 10;

  // Illustrations (img/dogs/web/<id>.webp) are described in withers units like the
  // generated silhouettes: 1 unit = withers height, ground at y = 0, facing right.
  const DOG_IMAGES = window.DOG_IMAGES || {};
  const imageShape = (id) => {
    const [aspect, wy, wx] = DOG_IMAGES[id];
    const h = 1 / wy, w = aspect * h;
    return { img: `img/dogs/web/${id}.webp`, minX: 0, maxX: w, maxY: h, withersX: wx * w };
  };
  const shapeCache = {};

  // ---------- your own dog ----------
  const MY_ID = "my-dog";
  const MY_TYPES = [
    ["retriever", "Retriever / Labrador"], ["shepherd", "Shepherd"], ["terrier", "Terrier"], ["spitz", "Spitz / Pomeranian"],
    ["toy", "Toy / Chihuahua"], ["longcoat", "Long coat / Shih Tzu"], ["poodle", "Poodle / doodle"], ["spaniel", "Spaniel"],
    ["scenthound", "Hound / Beagle"], ["sighthound", "Greyhound / Whippet"], ["bully", "Bull breed / Staffie"], ["brachy", "Pug / French Bulldog"],
    ["longlow", "Dachshund"], ["corgi", "Corgi"], ["nordic", "Husky"], ["mountain", "Mountain dog"], ["mastiff", "Mastiff"], ["shaggy", "Shaggy / sheepdog"],
  ];
  function setMyDog(my) {
    delete shapeCache[MY_ID];
    if (!my) { delete BY_ID[MY_ID]; return; }
    const w = my.w;
    BY_ID[MY_ID] = {
      id: MY_ID, name: my.name || "My dog", group: "Your dog", origin: "—", type: my.type, custom: true,
      m: { h: [my.h, my.h], w: [w, w] }, f: { h: [my.h, my.h], w: [w, w] }, life: null, ov: null,
      size: w < 5 ? "Toy" : w < 10 ? "Small" : w < 25 ? "Medium" : w < 45 ? "Large" : "Giant", hAvg: my.h, wAvg: w,
    };
  }
  const shapeOf = (b) => (shapeCache[b.id] ||= DOG_IMAGES[b.id] ? imageShape(b.id) : DogRenderer.build(b.type, b.ov));

  // ---------- state ----------
  const state = {
    entries: [], // { id, sex: 'm'|'f'|'both' }
    defaultSex: "m",
    units: "metric",
    sizeMode: "avg",
    human: true,
    humanH: 175,
    ranges: true,
    lib: { q: "", group: "", size: "", sort: "name", cabin: "" },
    my: null, // { name, h (cm), w (kg), type }
  };

  const PRESETS = [
    { label: "Smallest vs largest", ids: ["chihuahua", "irish-wolfhound", "mastiff-english", "dachshund-miniature"] },
    { label: "Family favourites", ids: ["labrador-retriever", "golden-retriever", "french-bulldog", "beagle", "german-shepherd-dog"] },
    { label: "Giants", ids: ["great-dane", "irish-wolfhound", "mastiff-english", "saint-bernard", "leonberger", "newfoundland"] },
    { label: "Poodles & doodles", ids: ["toy-poodle", "miniature-poodle", "standard-poodle", "cockapoo", "labradoodle-standard", "bernedoodle-standard"] },
  ];

  // ---------- units ----------
  const cm2in = (v) => v / 2.54;
  const kg2lb = (v) => v * 2.20462;
  const round = (v, d) => { const p = 10 ** d; return Math.round(v * p) / p; };
  function fmtH(cm, withUnit = true) {
    const v = state.units === "metric" ? round(cm, cm < 20 ? 1 : 0) : round(cm2in(cm), 1);
    return withUnit ? `${v} ${state.units === "metric" ? "cm" : "in"}` : `${v}`;
  }
  function fmtW(kg, withUnit = true) {
    const raw = state.units === "metric" ? kg : kg2lb(kg);
    const v = round(raw, raw < 10 ? 1 : 0);
    return withUnit ? `${v} ${state.units === "metric" ? "kg" : "lb"}` : `${v}`;
  }
  const fmtHR = (r) => (fmtH(r[0]) === fmtH(r[1]) ? fmtH(r[0]) : `${fmtH(r[0], false)}–${fmtH(r[1])}`);
  const fmtWR = (r) => (fmtW(r[0]) === fmtW(r[1]) ? fmtW(r[0]) : `${fmtW(r[0], false)}–${fmtW(r[1])}`);
  const fmtLife = (r) => (!r ? "—" : r[0] === r[1] ? `${r[0]} yrs` : `${r[0]}–${r[1]} yrs`);

  // ---------- airplane cabin ----------
  // Strictest common airline rule: dog + carrier ≤ 8 kg (Lufthansa, KLM, Air France, Turkish Airlines).
  // American Airlines allows 20 lb (9.07 kg) incl. carrier; Delta/United set no weight limit but the
  // carrier must fit under the seat. A soft carrier weighs roughly 1–2 kg; we allow 1.5 kg.
  const CABIN = { limitKg: 8, carrierKg: 1.5 };
  const CABIN_MAX_DOG = CABIN.limitKg - CABIN.carrierKg;
  /** 'yes' = whole weight range fits, 'some' = only lighter individuals fit, 'no' = none fit. */
  const cabinFor = (w) => (w[1] <= CABIN_MAX_DOG ? "yes" : w[0] <= CABIN_MAX_DOG ? "some" : "no");
  function cabinBreed(b) {
    const m = cabinFor(b.m.w), f = cabinFor(b.f.w);
    return m === "yes" && f === "yes" ? "yes" : m === "no" && f === "no" ? "no" : "some";
  }
  const CABIN_TEXT = {
    yes: "✈ Cabin",
    some: "✈ Some",
    no: "Hold only",
  };
  const cabinTitle = (s) => ({
    yes: `Fits the strict airline cabin rule: dog + carrier ≤ ${CABIN.limitKg} kg (dog up to about ${CABIN_MAX_DOG} kg).`,
    some: `Only lighter dogs fit the ${CABIN.limitKg} kg cabin limit (dog + carrier); heavier ones travel in the hold.`,
    no: `Too heavy for the ${CABIN.limitKg} kg cabin limit (dog + carrier); travels in the hold.`,
  }[s]);

  // ---------- sources ----------
  const SOURCES = window.BREED_SOURCES || {};
  const SRC_LABEL = { AKC: "AKC", FCI: "FCI", UKC: "UKC", PTCA: "PTCA", Typical: "Typical (no standard)" };
  function sourceInfo(b, sex) {
    if (b.custom) return { label: "Your measurements", warn: false, notes: "" };
    const s = SOURCES[b.name] || { src: "Unverified" };
    const flagged = (s.unverified || []).filter((f) => f.startsWith(sex === "m" ? "male" : "female"));
    const notes = [];
    if (flagged.length) notes.push(`No official figure for: ${flagged.join(", ")} — typical value shown.`);
    if (s.note) notes.push(s.note);
    return { label: SRC_LABEL[s.src] || s.src, warn: flagged.length > 0 || !!s.note || s.src === "Typical" || s.src === "Unverified", notes: notes.join(" ") };
  }
  const pick = (r) => (state.sizeMode === "min" ? r[0] : state.sizeMode === "max" ? r[1] : avg(r));

  // ---------- helpers ----------
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const sexSym = { m: "♂", f: "♀" };
  const sexWord = { m: "Male", f: "Female" };

  function colorFor(i) { return COLORS[i % COLORS.length]; }

  /** Flatten entries into drawable items (one per sex). */
  function items() {
    const out = [];
    state.entries.forEach((e, i) => {
      const b = BY_ID[e.id];
      if (!b) return;
      const sexes = b.custom ? ["m"] : e.sex === "both" ? ["m", "f"] : [e.sex];
      for (const s of sexes) out.push({ b, sex: s, idx: i, color: colorFor(i), h: b[s].h, w: b[s].w });
    });
    return out;
  }

  function addBreed(id) {
    if (!BY_ID[id]) return;
    if (state.entries.some((e) => e.id === id)) return;
    if (state.entries.length >= MAX) { toast(`You can compare up to ${MAX} breeds`); return; }
    state.entries.push({ id, sex: state.defaultSex });
    update();
  }
  function removeBreed(id) {
    state.entries = state.entries.filter((e) => e.id !== id);
    if (id === MY_ID) { state.my = null; setMyDog(null); }
    update();
  }
  function toggleBreed(id) {
    state.entries.some((e) => e.id === id) ? removeBreed(id) : addBreed(id);
  }

  let toastTimer;
  function toast(msg) {
    let t = $(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 1800);
  }

  // ---------- stage (SVG visualisation) ----------
  function niceStep(rangeUnits, targetLines) {
    const raw = rangeUnits / targetLines;
    const pow = 10 ** Math.floor(Math.log10(raw));
    const n = raw / pow;
    const step = n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10;
    return step * pow;
  }

  function renderStage() {
    const el = $("#stage");
    el.style.height = "";
    const Wpx = el.clientWidth || 900;
    const Hpx = el.clientHeight || 460;
    const its = items();

    if (!its.length && !state.human) {
      el.innerHTML = `<svg viewBox="0 0 ${Wpx} ${Hpx}"><text class="empty-msg" x="${Wpx / 2}" y="${Hpx / 2}" text-anchor="middle">Add a breed to start comparing</text></svg>`;
      return;
    }

    // Build layout in cm
    const objs = [];
    if (state.human) {
      const hs = DogRenderer.human();
      objs.push({ kind: "human", shape: hs, hCm: state.humanH });
    }
    for (const it of its) objs.push({ kind: "dog", it, shape: shapeOf(it.b), hCm: pick(it.h) });

    const maxTopCm = Math.max(...objs.map((o) => o.shape.maxY * o.hCm), 30);
    const maxHCm = Math.max(...objs.map((o) => o.hCm));
    const gapCm = Math.max(10, maxHCm * 0.18);
    let widthCm = 0;
    objs.forEach((o, i) => {
      o.wCm = (o.shape.maxX - o.shape.minX) * o.hCm;
      // male + female of the same breed sit closer together
      o.gapBefore = !i ? 0 : (o.it && objs[i - 1].it && objs[i - 1].it.idx === o.it.idx) ? gapCm * 0.35 : gapCm;
      widthCm += o.wCm + o.gapBefore;
    });

    const padL = 46, padR = 16, padT = 34, padB = 58;
    const k = Math.min((Wpx - padL - padR) / widthCm, (Hpx - padT - padB) / (maxTopCm * 1.04));
    // When width is the limiting factor, shrink the drawing height to fit the content.
    const usedH = Math.max(220, Math.ceil(maxTopCm * 1.04 * k + padT + padB));
    const groundY = Math.min(Hpx, usedH) - padB;
    const contentW = widthCm * k;
    let x = padL + Math.max(0, (Wpx - padL - padR - contentW) / 2);

    // grid
    const metric = state.units === "metric";
    const unitCm = metric ? 1 : 2.54;
    const visibleUnits = (groundY - padT + 12) / k / unitCm;
    const step = niceStep(visibleUnits, 6);
    let grid = "";
    for (let v = 0; v <= visibleUnits; v += step) {
      const y = groundY - v * unitCm * k;
      const isTop = v + step > visibleUnits;
      if (v > 0) grid += `<line class="grid-line" x1="${padL - 6}" x2="${Wpx - padR}" y1="${y}" y2="${y}"/>`;
      grid += `<text class="grid-label" x="${padL - 10}" y="${y + 4}" text-anchor="end">${round(v, 1)}</text>`;
      if (isTop) grid += `<text class="grid-label" x="${padL - 4}" y="${y - 6}" text-anchor="start">${metric ? "cm" : "in"}</text>`;
    }

    let body = "";
    let labels = "";
    const labelSlots = [];
    objs.forEach((o, i) => {
      x += o.gapBefore * k;
      const s = o.hCm * k; // px per withers unit
      const ox = x - o.shape.minX * s;
      const centerX = x + o.wCm * k / 2;
      if (o.kind === "human") {
        body += `<g class="human" transform="translate(${ox} ${groundY}) scale(${s} ${-s})">${o.shape.markup}</g>`;
        labels += `<text class="label-sub" x="${centerX}" y="${groundY + 18}" text-anchor="middle">Human · ${fmtH(o.hCm)}</text>`;
        labelSlots.push({ x: centerX, w: 100, row: 0 });
      } else {
        const it = o.it;
        const cls = `dog ${it.sex === "f" ? "female" : "male"}`;
        if (o.shape.img) {
          const iw = o.shape.maxX * s, ih = o.shape.maxY * s;
          body += `<image class="${cls} dog-img" href="${o.shape.img}" x="${ox}" y="${groundY - ih}" width="${iw}" height="${ih}" preserveAspectRatio="none"><title>${esc(it.b.name)}</title></image>`;
          // colour key under the paws, matching the numbered badge
          body += `<line class="dog-key${it.sex === "f" ? " female" : ""}" x1="${ox + iw * 0.12}" x2="${ox + iw * 0.88}" y1="${groundY + 3}" y2="${groundY + 3}" stroke="${it.color}"/>`;
        } else {
          body += `<g class="${cls}" style="color:${it.color}" transform="translate(${ox} ${groundY}) scale(${s} ${-s})">${o.shape.markup}</g>`;
        }

        // withers marker + range bar
        const wx = ox + o.shape.withersX * s;
        const wy = groundY - o.hCm * k;
        if (state.ranges) {
          const y0 = groundY - it.h[0] * k, y1 = groundY - it.h[1] * k;
          body += `<line class="withers-line" x1="${wx - 14}" x2="${wx + 14}" y1="${wy}" y2="${wy}"/>`;
          if (y0 - y1 > 1.5) {
            body += `<g><line class="range-halo" x1="${wx}" x2="${wx}" y1="${y0}" y2="${y1}"/><line class="range-bar" x1="${wx}" x2="${wx}" y1="${y0}" y2="${y1}"/>` +
              `<line class="range-bar" x1="${wx - 4}" x2="${wx + 4}" y1="${y0}" y2="${y0}"/><line class="range-bar" x1="${wx - 4}" x2="${wx + 4}" y1="${y1}" y2="${y1}"/></g>`;
          }
        }
        // badge above head
        const topY = groundY - o.shape.maxY * o.hCm * k;
        const by = Math.max(12, topY - 14);
        labels += `<circle cx="${centerX}" cy="${by}" r="9" fill="${it.color}"/><text class="badge-text" x="${centerX}" y="${by + 4}" text-anchor="middle">${it.idx + 1}</text>`;

        // ground labels, staggered when crowded
        const name = it.b.name.length > 22 ? it.b.name.slice(0, 20) + "…" : it.b.name;
        const estW = Math.max(name.length * 7.2 + 14, 80);
        const lx = Math.min(Math.max(centerX, estW / 2 + 4), Wpx - estW / 2 - 4);
        let row = 0;
        while (labelSlots.some((sl) => sl.row === row && Math.abs(sl.x - lx) < (sl.w + estW) / 2 + 6)) row++;
        labelSlots.push({ x: lx, w: estW, row });
        const ly = groundY + 17 + row * 30;
        labels += `<text class="label-name" x="${lx}" y="${ly}" text-anchor="middle">${esc(name)}${it.b.custom ? "" : ` <tspan fill="${it.sex === "m" ? "var(--male)" : "var(--female)"}">${sexSym[it.sex]}</tspan>`}</text>`;
        labels += `<text class="label-sub" x="${lx}" y="${ly + 13}" text-anchor="middle">${fmtH(o.hCm)} · ${fmtW(pick(it.w))}</text>`;
      }
      x += o.wCm * k;
    });

    const rows = labelSlots.length ? Math.max(...labelSlots.map((s) => s.row)) + 1 : 1;
    const totalH = groundY + 14 + rows * 30;
    el.innerHTML =
      `<svg viewBox="0 0 ${Wpx} ${totalH}" role="img" aria-label="Dog size comparison drawn to scale">` +
      grid +
      `<line class="ground" x1="${padL - 6}" x2="${Wpx - padR}" y1="${groundY}" y2="${groundY}"/>` +
      body + labels +
      `</svg>`;
    el.style.height = `${totalH}px`;
  }

  // ---------- bars ----------
  function renderBars() {
    const its = items();
    const hb = $("#height-bars"), wb = $("#weight-bars");
    if (!its.length) {
      hb.innerHTML = wb.innerHTML = `<div class="empty">No breeds selected yet.</div>`;
      return;
    }
    const maxH = Math.max(...its.map((i) => i.h[1])) * 1.28;
    const maxW = Math.max(...its.map((i) => i.w[1])) * 1.32;
    const row = (it, r, max, fmt) => {
      const l = (r[0] / max) * 100, w = ((r[1] - r[0]) / max) * 100, a = (avg(r) / max) * 100;
      return `<div class="bar-row">
        <div class="lbl"><span class="dot" style="background:${it.color}"></span><span>${esc(it.b.name)}${it.b.custom ? "" : ` <span class="sex-${it.sex}">${sexSym[it.sex]}</span>`}</span></div>
        <div class="bar-track" title="${esc(it.b.name)} ${sexWord[it.sex]}: ${fmt(r)}">
          <div class="bar-range" style="left:${l}%;width:${Math.max(w, 0.6)}%;background:${it.color}"></div>
          <div class="bar-avg" style="left:${a}%;background:${it.color}"></div>
          <div class="bar-val" style="left:${l + w}%">${fmt(r)}</div>
        </div></div>`;
    };
    hb.innerHTML = its.map((it) => row(it, it.h, maxH, fmtHR)).join("");
    wb.innerHTML = its.map((it) => row(it, it.w, maxW, fmtWR)).join("");
  }

  // ---------- table ----------
  function renderTable() {
    const its = items();
    const t = $("#data-table");
    if (!its.length) { t.innerHTML = `<tbody><tr><td class="muted">Add breeds to see their measurements.</td></tr></tbody>`; return; }
    const ref = its[0];
    const hU = state.units === "metric" ? "cm" : "in";
    const wU = state.units === "metric" ? "kg" : "lb";
    const head = `<thead><tr>
      <th>#</th><th>Breed</th><th>Sex</th>
      <th>Height range</th><th>Avg height</th><th>Weight range</th><th>Avg weight</th>
      <th>Height vs #1</th><th>Weight vs #1</th>
      <th>Airplane cabin</th><th>Size class</th><th>Group</th><th>Origin</th><th>Life span</th><th>Source</th></tr></thead>`;
    let prev = -1;
    const rows = its.map((it) => {
      const hRel = avg(it.h) / avg(ref.h), wRel = avg(it.w) / avg(ref.w);
      const same = it === ref;
      const tr = `<tr class="${it.idx !== prev && prev !== -1 ? "group-start" : ""}">
        <td><span class="dot" style="background:${it.color};display:inline-block"></span> ${it.idx + 1}</td>
        <td class="breed">${it.b.custom ? esc(it.b.name) : `<a href="/breeds/${it.b.id}/">${esc(it.b.name)}</a>`}</td>
        <td class="sex-${it.sex}">${it.b.custom ? "—" : `${sexSym[it.sex]} ${sexWord[it.sex]}`}</td>
        <td>${fmtHR(it.h)}</td><td>${fmtH(avg(it.h))}</td>
        <td>${fmtWR(it.w)}</td><td>${fmtW(avg(it.w))}</td>
        <td class="rel">${same ? "—" : round(hRel, 2) + "×"}</td>
        <td class="rel">${same ? "—" : round(wRel, 2) + "×"}</td>
        ${(() => { const c = cabinFor(it.w); return `<td><span class="cabin cabin-${c}" title="${esc(cabinTitle(c))}">${c === "yes" ? "✈ Yes" : c === "some" ? "✈ Lighter dogs" : "No (hold)"}</span></td>`; })()}
        <td>${it.b.size}</td><td>${esc(it.b.group)}</td><td>${esc(it.b.origin)}</td>
        <td>${fmtLife(it.b.life)}</td>
        ${(() => { const s = sourceInfo(it.b, it.sex); return `<td class="src${s.warn ? " warn" : ""}"${s.notes ? ` title="${esc(s.notes)}"` : ""}>${esc(s.label)}${s.warn ? " ⚠" : ""}</td>`; })()}</tr>`;
      prev = it.idx;
      return tr;
    }).join("");
    t.innerHTML = head + `<tbody>${rows}</tbody>` +
      `<caption style="caption-side:bottom;text-align:left;padding-top:10px;color:var(--ink-3);font-size:12px">Heights in ${hU} at the withers, weights in ${wU}. “vs #1” compares averages to the first row. ⚠ = the source gives no exact figure for part of this row; hover for details.</caption>`;
  }

  // ---------- insight ----------
  function renderInsight() {
    const its = items();
    const el = $("#insight");
    if (its.length < 2) { el.innerHTML = ""; return; }
    const byH = [...its].sort((a, b) => avg(b.h) - avg(a.h));
    const big = byH[0], small = byH[byH.length - 1];
    const hx = avg(big.h) / avg(small.h);
    const wx = avg(big.w) / avg(small.w);
    const n = (it) => `<strong>${esc(it.b.name)}</strong>${state.entries.length !== its.length || its.filter((x) => x.b === it.b).length > 1 ? ` (${sexWord[it.sex].toLowerCase()})` : ""}`;
    el.innerHTML = `<span class="pill">An average ${n(big)} stands <strong>${round(hx, 1)}×</strong> as tall and weighs about <strong>${round(wx, 1)}×</strong> as much as an average ${n(small)}.</span>`;
  }

  // ---------- chips ----------
  function renderChips() {
    const ul = $("#chips");
    if (!state.entries.length) { ul.innerHTML = `<li class="empty">No breeds yet — search above, pick a preset, or browse the library below.</li>`; return; }
    ul.innerHTML = state.entries.map((e, i) => {
      const b = BY_ID[e.id];
      const btn = (v, lbl, title) => `<button data-sex="${v}" aria-pressed="${e.sex === v}" title="${title}">${lbl}</button>`;
      return `<li class="chip" data-id="${e.id}">
        <span class="num" style="background:${colorFor(i)}">${i + 1}</span>
        <span class="name" title="${esc(b.name)}">${esc(b.name)}</span>
        ${b.custom ? "" : `<span class="mini-seg">${btn("m", "♂", "Male")}${btn("f", "♀", "Female")}${btn("both", "♂♀", "Male and female")}</span>`}
        <button class="x" aria-label="Remove ${esc(b.name)}">×</button></li>`;
    }).join("");
  }

  // ---------- library ----------
  function miniSvg(b) {
    const s = shapeOf(b);
    if (s.img) return `<img class="lib-thumb" src="${s.img}" alt="${esc(b.name)}" loading="lazy" decoding="async" width="64" height="44">`;
    const w = s.maxX - s.minX, h = s.maxY;
    return `<svg viewBox="${s.minX} ${-h} ${w} ${h}" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><g transform="scale(1 -1)">${s.markup}</g></svg>`;
  }

  function renderLibrary() {
    const { q, group, size, sort, cabin } = state.lib;
    const qq = slug(q);
    let list = BREEDS.filter((b) => (!qq || b.id.includes(qq) || slug(b.origin).includes(qq)) && (!group || b.group === group) && (!size || b.size === size)
      && (!cabin || (cabin === "yes" ? cabinBreed(b) === "yes" : cabinBreed(b) !== "no")));
    const cmp = {
      name: (a, b) => a.name.localeCompare(b.name),
      "h-desc": (a, b) => b.hAvg - a.hAvg, "h-asc": (a, b) => a.hAvg - b.hAvg,
      "w-desc": (a, b) => b.wAvg - a.wAvg, "w-asc": (a, b) => a.wAvg - b.wAvg,
    }[sort];
    list.sort(cmp);
    $("#lib-count").textContent = `· ${list.length} of ${BREEDS.length}`;
    const sel = new Set(state.entries.map((e) => e.id));
    $("#lib-list").innerHTML = list.map((b) => `
      <button class="lib-item${sel.has(b.id) ? " selected" : ""}" data-id="${b.id}" aria-pressed="${sel.has(b.id)}">
        ${miniSvg(b)}
        <span class="meta"><span class="nm" style="display:block">${esc(b.name)}${cabinBreed(b) !== "no" ? ` <span class="cabin cabin-${cabinBreed(b)}" title="${esc(cabinTitle(cabinBreed(b)))}">${CABIN_TEXT[cabinBreed(b)]}</span>` : ""}</span>
        <span class="st" style="display:block">♂ ${fmtHR(b.m.h)} · ${fmtWR(b.m.w)}</span>
        <span class="st" style="display:block">♀ ${fmtHR(b.f.h)} · ${fmtWR(b.f.w)}</span></span>
        <span class="add">${sel.has(b.id) ? "✓" : "+"}</span>
      </button>`).join("") || `<p class="muted">No breeds match.</p>`;
  }

  // ---------- controls ----------
  function syncSeg(sel, val) {
    document.querySelectorAll(`${sel} button`).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === val)));
  }
  function renderControls() {
    const allSame = state.entries.length && state.entries.every((e) => e.sex === state.entries[0].sex) ? state.entries[0].sex : state.entries.length ? "" : state.defaultSex;
    syncSeg("#sex-all", allSame);
    syncSeg("#units", state.units);
    syncSeg("#size-mode", state.sizeMode);
    $("#human-on").checked = state.human;
    $("#human-h").value = state.humanH;
    $("#human-h").disabled = !state.human;
    $("#human-h-out").textContent = state.units === "metric" ? `${state.humanH} cm` : `${Math.floor(cm2in(state.humanH) / 12)}′ ${Math.round(cm2in(state.humanH) % 12)}″`;
    $("#ranges-on").checked = state.ranges;
  }

  // ---------- URL state ----------
  function writeHash() {
    const p = new URLSearchParams();
    if (state.entries.length) p.set("b", state.entries.map((e) => `${e.id}:${e.sex}`).join(","));
    if (state.units !== "metric") p.set("u", state.units);
    if (state.sizeMode !== "avg") p.set("s", state.sizeMode);
    if (!state.human) p.set("h", "0"); else if (state.humanH !== 175) p.set("h", state.humanH);
    if (!state.ranges) p.set("r", "0");
    if (state.my && state.entries.some((e) => e.id === MY_ID)) p.set("my", [state.my.name, state.my.h, state.my.w, state.my.type].join("~"));
    const h = p.toString();
    history.replaceState(null, "", h ? `#${h}` : location.pathname + location.search);
  }
  function readHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    if (p.has("my")) {
      const [name, h, w, type] = p.get("my").split("~");
      if (+h > 0 && +w > 0) { state.my = { name: (name || "My dog").slice(0, 24), h: Math.min(120, +h), w: Math.min(120, +w), type: MY_TYPES.some((t) => t[0] === type) ? type : "retriever" }; setMyDog(state.my); }
    }
    if (p.has("b")) {
      state.entries = p.get("b").split(",").map((s) => { const [id, sex] = s.split(":"); return { id, sex: ["m", "f", "both"].includes(sex) ? sex : "m" }; })
        .filter((e) => BY_ID[e.id]).slice(0, MAX);
    }
    if (p.get("u") === "imperial") state.units = "imperial";
    if (["min", "max"].includes(p.get("s"))) state.sizeMode = p.get("s");
    if (p.get("h") === "0") state.human = false; else if (+p.get("h")) state.humanH = Math.min(210, Math.max(90, +p.get("h")));
    if (p.get("r") === "0") state.ranges = false;
    return p.has("b");
  }

  // ---------- update ----------
  function update({ library = true } = {}) {
    renderChips();
    renderControls();
    renderStage();
    renderInsight();
    renderBars();
    renderTable();
    if (library) renderLibrary();
    writeHash();
  }

  // ---------- quick search ----------
  function setupQuickSearch() {
    const input = $("#quick-search"), list = $("#quick-results");
    let results = [], active = 0;
    const close = () => { list.hidden = true; input.setAttribute("aria-expanded", "false"); };
    const draw = () => {
      list.innerHTML = results.map((b, i) => `<li role="option" data-id="${b.id}" aria-selected="${i === active}"><span>${esc(b.name)}</span><small>${b.size} · ${fmtHR([Math.min(b.m.h[0], b.f.h[0]), Math.max(b.m.h[1], b.f.h[1])])}</small></li>`).join("");
      list.hidden = !results.length;
    };
    input.addEventListener("input", () => {
      const q = slug(input.value);
      if (!q) { close(); return; }
      results = BREEDS.filter((b) => b.id.includes(q))
        .sort((a, b) => (a.id.startsWith(q) ? 0 : 1) - (b.id.startsWith(q) ? 0 : 1) || a.name.localeCompare(b.name))
        .slice(0, 12);
      active = 0; draw();
    });
    input.addEventListener("keydown", (e) => {
      if (list.hidden) return;
      if (e.key === "ArrowDown") { active = Math.min(results.length - 1, active + 1); draw(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { active = Math.max(0, active - 1); draw(); e.preventDefault(); }
      else if (e.key === "Enter") { if (results[active]) { addBreed(results[active].id); input.value = ""; close(); } e.preventDefault(); }
      else if (e.key === "Escape") close();
    });
    list.addEventListener("mousedown", (e) => {
      const li = e.target.closest("li"); if (!li) return;
      e.preventDefault(); addBreed(li.dataset.id); input.value = ""; close(); input.focus();
    });
    input.addEventListener("blur", () => setTimeout(close, 100));
  }

  // ---------- "add your own dog" form ----------
  function setupMyDog() {
    const form = $("#mydog-form"), toggle = $("#mydog-toggle");
    form.elements.type.innerHTML = MY_TYPES.map(([v, l]) => `<option value="${v}">${l}</option>`).join("");
    const open = (on) => {
      form.hidden = !on; toggle.setAttribute("aria-expanded", String(on));
      if (!on) return;
      const metric = state.units === "metric";
      $(".mydog-hu").textContent = metric ? "cm" : "in";
      $(".mydog-wu").textContent = metric ? "kg" : "lb";
      const m = state.my;
      form.elements.name.value = m ? m.name : "";
      form.elements.h.value = m ? round(metric ? m.h : cm2in(m.h), 1) : "";
      form.elements.w.value = m ? round(metric ? m.w : kg2lb(m.w), 1) : "";
      if (m) form.elements.type.value = m.type;
      form.elements.h.focus();
    };
    toggle.addEventListener("click", () => open(form.hidden));
    $("#mydog-cancel").addEventListener("click", () => open(false));
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const metric = state.units === "metric";
      const h = +form.elements.h.value, w = +form.elements.w.value;
      if (!(h > 0) || !(w > 0)) return;
      state.my = { name: form.elements.name.value.trim().slice(0, 24) || "My dog", h: metric ? h : h * 2.54, w: metric ? w : w / 2.20462, type: form.elements.type.value };
      setMyDog(state.my);
      if (!state.entries.some((x) => x.id === MY_ID)) {
        if (state.entries.length >= MAX) state.entries.pop();
        state.entries.unshift({ id: MY_ID, sex: "m" });
      }
      open(false);
      update();
    });
  }

  // ---------- download / share the drawing as a PNG ----------
  const dataUrlCache = {};
  async function toDataUrl(url) {
    if (dataUrlCache[url]) return dataUrlCache[url];
    const blob = await fetch(url).then((r) => r.blob());
    return (dataUrlCache[url] = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); }));
  }
  async function renderPng() {
    const svg = $("#stage svg");
    if (!svg) throw new Error("nothing to export");
    const vb = svg.viewBox.baseVal, W = vb.width, H = vb.height;
    const cs = getComputedStyle(document.documentElement), v = (n) => cs.getPropertyValue(n).trim();
    const font = "Inter, Helvetica, Arial, sans-serif";
    const clone = svg.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", W); clone.setAttribute("height", H);
    await Promise.all([...clone.querySelectorAll("image")].map(async (im) => im.setAttribute("href", await toDataUrl(im.getAttribute("href")))));
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = `.grid-line{stroke:${v("--grid")}}.grid-label{fill:${v("--ink-3")};font:11px ${font}}.ground{stroke:${v("--ink-3")};stroke-width:1.5}
      .human{color:${v("--ink-3")};opacity:.45}.dog .far,.dog .ear{filter:brightness(.72)}.dog .eye{fill:${v("--surface")};opacity:.9}.dog.female{opacity:.78}.dog-img.female{opacity:1}
      .dog-key{stroke-width:3;stroke-linecap:round}.dog-key.female{stroke-dasharray:6 4}.label-name{fill:${v("--ink")};font:600 12.5px ${font}}
      .label-sub{fill:${v("--ink-3")};font:11.5px ${font}}.badge-text{fill:#fff;font:700 11px ${font}}.range-bar{stroke:${v("--ink")};stroke-width:2}
      .range-halo{stroke:${v("--surface")};stroke-width:5;opacity:.85}.withers-line{stroke:${v("--ink-2")};stroke-width:1;stroke-dasharray:3 3;opacity:.7}`;
    clone.insertBefore(style, clone.firstChild);
    const xml = new XMLSerializer().serializeToString(clone).replace(/var\(--male\)/g, v("--male")).replace(/var\(--female\)/g, v("--female"));
    const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml" }));
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = 2, head = 64, foot = 34;
    const canvas = document.createElement("canvas");
    canvas.width = W * scale; canvas.height = (H + head + foot) * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    ctx.fillStyle = v("--surface"); ctx.fillRect(0, 0, W, H + head + foot);
    const names = [...new Set(items().map((it) => it.b.name))];
    let title = names.join(" vs ");
    if (title.length > 70) title = `${names.length} dog breeds compared`;
    ctx.fillStyle = v("--ink"); ctx.font = `700 22px Fraunces, Georgia, serif`; ctx.fillText(title, 20, 36);
    ctx.fillStyle = v("--ink-3"); ctx.font = `13px ${font}`; ctx.fillText(`Drawn to scale by height at the shoulder · ${state.units === "metric" ? "cm / kg" : "in / lb"}`, 20, 56);
    ctx.drawImage(img, 0, head, W, H);
    ctx.fillStyle = v("--accent"); ctx.font = `600 13px ${font}`; ctx.textAlign = "right"; ctx.fillText("dogsizecomparison.com", W - 18, H + head + 22);
    URL.revokeObjectURL(url);
    return new Promise((res) => canvas.toBlob(res, "image/png"));
  }
  const fileName = () => `dog-size-comparison-${state.entries.slice(0, 3).map((e) => e.id).join("-") || "chart"}.png`;
  function setupExport() {
    $("#dl-png").addEventListener("click", async () => {
      try {
        const blob = await renderPng();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = fileName();
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      } catch (err) { console.error(err); toast("Couldn't create the image"); }
    });
    const share = $("#share-png");
    try { share.hidden = !(navigator.canShare && navigator.canShare({ files: [new File([""], "a.png", { type: "image/png" })] })); } catch { share.hidden = true; }
    share.addEventListener("click", async () => {
      try {
        const blob = await renderPng();
        await navigator.share({ files: [new File([blob], fileName(), { type: "image/png" })], title: "Dog size comparison", url: location.href });
      } catch (err) { if (err.name !== "AbortError") toast("Sharing isn't available here"); }
    });
  }

  // ---------- wire up ----------
  function init() {
    // filters
    $("#lib-group").innerHTML = `<option value="">All groups</option>` + GROUPS.map((g) => `<option>${esc(g)}</option>`).join("");
    $("#lib-size").innerHTML = [`<button data-v="" aria-pressed="true">All sizes</button>`, ...SIZES.map((s) => `<button data-v="${s}" aria-pressed="false">${s}</button>`)].join("");
    $("#presets").innerHTML = PRESETS.map((p, i) => `<button data-i="${i}">${p.label}</button>`).join("") + `<button data-clear>Clear</button>`;

    $("#presets").addEventListener("click", (e) => {
      const btn = e.target.closest("button"); if (!btn) return;
      if (btn.hasAttribute("data-clear")) { state.entries = []; update(); return; }
      const p = PRESETS[+btn.dataset.i];
      state.entries = p.ids.filter((id) => BY_ID[id]).map((id) => ({ id, sex: state.defaultSex }));
      update();
    });

    $("#chips").addEventListener("click", (e) => {
      const li = e.target.closest(".chip"); if (!li) return;
      const id = li.dataset.id;
      if (e.target.closest(".x")) { removeBreed(id); return; }
      const sb = e.target.closest("[data-sex]");
      if (sb) { state.entries.find((x) => x.id === id).sex = sb.dataset.sex; update({ library: false }); }
    });

    $("#sex-all").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      state.defaultSex = b.dataset.v;
      state.entries.forEach((x) => (x.sex = b.dataset.v));
      update({ library: false });
    });
    $("#units").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      state.units = b.dataset.v; update();
    });
    $("#size-mode").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      state.sizeMode = b.dataset.v; update({ library: false });
    });
    $("#human-on").addEventListener("change", (e) => { state.human = e.target.checked; update({ library: false }); });
    $("#human-h").addEventListener("input", (e) => { state.humanH = +e.target.value; update({ library: false }); });
    $("#ranges-on").addEventListener("change", (e) => { state.ranges = e.target.checked; update({ library: false }); });

    $("#lib-search").addEventListener("input", (e) => { state.lib.q = e.target.value; renderLibrary(); });
    $("#lib-group").addEventListener("change", (e) => { state.lib.group = e.target.value; renderLibrary(); });
    $("#lib-sort").addEventListener("change", (e) => { state.lib.sort = e.target.value; renderLibrary(); });
    $("#lib-cabin").addEventListener("change", (e) => { state.lib.cabin = e.target.value; renderLibrary(); });
    $("#cabin-rule").textContent = `✈ Airplane friendly = dog + carrier within ${CABIN.limitKg} kg, the strictest common cabin limit (Lufthansa, KLM, Air France, Turkish Airlines). That leaves about ${CABIN_MAX_DOG} kg for the dog. “Some” means only lighter dogs of the breed fit. Rules vary by airline and route, so always check with yours.`;
    $("#lib-size").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      state.lib.size = b.dataset.v;
      $("#lib-size").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      renderLibrary();
    });
    $("#lib-list").addEventListener("click", (e) => {
      const b = e.target.closest(".lib-item"); if (b) toggleBreed(b.dataset.id);
    });

    $("#copy-link").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(location.href); toast("Link copied"); }
      catch { toast("Copy the address bar to share"); }
    });

    setupQuickSearch();
    setupMyDog();
    setupExport();

    if (!readHash()) {
      state.entries = ["chihuahua", "beagle", "labrador-retriever", "great-dane"].map((id) => ({ id, sex: "m" }));
    }

    let rt;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(renderStage, 80); });
    window.addEventListener("hashchange", () => { readHash(); update(); });

    update();
  }

  init();
})();
