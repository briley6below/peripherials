/* Peripheral Guide - shared script. All facts come from window.DATA (built from data/items.json). */
(function () {
  "use strict";
  var D = window.DATA, byId = {};
  D.items.forEach(function (it) { byId[it.id] = it; });
  var ORDER = D.tierOrder;
  var used = {};
  function gloss(text) {
    // Link the first use of each glossary word. Only plain text is searched: never inside a tag,
    // an attribute or a link added earlier, so a link can never land inside another link.
    var h = esc(text);
    (D.glossary || []).forEach(function (g) {
      if (used[g.id]) return;
      for (var n = 0; n < g.words.length; n++) {
        var w = g.words[n].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        var cs = (g.words[n] === g.words[n].toUpperCase() && /[A-Z]/.test(g.words[n])) || g.words[n] === "Hz";
        var re = new RegExp("(^|[^A-Za-z0-9-])(" + w + ")(?![A-Za-z0-9])", cs ? "" : "i");
        var parts = h.split(/(<a\b[^>]*>[\s\S]*?<\/a>|<[^>]+>)/), hit = false;
        for (var j = 0; j < parts.length && !hit; j += 2) {
          if (re.test(parts[j])) { parts[j] = parts[j].replace(re, '$1<a class="gl" href="glossary.html#' + g.id + '" title="' + esc(g.plain) + '">$2</a>'); hit = true; }
        }
        if (hit) { h = parts.join(""); used[g.id] = 1; break; }
      }
    });
    return h;
  }
  // One way to print a spec value everywhere: the maker's own wording ("under 49") wins over the bare number.
  function specVal(f) { return f.shown ? esc(f.shown) : (typeof f.value === "string" ? gloss(f.value) : val(f.value)); }
  function specChips(f, noBasis) {
    // Fact = a maker page or a lab measurement. Anything else is only reported by an outlet or a store.
    return (f.status === "unverified" ? " " + chip("unverified") : "") +
      (f.status === "reported" ? ' <span class="chip reported" title="Not from a maker page or a lab test">Reported<span class="cn">: ' + esc((f.reported_by || []).join(", ")) + "</span></span>" : "") +
      (f.basis && !noBasis ? ' <span class="chip claim">' + esc(f.basis) + "</span>" : "") +
      (f.conflict ? ' <span class="chip unverified" title="' + esc(f.note || "") + '">Sources disagree</span>' : "");
  }
  // Compare: keep product names in view while scrolling down a long table, and show when more columns sit off to the right.
  function stickyNames(box) {
    var cmp = box.querySelector(".cmp"), wrap = box.querySelector(".cmp-wrap"), bar = box.querySelector(".cmp-names");
    if (!cmp || !bar) return;
    var heads = [].slice.call(cmp.querySelectorAll(".hd:not(.empty)")), spans = [].slice.call(bar.children);
    function place() {
      var top = (document.querySelector(".top") || { offsetHeight: 0 }).offsetHeight, cr = cmp.getBoundingClientRect(), hr = heads[0].getBoundingClientRect();
      var show = hr.bottom < top && cr.bottom > top + 60;
      bar.classList.toggle("on", show);
      bar.style.top = top + "px"; bar.style.left = cr.left + "px"; bar.style.width = cmp.clientWidth + "px";
      heads.forEach(function (hd, n) { var r = hd.getBoundingClientRect(); spans[n].style.left = (r.left - cr.left) + "px"; spans[n].style.width = r.width + "px"; });
      wrap.classList.toggle("more-right", cmp.scrollLeft + cmp.clientWidth < cmp.scrollWidth - 4);
      wrap.classList.toggle("more-left", cmp.scrollLeft > 4);
    }
    window.addEventListener("scroll", place, { passive: true }); window.addEventListener("resize", place); cmp.addEventListener("scroll", place, { passive: true });
    place();
  }
  function rankCmp(a, b) { return ORDER.indexOf(a._tier) - ORDER.indexOf(b._tier) || (b._score || -1) - (a._score || -1); }

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  function chip(status) {
    var s = status || "", cls = s.indexOf("agreed") === 0 ? "agreed" : s.indexOf("opinion") === 0 ? "opinion" : s.indexOf("reported") === 0 ? "reported" : s === "unverified" ? "unverified" : "fact";
    var head = { agreed: "Agreed", opinion: "Opinion", reported: "Reported", fact: "Fact", unverified: "Unverified" }[cls];
    var who = cls === "agreed" || cls === "reported" ? s.slice(s.indexOf("(") + 1, -1) : cls === "opinion" ? s.slice(s.indexOf(":") + 1).trim() : "";
    return '<span class="chip ' + cls + '">' + head + (who ? '<span class="cn">: ' + esc(who) + "</span>" : "") + "</span>";
  }
  function nbName(t) { return t.replace(/-/g, "\u2011"); }
  function softBreak(t) { return t.replace(/([a-z])([A-Z])/g, "$1\u00AD$2").replace(/(SUPER|LIGHT|POWER)(?=[A-Z]{4})/g, "$1\u00AD"); }
  function tcls(t) { return ["S", "A", "B", "C"].indexOf(t) > -1 ? t : t === D.avoidName ? "X" : D.srcNames.indexOf(t) > -1 ? "SRC" : "NA"; }
  // The badge already shows the group, so the line only gives the score and how many specs it uses.
  function tierText(it) { return it._score100 != null && it._method === "spec" ? "Spec score " + it._score100 + "/100 (" + it._parts.length + " specs)" : it._tier_label; }
  function tierBadge(it, big) { return '<span class="tier' + (big ? " big" : "") + " t-" + tcls(it._tier) + '" role="img" aria-label="' + esc(tierText(it)) + '" title="' + esc(tierText(it)) + '">' + esc(D.badge[it._tier] || it._tier) + "</span>"; }
  function srcMap(it) { var m = {}; it.sources.forEach(function (s) { m[s.id] = s; }); return m; }
  // text: the claim line, so the source's own supporting words (from data/evidence.json) can be shown under the link
  function srcLine(it, ids, prefix, text) {
    var m = srcMap(it);
    return '<div class="srcline">' + esc(prefix || "Source") + ': ' + ids.map(function (id) {
      var s = m[id]; if (!s) return esc(id);
      var q = text && D.ev ? D.ev[it.id + "|" + text + "|" + id] : null;
      return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.label) + "</a> (checked " + esc(s.date_checked) +
        ', <a href="raw/' + esc(s.raw_file.split("/").pop()) + '">raw copy</a>)' +
        (q ? '<span class="evq">Their words: ' + q.map(function (x) { return "\u201c" + esc(x) + "\u201d"; }).join(" … ") + "</span>" : "");
    }).join("; ") + "</div>";
  }
  function label(k) {
    var units = { g: " (g)", mm: " (mm)", hz: " (Hz)", hours: " (hours)" };
    var parts = k.split("_"), last = parts[parts.length - 1], u = "";
    if (units[last]) { u = units[last]; parts.pop(); }
    var t = parts.join(" ").replace(/\bdpi\b/i, "DPI").replace(/\busb\b/i, "USB");
    if (k === "weight_measured_g") t = "weight measured by RTINGS (used for the ladder)";
    if (k === "weight_g") t = "weight, maker's figure";
    return t.charAt(0).toUpperCase() + t.slice(1) + u;
  }
  function val(v) {
    if (v === true) return "Yes"; if (v === false) return "No";
    if (Array.isArray(v)) return v.map(function (id) { return byId[id] ? '<a href="#" data-open="' + esc(id) + '">' + nbName(esc(byId[id].name)) + "</a>" : esc(id); }).join(", ");
    return esc(v);
  }
  function priceHTML(it) {
    if (!it.price) return '<span class="dash">No US price found yet</span>';
    return esc(it._price_text) + (it.price.size ? " (" + esc(it.price.size) + " size)" : "") + (it.price.status === "unverified" ? " " + chip("unverified") : "");
  }
  function sec(title, inner, withSrc) {
    return '<section class="dsec srcsec"><div class="dsec-h"><h3>' + esc(title) + "</h3>" +
      (withSrc ? '<button class="srcbtn" type="button" aria-expanded="false">+ Source</button>' : "") + "</div>" + inner + "</section>";
  }
  function pcList(it, arr, none) {
    if (!arr.length) return '<p class="dash">' + esc(none) + "</p>";
    return '<ul class="pc">' + arr.map(function (p) { return "<li>" + gloss(p.text) + " " + chip(p.status) + srcLine(it, p.sources, null, p.text) + "</li>"; }).join("") + "</ul>";
  }

  /* ---------- detail dialog ---------- */
  var dlg = $("#detail");
  function openItem(id) {
    var it = byId[id]; if (!it || !dlg) return;
    var ph = D.photos[it.id];
    var credit = ph ? '<p class="credit">Photo: ' + esc(ph.owner) + ' (<a href="' + esc(ph.page_url) + '" target="_blank" rel="noopener">product page</a>, copied ' + esc(ph.date_checked) + ')' + (ph.note ? ". " + esc(ph.note) : "") + "</p>" : "";
    used = {};
    var h = '';
    h += '<div class="dhead"><div>' + D.pics[it.id] + credit + '</div><div><p class="label">' + esc(D.catOne[it.category]) + " · " + esc(it.brand) + "</p>" +
      "<h2>" + nbName(esc(it.name)) + "</h2>" + (it.name_note ? '<p class="note">' + esc(it.name_note.value) + " " + chip(it.name_note.status) + "</p>" : "") +
      "<p>" + tierBadge(it) + " <b>" + esc(tierText(it)) + "</b></p>" +
      (it._outlets.length ? '<p class="small">Recommended by these <a class="gl" href="glossary.html#outlet" title="One review site or reviewer, like RTINGS or boardzy">outlets</a>: ' + esc((it._outlet_years || it._outlets).join(", ")) + ' <span class="note">(year of the newest pick)</span></p><p class="note">What counts as recommended: a best-of list place, a clear "my recommendation" in a video, or a tier the reviewer says he recommends. Alternatives such as RTINGS\' <a href="glossary.html#mention">"Notable Mentions"</a> are not counted. <a href="glossary.html#recommended">More</a></p>' : (it._method === "spec" && !it._set_aside && !it._mentions.length ? '<p class="small">Not on any outlet\'s pick list yet.</p>' : "")) +
      (it._mentions.length ? '<p class="small"><a class="gl" href="glossary.html#mention" title="Named as an alternative to an outlet\'s main picks, like RTINGS\' Notable Mentions">Listed as an alternative</a> by: ' + esc(it._mentions.join(", ")) + ' <span class="note">(named next to their main picks, like RTINGS\' "Notable Mentions"; a good sign, but not counted as a recommendation)</span></p>' : "") +
      (it._avoid.length ? '<p class="small warn">Says to avoid it: ' + esc(it._avoid.join(", ")) + "</p>" : "") +
      (it.not_sold ? '<p class="small warn">' + esc(it.not_sold.note || "No longer sold by the maker.") + "</p>" : "") +
      (it.availability && it.availability.status === "unverified" ? '<p class="small warn">Availability: ' + esc(it.availability.value) + " " + chip("unverified") + "</p>" : "") +
      (it._latest_review ? '<p class="small">Newest dated source: ' + esc(it._latest_review) + " (a review, video or best-of list update)</p>" : "") +
      '<p class="dprice">' + priceHTML(it) + '</p><p>' + gloss(it.verdict.text) + " " + chip(it.verdict.status) + "</p>" +
      '<div class="btnrow"><a class="btn" href="compare.html?ids=' + esc(it.id) + '">Compare it</a></div></div></div>';

    var why;
    if (it._method === "spec") {
      if (it._set_aside) why = "<p>" + esc(it._tier_help) + "</p>";
      else {
        // One plain line first; the method sits behind a toggle.
        var cat = esc(D.catName[it.category].toLowerCase()), specs = it._parts.map(function (p) { return p.name.toLowerCase().replace("rtings", "RTINGS"); });
        var specTxt = specs.length > 1 ? specs.slice(0, -1).join(", ") + " and " + specs[specs.length - 1] : specs.join("");
        why = it._score !== null
          ? '<p class="lead1"><b>Spec score ' + it._score100 + "/100:</b> " + (it._score100 === 100 ? "matches or beats every other ranked " + esc(D.catOne[it.category].toLowerCase()) + " on " + esc(specTxt) + "."
              : "on " + esc(specTxt) + ", it matches or beats " + it._score100 + "% of the other " + (D.pool[it.category] - 1) + " ranked " + cat + " (on average).") + "</p>"
          : "<p>" + esc(it._tier_help) + "</p>";
        if (it._score !== null) why += '<details class="howd2"><summary>How it\'s scored</summary><p>' + esc(it._tier_help) + " It is compared with the " + (D.pool[it.category] - 1) + " other ranked " + cat + ". For each spec, beating or matching all of them gives full marks, and half of them gives half marks. The score is the average of those marks.</p>" + (D.choices ? '<p class="note">' + esc(D.choices) + "</p>" : "") + "</details>";
      }
      if (it._parts.length) why += '<div class="specs">' + it._parts.map(function (p) {
        var word = p.better === "lower" ? "lower" : p.better === "yes" ? "better" : "higher";
        var how = (p.better === "yes" ? "Yes beats limited, and limited beats no. " : "") + "Same as or " + word + " than " + p.beat + " of the " + p.of + " other ranked " + esc(D.catName[it.category].toLowerCase()) + ", so it gets " + p.beat + "/" + p.of + " for this spec";
        return '<div class="k">' + gloss(p.name) + "</div><div>" + esc(p.value) + (p.origin ? (/Not from the maker/.test(p.origin) ? ' <span class="chip opinion">Not from maker</span>' : ' <span class="chip">Maker\'s figure</span>') : "") + '<span class="note">' + (p.origin ? esc(p.origin) + ". " : "") + how + (p.tie ? ". " + esc(p.tie) : "") + "</span></div>";
      }).join("") + "</div>";
      if (it._nonmaker && it._nonmaker.length && it._score !== null) why += '<p class="note"><b>Ranked partly on figures not from the maker:</b> ' + it._nonmaker.map(function (x) { return esc(x.name.toLowerCase()) + " (from " + esc(x.outlets.join(", ")) + ")"; }).join("; ") + ". The maker does not list these, so we used a store page or review instead.</p>";
      if (it._skipped.length) why += '<p class="note">' + (it._score === null ? "Why it is not ranked: " : "Not counted: ") + it._skipped.map(function (x) { return esc(x.name) + " (" + esc(x.why.toLowerCase()) + ")"; }).join(", ") + ".</p>";
      var un = (D.rules[it.category] || []).filter(function (r) { return !r.keys.length; });
      if (un.length) why += '<p class="note">' + un.map(function (r) { return esc(r.name) + ": " + esc(r.unavailable); }).join(" ") + "</p>";
      if (D.choices && it._score === null) why += '<p class="note">' + esc(D.choices) + "</p>";
      var pk = (it.picked_by || []).concat(it.mentioned_by || []);
      why += (it.picked_by_note ? '<p class="note">' + esc(it.picked_by_note) + "</p>" : "") + (pk.length ? ((it.picked_by || []).length ? srcLine(it, it.picked_by, "Recommended in") : "") + ((it.mentioned_by || []).length ? srcLine(it, it.mentioned_by, "Listed as an alternative in") : "") : "");
      why += '<p class="note">Spec sources are under Specs below.</p>';
      h += sec("Why it is on the ladder", why, false);
    } else {
      if (it._set_aside) { h += sec("Why it is on the ladder", "<p>" + esc(it._tier_help) + "</p>", false); }
      var picked = it._outlets.length ? esc(it._outlets.join(", ")) : '<span class="dash">No outlet picks yet</span>';
      if (!it._set_aside) h += sec("Why it is on the ladder", "<p>" + esc(it._tier_help) + " Recommended by: " + picked + "." + (it._avoid.length ? " Says to avoid it: " + esc(it._avoid.join(", ")) + "." : "") + " Pros and cons do not change its place.</p>" + (it.picked_by_note ? '<p class="note">' + esc(it.picked_by_note) + "</p>" : "") +
        srcLine(it, it.verdict.sources, "Verdict source", it.verdict.text) + (it.picked_by.length ? srcLine(it, it.picked_by, "Recommended in") : "") + ((it.avoid_by || []).length ? srcLine(it, it.avoid_by, "Avoid") : ""), true);
    }

    var p = it.price ? "<p>" + priceHTML(it) + " (" + esc(it.price.type) + ")" + (it.price.note ? '<span class="note">' + esc(it.price.note) + "</span>" : "") + "</p>" + srcLine(it, it.price.sources)
      : "<p class=\"dash\">No US list price found yet.</p>" + (it.price_note ? "<p>" + esc(it.price_note.value) + "</p>" + srcLine(it, it.price_note.sources) : "");
    h += sec("Price", p, !!(it.price || it.price_note));

    var keys = Object.keys(it.specs);
    var sp = keys.length ? '<div class="specs">' + keys.map(function (k) {
      var f = it.specs[k];
      return '<div class="k">' + gloss(label(k)) + "</div><div>" + specVal(f) + specChips(f) +
        (f.note ? '<span class="note">' + esc(f.note) + "</span>" : "") + srcLine(it, f.sources) + "</div>";
    }).join("") + "</div>" : '<p class="dash">No sourced specs yet.</p>';
    if (it.specs.weight_g && it.specs.weight_measured_g) sp += '<p class="note">Why two weights? Makers weigh their own mice in their own way. RTINGS weighs every mouse the same way, so the ladder uses the RTINGS weight when there is one, and the maker’s weight only when RTINGS has not weighed the mouse.</p>';
    if (it.fits) sp += '<p>Fits: ' + val(it.fits.value) + (it.fits.note ? '<span class="note">' + esc(it.fits.note) + "</span>" : "") + "</p>" + srcLine(it, it.fits.sources);
    if (it.compatible_skates) sp += "<p>Skates that fit it: " + val(it.compatible_skates) + "</p>";
    if (it.use) sp += "<p>" + esc(it.use.note || "") + "</p>" + srcLine(it, it.use.sources);
    if (it.availability) sp += "<p>" + esc(it.availability.value) + "</p>" + srcLine(it, it.availability.sources);
    h += sec("Specs", sp, keys.length > 0 || !!it.fits);

    h += sec("Good and bad", '<div class="two"><div><h4>Good</h4>' + pcList(it, it.pros, "No sourced strengths yet.") +
      "</div><div><h4>Bad</h4>" + pcList(it, it.cons, "No sourced weaknesses yet.") + "</div></div>", it.pros.length + it.cons.length > 0);

    h += '<details class="legend-d"><summary>What do the labels mean?</summary><p class="legend"><span class="chip agreed">Agreed</span> 2+ outlets say it · <span class="chip opinion">Opinion</span> 1 outlet says it · <span class="chip fact">Fact</span> from a maker page or lab test · <span class="chip reported">Reported</span> a fact only a review site or store states · <span class="chip unverified">Unverified</span> not confirmed. <a href="glossary.html">Glossary</a></p></details>';
    $("#detail-body").innerHTML = h;
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    $(".dlg", dlg).scrollTop = 0;
    if (history.replaceState) history.replaceState(null, "", "#item=" + it.id);
  }
  function closeDlg() { if (dlg && dlg.open) { dlg.close(); } }
  if (dlg) {
    $(".close", dlg).addEventListener("click", closeDlg);
    dlg.addEventListener("click", function (ev) { if (ev.target === dlg) closeDlg(); });
    dlg.addEventListener("close", function () { if (location.hash.indexOf("#item=") === 0 && history.replaceState) history.replaceState(null, "", location.pathname + location.search); });
  }

  document.addEventListener("click", function (ev) {
    var b = ev.target.closest(".srcbtn");
    if (b) {
      var box = b.closest(".srcbox, .srcsec"); var on = !box.classList.contains("open");
      box.classList.toggle("open", on); b.setAttribute("aria-expanded", on ? "true" : "false");
      var t = b.textContent; b.textContent = on ? t.replace(/^\+/, "−") : t.replace(/^−/, "+");
      return;
    }
    var g = ev.target.closest(".gbbtn");
    if (g) {
      var sec = g.closest(".srcsec"); var open = !sec.classList.contains("gb-open");
      sec.classList.toggle("gb-open", open); g.setAttribute("aria-expanded", open ? "true" : "false");
      g.textContent = (open ? "− Hide" : "+ Show") + " good and bad points";
      return;
    }
    var o = ev.target.closest("[data-open]");
    if (o) { ev.preventDefault(); openItem(o.getAttribute("data-open")); return; }
    var c = ev.target.closest(".card[data-id]");
    if (c && !ev.target.closest("a")) openItem(c.getAttribute("data-id"));
  });
  // keyboard users reach each card through its name link, so the card itself is not a button

  /* ---------- All items page ---------- */
  function initItems() {
    var grid = $("#all"), cards = $$(".card", grid), q = $("#q"), fc = $("#fcat"), fb = $("#fband"), ft = $("#ftier"), fs = $("#fsort");
    var params = new URLSearchParams(location.search);
    if (params.get("cat")) fc.value = params.get("cat");
    if (params.get("band")) fb.value = params.get("band");
    if (params.get("tier")) ft.value = params.get("tier");
    if (params.get("q")) q.value = params.get("q");
    function run() {
      var words = q.value.toLowerCase().trim().split(/\s+/).filter(Boolean), n = 0;
      var sorted = cards.slice().sort(function (a, b) {
        var pa = a.dataset.price === "" ? null : +a.dataset.price, pb = b.dataset.price === "" ? null : +b.dataset.price;
        if (fs.value === "name") return a.dataset.name.localeCompare(b.dataset.name);
        if (fs.value === "plo" || fs.value === "phi") {
          if (pa === null && pb === null) return 0; if (pa === null) return 1; if (pb === null) return -1;
          return fs.value === "plo" ? pa - pb : pb - pa;
        }
        return cards.indexOf(a) - cards.indexOf(b);
      });
      sorted.forEach(function (c) {
        var ok = words.every(function (w) { return c.dataset.search.indexOf(w) > -1; }) &&
          (!fc.value || c.dataset.cat === fc.value) && (!ft.value || c.dataset.tier === ft.value) &&
          (!fb.value || (fb.value === "none" ? c.dataset.band === "" : c.dataset.band === fb.value));
        c.hidden = !ok; if (ok) n++;
        grid.appendChild(c);
      });
      $("#count").textContent = n === 1 ? "1 item matches." : n + " items match.";
    }
    [q, fc, fb, ft, fs].forEach(function (el) { el.addEventListener("input", run); el.addEventListener("change", run); });
    run();
  }

  /* ---------- Compare page ---------- */
  function num(v) { var m = String(v).match(/\d+(?:\.\d+)?/); return m ? +m[0] : null; }
  function weightKey(it) { var s = it.specs; if (s.weight_measured_g && typeof s.weight_measured_g.value === "number") return "weight_measured_g"; if (s.weight_g && typeof s.weight_g.value === "number" && s.weight_g.status !== "unverified") return "weight_g"; return null; }
  function weight(it) { var k = weightKey(it); return k ? it.specs[k].value : null; }
  function initCompare() {
    var sels = [$("#pick1"), $("#pick2"), $("#pick3")], params = new URLSearchParams(location.search);
    var ids = (params.get("ids") || "").split(",").filter(function (x) { return byId[x]; });
    var first = ids[0] ? byId[ids[0]].category : "mouse";
    var pool = D.items.filter(function (i) { return i.category === first; }).sort(rankCmp);
    var phone = window.matchMedia("(max-width: 760px)").matches, want = phone ? 2 : 3;
    pool.forEach(function (i) { if (ids.length < want && ids.indexOf(i.id) < 0) ids.push(i.id); });
    sels.forEach(function (s, n) { s.value = ids[n] || ""; });
    function syncCats(changedFirst) {
      var cat = byId[sels[0].value].category;
      var used = [sels[0].value];
      var pool2 = D.items.filter(function (i) { return i.category === cat; }).sort(rankCmp);
      sels.slice(1).forEach(function (s, n) {
        $$("option", s).forEach(function (o) { if (o.value) o.disabled = byId[o.value].category !== cat; });
        $$("optgroup", s).forEach(function (g) { g.hidden = !$$("option", g).some(function (o) { return !o.disabled; }); });
        var ok = s.value && byId[s.value].category === cat && used.indexOf(s.value) < 0;
        if (!ok && (n === 0 || changedFirst || s.value)) {
          var next = pool2.filter(function (i) { return used.indexOf(i.id) < 0; })[0];
          s.value = n === 1 && (phone || !changedFirst) && !s.value ? "" : (next ? next.id : "");
        }
        if (s.value) used.push(s.value);
      });
    }
    sels[0].addEventListener("change", function () { syncCats(true); render(); });
    sels[1].addEventListener("change", render); sels[2].addEventListener("change", render);
    syncCats(false);

    function render() {
      var picked = sels.map(function (s) { return byId[s.value]; }).filter(Boolean);
      var seen = {}; picked = picked.filter(function (i) { if (seen[i.id]) return false; seen[i.id] = 1; return true; });
      var box = $("#cmp"), n = picked.length;
      if (history.replaceState) history.replaceState(null, "", "?ids=" + picked.map(function (i) { return i.id; }).join(","));
      if (n < 2) { box.innerHTML = '<p class="dash">Pick at least two different items.</p>'; setAnswer(["Pick at least two different items above."]); return; }
      var cols = "minmax(110px,180px) repeat(" + n + ",minmax(0,1fr))";
      function names(list) { return list.map(link).join(list.length > 2 ? ", " : " and "); }
      var keys = []; picked.forEach(function (i) { Object.keys(i.specs).forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); }); });
      var pr = picked.filter(function (i) { return i._price_cmp !== null; });
      var minP = pr.length ? Math.min.apply(null, pr.map(function (i) { return i._price_cmp; })) : null;
      var cheap = pr.filter(function (i) { return i._price_cmp === minP; });
      var cheapest = cheap.length === 1 && pr.length > 1 ? cheap[0] : null;
      var ws = picked.filter(function (i) { return weight(i) !== null; });
      var minW = ws.length > 1 ? Math.min.apply(null, ws.map(weight)) : null;
      var light = ws.filter(function (i) { return weight(i) === minW; });
      var lightest = minW !== null && light.length === 1 ? light[0] : null;
      // highest polling rate: only numbers that are not Unverified; no mark on a tie
      var pv = function (i) { var f = i.specs.polling_hz; return f && typeof f.value === "number" && f.status !== "unverified" ? f.value : null; };
      var polled = picked.filter(function (i) { return pv(i) !== null; });
      var maxP = polled.length > 1 ? Math.max.apply(null, polled.map(pv)) : null;
      var topP = polled.filter(function (i) { return pv(i) === maxP; });
      var fastest = maxP !== null && topP.length === 1 ? topP[0] : null;
      var same = picked.every(function (i) { return i._method === picked[0]._method; });
      var sorted = picked.slice().sort(rankCmp);
      var tops = sorted.filter(function (i) { return rankCmp(i, sorted[0]) === 0; });
      var topTier = same && tops.length === 1 ? tops[0] : null;

      function row(lbl, f, bestId, cls) {
        var c = cls ? " " + cls : "";
        return '<div class="rl' + c + '">' + esc(lbl) + "</div>" + picked.map(function (i) { return '<div class="' + (bestId === i.id ? "best" : "") + c + '"><span class="who">' + nbName(esc(i.name)) + "</span>" + f(i) + "</div>"; }).join("");
      }
      var h = '<div class="cmp-tools"><span class="small">The green edge marks the lowest price, lowest weight or highest polling rate in each row. Which direction counts as better is our choice (see <a href=\"ladder.html#how\">How the ladder works</a>).</span><button class="srcbtn" type="button" aria-expanded="false">+ Source</button><button class="gbbtn" type="button" aria-expanded="false">+ Show good and bad points</button></div>' + (n === 3 ? '<p class="small swipe">Swipe the table sideways to see all 3.</p>' : "");
      h += '<div class="cmp" style="grid-template-columns:' + cols + ';--n:' + n + '">';
      h += '<div class="rl hd empty"></div>' + picked.map(function (i) {
        return '<div class="hd">' + D.pics[i.id].replace('loading="eager"', 'loading="lazy"') + '<a href="#" data-open="' + esc(i.id) + '"><b>' + (i.name.indexOf(i.brand + " ") === 0 ? '<span class="bn">' + esc(i.brand) + " </span>" + nbName(softBreak(esc(i.name.slice(i.brand.length + 1)))) : nbName(softBreak(esc(i.name)))) + "</b></a></div>";
      }).join("");
      h += row("Ladder", function (i) { return tierBadge(i) + " " + esc(i._tier_label) + (i._score !== null && i._method === "spec" ? '<span class="note">This one: spec score ' + i._score100 + "/100 (" + i._parts.length + ' specs).<span class="pl"> (A full 100 would mean matching or beating all ' + (D.pool[i.category] - 1) + " other ranked " + esc(D.catName[i.category].toLowerCase()) + " on every spec.)</span></span>" : ""); }, topTier && topTier.id);
      h += row("Price", function (i) { return priceHTML(i) + (i.price ? srcLine(i, i.price.sources) : ""); }, cheapest && cheapest.id);
      h += row("Verdict", function (i) { used = {}; return gloss(i.verdict.text) + " " + chip(i.verdict.status) + srcLine(i, i.verdict.sources, null, i.verdict.text); });
      keys.forEach(function (k) {
        var lab = label(k);
        h += row(lab, function (i) {
          var f = i.specs[k]; if (!f) return '<span class="dash">Not in our data</span>';
          used = {};   // link glossary words in every cell, not only the first column
          return specVal(f) + specChips(f) + (f.conflict ? '<span class="note">' + esc(f.note) + "</span>" : "") + srcLine(i, f.sources);
        }, lightest && k === weightKey(lightest) ? lightest.id : (fastest && k === "polling_hz" ? fastest.id : null));
      });
      h += row("Good", function (i) { used = {}; return i.pros.length ? "<ul>" + i.pros.map(function (p) { return "<li>" + gloss(p.text) + " " + chip(p.status) + srcLine(i, p.sources, null, p.text) + "</li>"; }).join("") + "</ul>" : '<span class="dash">None sourced</span>'; }, null, "gb");
      h += row("Bad", function (i) { used = {}; return i.cons.length ? "<ul>" + i.cons.map(function (p) { return "<li>" + gloss(p.text) + " " + chip(p.status) + srcLine(i, p.sources, null, p.text) + "</li>"; }).join("") + "</ul>" : '<span class="dash">None sourced</span>'; }, null, "gb");
      h += "</div>";
      var bar = '<div class="cmp-names" aria-hidden="true">' + picked.map(function (i) { return '<span>' + nbName(esc(i.name)) + "</span>"; }).join("") + "</div>";
      box.innerHTML = '<div class="srcsec">' + h.replace('<div class="cmp"', bar + '<div class="cmp-wrap"><div class="cmp"') + "</div></div>";
      stickyNames(box);

      var b = [];
      if (!same) b.push("These types use different ladder rules, so their ladder groups do not compare.");
      else b.push(topTier ? "Highest on our ladder of these: " + link(topTier) + " (" + esc(tierText(topTier)) + ")." : "Tied on our ladder: " + names(tops) + " (" + esc(tierText(tops[0])) + ").");
      if (!pr.length) b.push("None of these has a US price yet.");
      else if (pr.length === 1) b.push("Only " + link(pr[0]) + " has a US price (" + esc(pr[0]._price_text) + ").");
      else if (cheapest) b.push("Cheapest of these: " + link(cheapest) + " at " + esc(cheapest._price_text) + ".");
      else b.push("Same lowest price of these: " + names(cheap) + " at " + esc(cheap[0]._price_text) + ".");
      if (lightest) b.push("Lightest of these: " + link(lightest) + " at " + esc(weight(lightest)) + " g" + (weightKey(lightest) === "weight_measured_g" ? " (RTINGS measured)" : "") + ".");
      else if (minW !== null) b.push("Same weight: " + names(light) + " at " + esc(minW) + " g.");
      var cats = {}; picked.forEach(function (i) { cats[i.category] = 1; });
      if (Object.keys(cats).length > 1) b.push("These are different kinds of item, so many rows will not line up.");
      else b.push("Tap a name to see every detail and its sources.");
      setAnswer(b);
    }
    function link(i) { return '<a href="#" data-open="' + esc(i.id) + '">' + nbName(esc(i.name)) + "</a>"; }
    function setAnswer(list) { $(".answer ul").innerHTML = list.map(function (x) { return "<li>" + x + "</li>"; }).join(""); }
    render();
  }

  var mb = $(".menu-btn");
  if (mb) mb.addEventListener("click", function () { var top = mb.closest(".top"), on = !top.classList.contains("open"); top.classList.toggle("open", on); mb.setAttribute("aria-expanded", on ? "true" : "false"); });

  var wide = window.matchMedia("(min-width: 761px)").matches;
  $$("details.guide-d").forEach(function (d) { if (wide) d.open = true; });
  $$("details.howd").forEach(function (d) { if (!wide && location.hash !== "#how") d.open = false; });
  window.addEventListener("hashchange", function () { if (location.hash === "#how") $$("details.howd").forEach(function (d) { d.open = true; }); });
  $$("details.keys").forEach(function (d) { if (wide && document.body.getAttribute("data-page") === "home") d.open = true; });
  if (location.hash === "#start") { var gd = $("details.guide-d"); if (gd) gd.open = true; }
  window.addEventListener("hashchange", function () { if (location.hash === "#start") { var gd = $("details.guide-d"); if (gd) gd.open = true; } });

  var pg = document.body.getAttribute("data-page");
  if (pg === "items") initItems();
  if (pg === "compare") initCompare();
  // glossary: fold letters on phones; open the letter that holds a linked word
  var gls = $$("details.gl-letter");
  if (gls.length) {
    var openFor = function () {
      var t = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
      var d = t && (t.matches("details.gl-letter") ? t : t.closest("details.gl-letter"));
      if (d) { d.open = true; t.scrollIntoView(); }
    };
    if (!window.matchMedia("(min-width: 1024px)").matches) gls.forEach(function (d) { d.open = false; });
    openFor(); window.addEventListener("hashchange", openFor);
  }
  function fromHash() { var m = location.hash.match(/^#item=(.+)$/); if (m && byId[m[1]]) openItem(m[1]); }
  fromHash(); window.addEventListener("hashchange", fromHash);
})();
