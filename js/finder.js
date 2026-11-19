/* Breed finder (/breed-finder/): filters the server-rendered breed cards.
 * Filters live in the URL (?size=small,medium&energy=1&shed=1…) so results can be shared. */
(function () {
  var form = document.getElementById("finder");
  var grid = document.getElementById("finder-grid");
  if (!form || !grid) return;
  var cards = Array.prototype.slice.call(grid.children);
  var countEl = document.getElementById("finder-count");
  var emptyEl = document.getElementById("finder-empty");
  var cmpEl = document.getElementById("finder-compare");
  var CHECKS = ["shed", "groom", "kids", "novice", "apt", "cabin"];
  var chipGroups = form.querySelectorAll(".chips");
  // German page (/de/rassefinder/) loads js/i18n-de.js first
  var DE = !!window.I18N;

  function chipValues(name) {
    return Array.prototype.slice.call(form.querySelectorAll('.chips[data-f="' + name + '"] [aria-pressed="true"]')).map(function (b) { return b.dataset.v; });
  }

  // A checked box keeps breeds rated at the "good" end (shedding/grooming low, the rest high).
  function passes(d, st) {
    if (st.size.length && st.size.indexOf(d.size) < 0) return false;
    if (st.energy.length && st.energy.indexOf(d.energy) < 0) return false;
    if (st.shed && d.shed !== "1") return false;
    if (st.groom && d.groom !== "1") return false;
    if (st.kids && d.kids !== "3") return false;
    if (st.novice && d.novice !== "3") return false;
    if (st.apt && d.apt !== "3") return false;
    if (st.cabin && d.cabin === "no") return false;
    if (st.group && d.group !== st.group) return false;
    return true;
  }

  function state() {
    var st = { size: chipValues("size"), energy: chipValues("energy"), group: form.group.value, sort: form.sort.value };
    CHECKS.forEach(function (k) { st[k] = form[k].checked; });
    return st;
  }

  function sortCards(list, how) {
    var key = how.charAt(0), dir = how.slice(2) === "asc" ? 1 : -1;
    return list.sort(function (a, b) {
      if (how === "name") return a.querySelector(".bcard-name").textContent.localeCompare(b.querySelector(".bcard-name").textContent, DE ? "de" : "en");
      return (parseFloat(a.dataset[key]) - parseFloat(b.dataset[key])) * dir;
    });
  }

  function writeUrl(st) {
    var q = new URLSearchParams();
    if (st.size.length) q.set("size", st.size.join(","));
    if (st.energy.length) q.set("energy", st.energy.join(","));
    CHECKS.forEach(function (k) { if (st[k]) q.set(k, "1"); });
    if (st.group) q.set("group", st.group);
    if (st.sort !== "name") q.set("sort", st.sort);
    var s = q.toString();
    history.replaceState(null, "", location.pathname + (s ? "?" + s : ""));
  }

  function apply() {
    var st = state();
    var shown = sortCards(cards.filter(function (c) { return passes(c.dataset, st); }), st.sort);
    cards.forEach(function (c) { c.hidden = true; });
    shown.forEach(function (c) { c.hidden = false; grid.appendChild(c); });
    countEl.innerHTML = "<strong>" + shown.length + "</strong> " + (DE
      ? (shown.length === 1 ? "Rasse passt" : shown.length === cards.length ? "Rassen" : "Rassen passen")
      : (shown.length === 1 ? "breed matches" : shown.length === cards.length ? "breeds" : "breeds match"));
    emptyEl.hidden = shown.length > 0;
    cmpEl.hidden = shown.length === 0;
    cmpEl.href = (DE ? "/de/#b=" : "/#b=") + shown.slice(0, 10).map(function (c) { return c.dataset.id + ":m"; }).join(",");
    cmpEl.textContent = DE
      ? (shown.length > 10 ? "Die ersten 10 im Tool vergleichen →" : shown.length === 1 ? "Im Tool ansehen →" : "Diese " + shown.length + " im Tool vergleichen →")
      : (shown.length > 10 ? "Compare the first 10 in the tool →" : "Compare " + (shown.length === 1 ? "it" : "these " + shown.length) + " in the tool →");
    writeUrl(st);
  }

  function readUrl() {
    var q = new URLSearchParams(location.search);
    ["size", "energy"].forEach(function (name) {
      var vals = (q.get(name) || "").split(",");
      form.querySelectorAll('.chips[data-f="' + name + '"] button').forEach(function (b) { b.setAttribute("aria-pressed", vals.indexOf(b.dataset.v) >= 0 ? "true" : "false"); });
    });
    CHECKS.forEach(function (k) { form[k].checked = q.get(k) === "1"; });
    form.group.value = form.group.querySelector('option[value="' + (q.get("group") || "") + '"]') ? q.get("group") || "" : "";
    form.sort.value = form.sort.querySelector('option[value="' + (q.get("sort") || "name") + '"]') ? q.get("sort") || "name" : "name";
  }

  chipGroups.forEach(function (g) {
    g.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") === "true" ? "false" : "true");
      apply();
    });
  });
  form.addEventListener("change", apply);
  document.getElementById("finder-reset").addEventListener("click", function () {
    history.replaceState(null, "", location.pathname);
    readUrl();
    apply();
  });

  readUrl();
  apply();
})();
