/*
 * Parametric dog silhouette renderer.
 *
 * Every dog is drawn in "withers units": the height at the withers (top of the
 * shoulder) is exactly 1.0, the ground is y = 0, y points UP and the dog faces
 * right (+x). The caller scales the group by the real withers height, so the
 * silhouettes are always to scale.
 */
(function () {
  const BASE = {
    bodyL: 1.15, legLen: 0.52, tuck: 0.3, slope: 0, legW: 0.09,
    neckL: 0.32, neckA: 55, neckW: 0.2, headR: 0.17, muzzleL: 0.2, muzzleH: 0.12,
    ear: "drop", earS: 1, tail: "down", tailL: 0.5, tailW: 0.06, fluff: 0,
  };

  const TYPES = {
    toy:        { bodyL: 1.1, legLen: 0.55, tuck: 0.35, legW: 0.07, neckL: 0.25, neckA: 62, neckW: 0.18, headR: 0.25, muzzleL: 0.08, muzzleH: 0.1, ear: "prick", earS: 1.15, tail: "sickle", tailL: 0.55, tailW: 0.05 },
    terrier:    { bodyL: 1.05, legLen: 0.52, tuck: 0.3, legW: 0.09, neckL: 0.3, neckA: 60, neckW: 0.19, headR: 0.17, muzzleL: 0.22, muzzleH: 0.12, ear: "semi", tail: "up", tailL: 0.38, tailW: 0.07 },
    lowterrier: { bodyL: 1.35, legLen: 0.38, tuck: 0.1, legW: 0.11, neckL: 0.27, neckA: 55, neckW: 0.22, headR: 0.2, muzzleL: 0.22, muzzleH: 0.14, ear: "semi", tail: "up", tailL: 0.4, tailW: 0.08, fluff: 0.07 },
    spitz:      { bodyL: 1.05, legLen: 0.5, tuck: 0.2, legW: 0.1, neckL: 0.25, neckA: 60, neckW: 0.24, headR: 0.19, muzzleL: 0.17, muzzleH: 0.12, ear: "prick", earS: 0.9, tail: "curl", tailL: 0.6, tailW: 0.1, fluff: 0.1 },
    nordic:     { bodyL: 1.18, legLen: 0.52, tuck: 0.25, legW: 0.09, neckL: 0.3, neckA: 50, neckW: 0.22, headR: 0.17, muzzleL: 0.22, muzzleH: 0.12, ear: "prick", tail: "sickle", tailL: 0.65, tailW: 0.09, fluff: 0.04 },
    retriever:  { bodyL: 1.18, legLen: 0.5, tuck: 0.2, legW: 0.1, neckL: 0.32, neckA: 52, neckW: 0.22, headR: 0.17, muzzleL: 0.22, muzzleH: 0.14, ear: "drop", tail: "otter", tailL: 0.6, tailW: 0.09, fluff: 0.04 },
    shepherd:   { bodyL: 1.3, legLen: 0.5, tuck: 0.25, slope: 0.08, legW: 0.09, neckL: 0.38, neckA: 45, neckW: 0.22, headR: 0.16, muzzleL: 0.26, muzzleH: 0.12, ear: "prick", earS: 1.2, tail: "down", tailL: 0.65, tailW: 0.1, fluff: 0.04 },
    collie:     { bodyL: 1.18, legLen: 0.5, tuck: 0.25, slope: 0.03, legW: 0.085, neckL: 0.33, neckA: 52, neckW: 0.22, headR: 0.15, muzzleL: 0.24, muzzleH: 0.11, ear: "semi", tail: "down", tailL: 0.65, tailW: 0.1, fluff: 0.07 },
    sighthound: { bodyL: 1.08, legLen: 0.6, tuck: 0.65, slope: 0.03, legW: 0.06, neckL: 0.45, neckA: 48, neckW: 0.14, headR: 0.12, muzzleL: 0.3, muzzleH: 0.09, ear: "rose", tail: "low", tailL: 0.75, tailW: 0.04 },
    afghan:     { bodyL: 1.05, legLen: 0.6, tuck: 0.55, slope: 0.03, legW: 0.07, neckL: 0.45, neckA: 52, neckW: 0.15, headR: 0.12, muzzleL: 0.28, muzzleH: 0.09, ear: "long", tail: "sickle", tailL: 0.6, tailW: 0.05, fluff: 0.14 },
    mastiff:    { bodyL: 1.2, legLen: 0.45, tuck: 0.15, legW: 0.14, neckL: 0.22, neckA: 45, neckW: 0.32, headR: 0.23, muzzleL: 0.1, muzzleH: 0.2, ear: "drop", earS: 0.8, tail: "down", tailL: 0.55, tailW: 0.1 },
    molosser:   { bodyL: 1.15, legLen: 0.48, tuck: 0.2, legW: 0.12, neckL: 0.27, neckA: 48, neckW: 0.28, headR: 0.2, muzzleL: 0.15, muzzleH: 0.17, ear: "drop", earS: 0.8, tail: "down", tailL: 0.55, tailW: 0.08 },
    mountain:   { bodyL: 1.2, legLen: 0.48, tuck: 0.1, legW: 0.13, neckL: 0.26, neckA: 48, neckW: 0.3, headR: 0.2, muzzleL: 0.15, muzzleH: 0.16, ear: "drop", tail: "down", tailL: 0.6, tailW: 0.12, fluff: 0.08 },
    giant:      { bodyL: 1.05, legLen: 0.56, tuck: 0.45, legW: 0.09, neckL: 0.42, neckA: 55, neckW: 0.2, headR: 0.15, muzzleL: 0.22, muzzleH: 0.15, ear: "drop", earS: 0.8, tail: "low", tailL: 0.65, tailW: 0.06 },
    bulldog:    { bodyL: 1.25, legLen: 0.38, tuck: 0.3, slope: -0.04, legW: 0.17, neckL: 0.14, neckA: 35, neckW: 0.35, headR: 0.3, muzzleL: 0.02, muzzleH: 0.2, ear: "rose", tail: "short", tailL: 0.2, tailW: 0.1 },
    brachy:     { bodyL: 1.0, legLen: 0.5, tuck: 0.3, legW: 0.1, neckL: 0.18, neckA: 50, neckW: 0.28, headR: 0.25, muzzleL: 0.04, muzzleH: 0.15, ear: "rose", tail: "curl", tailL: 0.3, tailW: 0.1 },
    longlow:    { bodyL: 2.1, legLen: 0.3, tuck: 0.15, legW: 0.11, neckL: 0.36, neckA: 40, neckW: 0.24, headR: 0.21, muzzleL: 0.3, muzzleH: 0.14, ear: "drop", tail: "otter", tailL: 0.7, tailW: 0.07 },
    basset:     { bodyL: 1.9, legLen: 0.3, tuck: 0.1, legW: 0.15, neckL: 0.3, neckA: 40, neckW: 0.28, headR: 0.2, muzzleL: 0.3, muzzleH: 0.2, ear: "long", earS: 1.3, tail: "up", tailL: 0.65, tailW: 0.08 },
    spaniel:    { bodyL: 1.18, legLen: 0.48, tuck: 0.2, legW: 0.1, neckL: 0.3, neckA: 55, neckW: 0.22, headR: 0.18, muzzleL: 0.2, muzzleH: 0.14, ear: "long", tail: "straight", tailL: 0.45, tailW: 0.07, fluff: 0.05 },
    setter:     { bodyL: 1.15, legLen: 0.55, tuck: 0.4, legW: 0.08, neckL: 0.4, neckA: 52, neckW: 0.18, headR: 0.14, muzzleL: 0.28, muzzleH: 0.12, ear: "long", earS: 0.9, tail: "straight", tailL: 0.6, tailW: 0.06, fluff: 0.05 },
    scenthound: { bodyL: 1.15, legLen: 0.52, tuck: 0.3, legW: 0.1, neckL: 0.3, neckA: 50, neckW: 0.2, headR: 0.17, muzzleL: 0.24, muzzleH: 0.14, ear: "long", earS: 0.8, tail: "up", tailL: 0.55, tailW: 0.07 },
    coonhound:  { bodyL: 1.2, legLen: 0.54, tuck: 0.3, legW: 0.1, neckL: 0.33, neckA: 48, neckW: 0.22, headR: 0.17, muzzleL: 0.3, muzzleH: 0.15, ear: "long", earS: 1.2, tail: "up", tailL: 0.6, tailW: 0.07 },
    pointer:    { bodyL: 1.12, legLen: 0.56, tuck: 0.45, legW: 0.08, neckL: 0.38, neckA: 50, neckW: 0.18, headR: 0.14, muzzleL: 0.3, muzzleH: 0.13, ear: "drop", tail: "straight", tailL: 0.5, tailW: 0.06 },
    athletic:   { bodyL: 1.0, legLen: 0.55, tuck: 0.45, legW: 0.085, neckL: 0.42, neckA: 58, neckW: 0.18, headR: 0.14, muzzleL: 0.3, muzzleH: 0.12, ear: "prick", earS: 1.2, tail: "short", tailL: 0.3, tailW: 0.07 },
    boxer:      { bodyL: 1.0, legLen: 0.55, tuck: 0.45, legW: 0.1, neckL: 0.32, neckA: 58, neckW: 0.22, headR: 0.19, muzzleL: 0.08, muzzleH: 0.17, ear: "drop", earS: 0.7, tail: "short", tailL: 0.3, tailW: 0.08 },
    bully:      { bodyL: 1.08, legLen: 0.5, tuck: 0.35, legW: 0.12, neckL: 0.26, neckA: 50, neckW: 0.26, headR: 0.21, muzzleL: 0.14, muzzleH: 0.17, ear: "rose", tail: "low", tailL: 0.5, tailW: 0.07 },
    schnauzer:  { bodyL: 1.0, legLen: 0.52, tuck: 0.3, legW: 0.1, neckL: 0.33, neckA: 58, neckW: 0.2, headR: 0.16, muzzleL: 0.28, muzzleH: 0.15, ear: "semi", tail: "up", tailL: 0.45, tailW: 0.07, fluff: 0.04 },
    poodle:     { bodyL: 1.0, legLen: 0.55, tuck: 0.3, legW: 0.1, neckL: 0.38, neckA: 60, neckW: 0.2, headR: 0.16, muzzleL: 0.26, muzzleH: 0.11, ear: "long", tail: "up", tailL: 0.45, tailW: 0.08, fluff: 0.1 },
    corgi:      { bodyL: 1.7, legLen: 0.32, tuck: 0.1, legW: 0.12, neckL: 0.3, neckA: 50, neckW: 0.26, headR: 0.22, muzzleL: 0.22, muzzleH: 0.13, ear: "prick", earS: 1.4, tail: "none", tailL: 0.5, tailW: 0.1, fluff: 0.04 },
    primitive:  { bodyL: 1.0, legLen: 0.55, tuck: 0.4, legW: 0.08, neckL: 0.36, neckA: 55, neckW: 0.17, headR: 0.14, muzzleL: 0.24, muzzleH: 0.11, ear: "prick", earS: 1.3, tail: "curl", tailL: 0.45, tailW: 0.06 },
    shaggy:     { bodyL: 1.08, legLen: 0.45, tuck: 0.05, legW: 0.14, neckL: 0.25, neckA: 50, neckW: 0.3, headR: 0.22, muzzleL: 0.14, muzzleH: 0.16, ear: "drop", tail: "short", tailL: 0.35, tailW: 0.12, fluff: 0.14 },
    longcoat:   { bodyL: 1.25, legLen: 0.38, tuck: 0.05, legW: 0.12, neckL: 0.25, neckA: 60, neckW: 0.24, headR: 0.24, muzzleL: 0.1, muzzleH: 0.12, ear: "long", earS: 0.75, tail: "curl", tailL: 0.45, tailW: 0.1, fluff: 0.12 },
  };

  const f = (n) => +n.toFixed(4);
  const pt = (p) => `${f(p[0])} ${f(p[1])}`;

  function params(type, overrides) {
    return Object.assign({}, BASE, TYPES[type] || {}, overrides || {});
  }

  /**
   * Build a dog silhouette.
   * @returns {{ markup: string, minX: number, maxX: number, maxY: number, withersX: number }}
   *   markup uses currentColor for the body and a darker shade (via opacity layers) for far-side parts.
   */
  function build(type, overrides) {
    const P = params(type, overrides);
    const L = P.bodyL;
    const chestY = P.legLen;
    const depth = 1 - chestY;
    const fl = P.fluff;
    const ext = []; // [x, y, r] extent samples for the bounding box
    const near = [];
    const far = [];

    // ----- torso -----
    const top = 1 - P.slope;
    const R = [0, top - depth * 0.62];
    const T = [0.1 * L, top];
    const W = [0.78 * L, 1];
    const F = [L, chestY + 0.5 * depth];
    const B = [0.7 * L, chestY];
    const Wa = [0.32 * L, chestY + depth * P.tuck * 0.85];
    const torso =
      `M${pt(R)}` +
      `C${pt([-0.03, R[1] + 0.3 * depth])} ${pt([0.0, T[1]])} ${pt(T)}` +
      `C${pt([0.35 * L, T[1] + 0.015])} ${pt([0.55 * L, 1])} ${pt(W)}` +
      `C${pt([0.92 * L, 1])} ${pt([L + 0.04, F[1] + 0.3 * depth])} ${pt(F)}` +
      `C${pt([L, F[1] - 0.35 * depth])} ${pt([0.9 * L, chestY])} ${pt(B)}` +
      `C${pt([0.55 * L, chestY])} ${pt([0.45 * L, Wa[1]])} ${pt(Wa)}` +
      `C${pt([0.18 * L, Wa[1]])} ${pt([0.03, R[1] - 0.25 * depth])} ${pt(R)}Z`;
    near.push(`<path d="${torso}" stroke-width="${f(fl * 2 + 0.002)}"/>`);
    ext.push([-0.03, top - depth * 0.3, fl], [L + 0.04, F[1], fl], [W[0], 1, fl]);

    // ----- legs (upper arm / thigh masses + tapered lower legs) -----
    const lw = P.legW + fl * 0.5;
    const foot = lw / 2;
    const frontLeg = (dx) => {
      const sh = [0.8 * L + dx, chestY + 0.45 * depth];
      const elbow = [0.79 * L + dx, chestY - 0.02];
      const pastern = [0.8 * L + dx + 0.01, chestY * 0.16 + foot];
      const toe = [0.8 * L + dx + 0.05, foot];
      return (
        `<path d="M${pt(sh)}L${pt(elbow)}" fill="none" stroke-width="${f(lw * 1.7)}"/>` +
        `<path d="M${pt(elbow)}L${pt(pastern)}" fill="none" stroke-width="${f(lw * 1.05)}"/>` +
        `<path d="M${pt(pastern)}L${pt(toe)}" fill="none" stroke-width="${f(lw * 0.95)}"/>`
      );
    };
    const rearLeg = (dx) => {
      const hip = [0.17 * L + dx, top - depth * 0.35];
      const stifle = [0.25 * L + dx, chestY * 0.66];
      const hock = [0.06 * L + dx - 0.03, chestY * 0.27];
      const ft = [0.09 * L + dx - 0.01, foot];
      const toe = [ft[0] + 0.05, foot];
      const thigh = [0.17 * L + dx, top - depth * 0.62];
      const tr = Math.min(0.19 * L, 0.22) + fl * 0.4;
      return (
        `<ellipse cx="${f(thigh[0])}" cy="${f(thigh[1])}" rx="${f(tr)}" ry="${f(depth * 0.5 + fl * 0.4)}" transform="rotate(-18 ${f(thigh[0])} ${f(thigh[1])})"/>` +
        `<path d="M${pt(hip)}L${pt(stifle)}" fill="none" stroke-width="${f(lw * 2)}"/>` +
        `<path d="M${pt(stifle)}L${pt(hock)}" fill="none" stroke-width="${f(lw * 1.25)}"/>` +
        `<path d="M${pt(hock)}L${pt(ft)}L${pt(toe)}" fill="none" stroke-width="${f(lw * 0.95)}"/>`
      );
    };
    far.push(frontLeg(-0.07), rearLeg(0.07));
    near.push(frontLeg(0), rearLeg(0));
    ext.push([0.04 * L - 0.04, chestY * 0.28, lw], [0.8 * L + 0.04, 0, lw]);

    // ----- neck -----
    const a = (P.neckA * Math.PI) / 180;
    const base = [0.86 * L, 1 - depth * 0.18];
    const N = [base[0] + Math.cos(a) * P.neckL, base[1] + Math.sin(a) * P.neckL];
    const nx = -Math.sin(a), ny = Math.cos(a); // normal (points back/up)
    const hw = P.neckW / 2;
    const neck =
      `M${pt([0.62 * L, 1])}` +
      `L${pt([N[0] + nx * hw, N[1] + ny * hw])}` +
      `L${pt([N[0] - nx * hw, N[1] - ny * hw])}` +
      `L${pt([L + 0.01, F[1] + 0.05 * depth])}Z`;
    near.push(`<path d="${neck}" stroke-width="${f(fl * 2 + 0.002)}"/>`);

    // ----- head -----
    const r = P.headR;
    const S = [N[0] + 0.02, N[1] + 0.01];
    const tip = [S[0] + r * 0.55 + P.muzzleL, S[1] - r * 0.38];
    near.push(`<circle cx="${f(S[0])}" cy="${f(S[1])}" r="${f(r + fl * 0.6)}"/>`);
    // tapered snout: deep at the skull, narrowing to the nose
    const mh = P.muzzleH;
    const snout =
      `M${pt([S[0] + r * 0.15, S[1] + r * 0.35])}` +
      `L${pt([tip[0], tip[1] + mh * 0.42])}` +
      `L${pt([tip[0], tip[1] - mh * 0.45])}` +
      `L${pt([tip[0] - Math.min(P.muzzleL * 0.5, r * 0.6), tip[1] - mh * 0.62])}` +
      `L${pt([S[0], S[1] - r * 0.92])}Z`;
    near.push(`<path d="${snout}" stroke-width="${f(Math.min(mh * 0.5, 0.06) + fl * 0.5)}"/>`);
    ext.push([S[0], S[1], r + fl * 0.6], [tip[0], tip[1], P.muzzleH / 2]);

    // ----- ears (drawn in a darker shade so they read against the head) -----
    const s = P.earS;
    const E = (dx, dy) => [S[0] + dx * r, S[1] + dy * r];
    let ear = "";
    switch (P.ear) {
      case "prick": {
        const apex = E(-0.3, 0.55 + 1.15 * s);
        ear = `<path d="M${pt(E(-0.75, 0.45))}L${pt(apex)}L${pt(E(0.1, 0.8))}Z"/>`;
        ext.push([apex[0], apex[1], 0.01]);
        break;
      }
      case "bat": {
        const apex = E(-0.35, 0.6 + 1.3 * s);
        ear = `<path d="M${pt(E(-0.85, 0.4))}Q${pt(E(-1.0, 0.6 + 1.3 * s))} ${pt(apex)}Q${pt(E(0.2, 0.6 + 1.2 * s))} ${pt(E(0.2, 0.75))}Z"/>`;
        ext.push([apex[0], apex[1] + 0.05 * r, 0.01], [E(-1.0, 0)[0], apex[1], 0.01]);
        break;
      }
      case "semi": {
        const apex = E(-0.2, 0.55 + 0.75 * s);
        ear = `<path d="M${pt(E(-0.75, 0.45))}L${pt(apex)}L${pt(E(0.25, 0.4 + 0.5 * s))}L${pt(E(0.05, 0.75))}Z"/>`;
        ext.push([apex[0], apex[1], 0.01]);
        break;
      }
      case "rose": {
        ear = `<path d="M${pt(E(-0.7, 0.45))}L${pt(E(-0.05, 0.85))}L${pt(E(-0.95, 0.75 + 0.2 * s))}Z"/>`;
        ext.push([E(-0.95, 0)[0], E(0, 0.95 + 0.2 * s)[1], 0.01]);
        break;
      }
      case "long": {
        const c = E(-0.4, -0.55 * s);
        ear = `<ellipse cx="${f(c[0])}" cy="${f(c[1])}" rx="${f(0.36 * r)}" ry="${f(1.05 * r * s)}" transform="rotate(12 ${f(c[0])} ${f(c[1])})" stroke-width="${f(fl * 0.7 + 0.002)}"/>`;
        ext.push([c[0], c[1] - r * s, 0.4 * r + fl]);
        break;
      }
      default: { // drop
        const c = E(-0.45, -0.1);
        ear = `<ellipse cx="${f(c[0])}" cy="${f(c[1])}" rx="${f(0.33 * r * s)}" ry="${f(0.7 * r * s)}" transform="rotate(18 ${f(c[0])} ${f(c[1])})" stroke-width="${f(fl * 0.5 + 0.002)}"/>`;
      }
    }

    // ----- tail -----
    const tl = P.tailL;
    const tw = P.tailW + fl * 1.3;
    const T0 = [0.03, top - 0.06];
    const tx = (dx, dy) => [T0[0] + dx * tl, T0[1] + dy * tl];
    let tailD = "";
    switch (P.tail) {
      case "up": tailD = `M${pt(T0)}Q${pt(tx(-0.4, 0.45))} ${pt(tx(-0.3, 0.95))}`; break;
      case "sickle": tailD = `M${pt(T0)}C${pt(tx(-0.55, 0.15))} ${pt(tx(-0.6, 0.7))} ${pt(tx(-0.2, 0.85))}`; break;
      case "plume": tailD = `M${pt(T0)}C${pt(tx(-0.5, 0.3))} ${pt(tx(-0.3, 0.85))} ${pt(tx(0.1, 0.8))}`; break;
      case "curl": tailD = `M${pt(T0)}C${pt(tx(-0.35, 0.55))} ${pt(tx(0.15, 0.8))} ${pt(tx(0.35, 0.35))}`; break;
      case "down": tailD = `M${pt(T0)}C${pt(tx(-0.3, -0.25))} ${pt(tx(-0.25, -0.75))} ${pt(tx(-0.35, -0.95))}`; break;
      case "otter": tailD = `M${pt(T0)}C${pt(tx(-0.4, -0.05))} ${pt(tx(-0.65, -0.35))} ${pt(tx(-0.8, -0.55))}`; break;
      case "low": tailD = `M${pt(T0)}C${pt(tx(-0.15, -0.5))} ${pt(tx(-0.2, -0.95))} ${pt(tx(-0.5, -0.85))}`; break;
      case "straight": tailD = `M${pt(T0)}L${pt(tx(-1, 0.08))}`; break;
      case "short": tailD = `M${pt(T0)}L${pt(tx(-0.3, 0.2))}`; break;
      default: tailD = "";
    }
    if (tailD) {
      near.push(`<path d="${tailD}" fill="none" stroke-width="${f(tw)}"/>`);
      const pts = tailD.match(/-?\d+(\.\d+)?/g).map(Number);
      for (let i = 0; i < pts.length; i += 2) ext.push([pts[i], pts[i + 1], tw / 2]);
    }

    // ----- eye -----
    const eye = [S[0] + r * 0.42, S[1] + r * 0.12];

    let minX = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y, rr] of ext) {
      minX = Math.min(minX, x - rr);
      maxX = Math.max(maxX, x + rr);
      maxY = Math.max(maxY, y + rr);
    }
    maxY = Math.max(maxY, 1);

    const markup =
      `<g class="far" fill="currentColor" stroke="currentColor" stroke-width="0.004" stroke-linecap="round" stroke-linejoin="round">${far.join("")}</g>` +
      `<g class="near" fill="currentColor" stroke="currentColor" stroke-width="0.004" stroke-linecap="round" stroke-linejoin="round">${near.join("")}</g>` +
      `<g class="ear" fill="currentColor" stroke="currentColor" stroke-width="0.004" stroke-linecap="round" stroke-linejoin="round">${ear}</g>` +
      `<circle class="eye" cx="${f(eye[0])}" cy="${f(eye[1])}" r="${f(Math.max(0.018, r * 0.11))}"/>`;

    return { markup, minX, maxX, maxY, withersX: W[0] };
  }

  /** Simple standing human figure, unit height = 1, facing the viewer. */
  function human() {
    const parts = [
      `<circle cx="0" cy="0.925" r="0.068"/>`,
      `<path d="M0 0.86L0 0.82" fill="none" stroke-width="0.05"/>`,
      `<path d="M-0.105 0.79Q0 0.83 0.105 0.79L0.085 0.5L-0.085 0.5Z" stroke-width="0.04"/>`,
      `<path d="M-0.045 0.5L-0.052 0.03" fill="none" stroke-width="0.075"/>`,
      `<path d="M0.045 0.5L0.052 0.03" fill="none" stroke-width="0.075"/>`,
      `<path d="M-0.12 0.78L-0.15 0.6L-0.145 0.43" fill="none" stroke-width="0.048"/>`,
      `<path d="M0.12 0.78L0.15 0.6L0.145 0.43" fill="none" stroke-width="0.048"/>`,
    ];
    return {
      markup: `<g fill="currentColor" stroke="currentColor" stroke-width="0.004" stroke-linecap="round" stroke-linejoin="round">${parts.join("")}</g>`,
      minX: -0.18, maxX: 0.18, maxY: 1,
    };
  }

  window.DogRenderer = { build, human, TYPES };
})();
