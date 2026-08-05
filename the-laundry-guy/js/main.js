/* =====================================================================
   The Laundry Guy — homepage sampler
   Vanilla JS, no dependencies, no build step.

   Responsibilities:
   1. Load content.json and inject copy/numbers over the static
      fallback text baked into index.html. If the fetch fails
      (e.g. opened via file://), the baked-in fallback text stands
      and the page still reads correctly.
   2. Run the signature counter count-up (600ms ease-out).
   3. Run the single hero entrance (fade + slide, 400ms).
   4. v3: run the duo-panel micro-animations — the rolling results ticker
      (orange panel) and the invoice creep-flag cycle (navy panel) — on a
      shared 2s heartbeat (left changes every 4s on even beats, right every
      4s on odd beats, so they never pulse together). Cycling pauses while
      the tab is hidden and never starts under prefers-reduced-motion or
      when content.json is unavailable (baked-in first entries stand).
   All animations respect prefers-reduced-motion.
   ===================================================================== */

(function () {
  "use strict";

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var EASE_OUT = function (t) { return 1 - Math.pow(1 - t, 3); };

  /* ---------- helpers ---------- */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function formatMoney(prefix, n) {
    return prefix + Math.round(n).toLocaleString("en-US");
  }

  // Ticker progress bar: map a "45%" string onto the 0-50% scale -> fill width %
  function tickerBarWidth(value) {
    var n = parseFloat(value);
    if (isNaN(n)) return null;
    return Math.max(0, Math.min(100, (n / 50) * 100)) + "%";
  }

  function setTickerBar(value) {
    var fill = $("#duo-ticker-bar-fill");
    var w = tickerBarWidth(value);
    if (fill && w !== null) fill.style.width = w;
  }

  function setText(sel, text) {
    var el = $(sel);
    if (el && text != null) el.textContent = text;
  }

  // Count-up numbers (proof-teaser case cards): el = { display, prefix, target, suffix }
  function setNum(el, num) {
    if (!el || !num) return;
    el.dataset.prefix = num.prefix;
    el.dataset.target = String(num.target);
    el.dataset.suffix = num.suffix;
    el.textContent = num.display;
  }

  /* ---------- 1. content injection ---------- */

  function inject(content) {
    // Nav links
    var navLinks = $all(".nav-links a");
    (content.nav.links || []).forEach(function (link, i) {
      if (navLinks[i]) {
        navLinks[i].textContent = link.label;
        navLinks[i].setAttribute("href", link.href);
      }
    });
    var navCta = $(".nav-cta");
    if (navCta && content.nav.cta) {
      $(".nav-cta .btn-label").textContent = content.nav.cta.label;
      navCta.setAttribute("href", content.nav.cta.href);
    }

    // Hero
    var h = content.hero;
    $("#hero-eyebrow").textContent = h.eyebrow;
    $("#hl-1").textContent = h.headline_line1;
    $("#hl-2-prefix").textContent = h.headline_line2_prefix;
    $("#hl-2-mark").textContent = h.headline_highlight;
    $("#support-before").textContent = h.support_before_stat;
    $("#support-stat").textContent = h.support_stat;
    $("#support-after").textContent = h.support_after_stat;

    var ctaPrimary = $("#cta-primary");
    ctaPrimary.setAttribute("href", h.cta_primary.href);
    $("#cta-primary .btn-label").textContent = h.cta_primary.label;
    var ctaSecondary = $("#cta-secondary");
    ctaSecondary.setAttribute("href", h.cta_secondary.href);
    ctaSecondary.textContent = h.cta_secondary.label;

    $("#trust-label").textContent = h.trust_label;
    $("#trust-name").textContent = h.trust_name;

    // Counter
    var c = content.counter;
    var fig = $("#counter-figure");
    fig.dataset.target = String(c.value);
    fig.dataset.prefix = c.prefix;
    fig.dataset.duration = String(c.duration_ms);
    $("#counter-label").textContent = c.label;
    var proofRows = $all(".counter-proof-row");
    (c.proof_rows || []).forEach(function (row, i) {
      if (proofRows[i]) {
        $(".proof-stat", proofRows[i]).textContent = row.stat;
        $(".proof-note", proofRows[i]).textContent = row.note;
      }
    });

    // Stat strip
    var stats = $all(".stat");
    (content.stats || []).forEach(function (s, i) {
      if (stats[i]) {
        var num = $(".stat-num", stats[i]);
        num.textContent = s.value;
        num.classList.toggle("stat-num--orange", !!s.accent);
        $(".stat-label", stats[i]).textContent = s.label;
        $(".stat-note", stats[i]).textContent = s.note;
      }
    });

    // Stat-strip footnote
    var footnote = $("#stat-footnote");
    if (footnote && content.stats_footnote) {
      footnote.textContent = content.stats_footnote;
    }

    // Duo panel (two doors)
    if (content.duo) {
      ["left", "right"].forEach(function (side) {
        var d = content.duo[side];
        if (!d) return;
        var eyebrow = $("#duo-" + side + "-eyebrow");
        var headline = $("#duo-" + side + "-headline");
        var support = $("#duo-" + side + "-support");
        var cta = $("#duo-" + side + "-cta");
        if (eyebrow) eyebrow.textContent = d.eyebrow;
        if (headline) headline.textContent = d.headline;
        if (support) support.textContent = d.support;
        if (cta && d.cta) {
          cta.textContent = d.cta.label;
          cta.setAttribute("href", d.cta.href);
        }
      });

      // v3 — duo ticker (orange panel): first entry; cycling is initDuoMotion's job
      var t = content.duo.left && content.duo.left.ticker;
      if (t && t.items && t.items[0]) {
        var tEyebrow = $("#duo-ticker-eyebrow");
        var tNum = $("#duo-ticker-num");
        var tSource = $("#duo-ticker-source");
        if (tEyebrow && t.eyebrow) tEyebrow.textContent = t.eyebrow;
        if (tNum) tNum.textContent = t.items[0].value;
        if (tSource) tSource.textContent = t.items[0].label;
        setTickerBar(t.items[0].value);
      }

      // v3 — duo invoice doc (navy panel): chrome + rows + first flag applied statically
      var inv = content.duo.right && content.duo.right.invoice;
      if (inv && inv.rows && inv.rows.length) {
        var invNo = $("#duo-invoice-no");
        var invMeta = $("#duo-invoice-meta");
        var invTotalLabel = $("#duo-invoice-total-label");
        var invTotalAmount = $("#duo-invoice-total-amount");
        if (invNo && inv.doc_no) invNo.textContent = inv.doc_no;
        if (invMeta && inv.meta) invMeta.textContent = inv.meta;
        if (invTotalLabel && inv.total_label) invTotalLabel.textContent = inv.total_label;
        if (invTotalAmount && inv.total_amount) invTotalAmount.textContent = inv.total_amount;
        var rowsWrap = $("#duo-invoice-rows");
        if (rowsWrap) {
          rowsWrap.innerHTML = "";
          inv.rows.forEach(function (row) {
            var line = document.createElement("div");
            line.className = "duo-invoice-line";
            var item = document.createElement("span");
            item.className = "duo-invoice-item";
            item.textContent = row.item;
            var tag = document.createElement("span");
            tag.className = "duo-invoice-tag";
            var amount = document.createElement("span");
            amount.className = "duo-invoice-amount";
            amount.textContent = row.amount;
            line.appendChild(item);
            line.appendChild(tag);
            line.appendChild(amount);
            rowsWrap.appendChild(line);
          });
          // First flag, statically (no stamp motion on load)
          if (inv.flags && inv.flags[0]) {
            var lines = $all(".duo-invoice-line", rowsWrap);
            var f = lines[inv.flags[0].row];
            if (f) {
              f.classList.add("is-flagged");
              $(".duo-invoice-tag", f).textContent = inv.flags[0].tag;
            }
          }
        }
      }
    }

    /* ----- full-homepage zones (v4) ----- */

    // Problem zone
    if (content.problem) {
      var pr = content.problem;
      setText("#prob-eyebrow", pr.eyebrow);
      setText("#prob-h2-prefix", pr.h2_prefix);
      setText("#prob-h2-mark", pr.h2_mark);
      setText("#prob-support", pr.support);
      var probCards = $all("#problem-grid .prob-card");
      (pr.cards || []).forEach(function (card, i) {
        if (!probCards[i]) return;
        $(".prob-title", probCards[i]).textContent = card.title;
        $(".prob-num", probCards[i]).textContent = card.num;
        $(".prob-desc", probCards[i]).textContent = card.desc;
      });
      setText("#prob-footnote", pr.footnote);
    }

    // How it works
    if (content.how) {
      var hw = content.how;
      setText("#how-eyebrow", hw.eyebrow);
      setText("#how-h2", hw.h2);
      var stepCards = $all("#how-grid .step-card");
      (hw.steps || []).forEach(function (step, i) {
        if (!stepCards[i]) return;
        $(".step-num", stepCards[i]).textContent = step.num;
        $(".step-title", stepCards[i]).textContent = step.title;
        $(".step-desc", stepCards[i]).textContent = step.desc;
      });
      var howCta = $("#how-cta");
      if (howCta && hw.cta) {
        howCta.textContent = hw.cta.label;
        howCta.setAttribute("href", hw.cta.href);
      }
    }

    // Proof teaser (results.html case-card component)
    if (content.proof) {
      var pf = content.proof;
      setText("#proof-eyebrow", pf.eyebrow);
      setText("#proof-h2", pf.h2);
      var proofCards = $all("#proof-grid .case-card");
      (pf.cards || []).forEach(function (card, i) {
        if (!proofCards[i]) return;
        $(".case-eyebrow", proofCards[i]).textContent = card.eyebrow;
        $(".case-hook", proofCards[i]).textContent = card.hook;
        setNum($(".case-num", proofCards[i]), card.number);
        $(".case-sub", proofCards[i]).textContent = card.sublabel;
        $(".case-how", proofCards[i]).textContent = card.how;
      });
      var proofCta = $("#proof-cta");
      if (proofCta && pf.cta) {
        proofCta.textContent = pf.cta.label;
        proofCta.setAttribute("href", pf.cta.href);
      }
    }

    // Industries (navy band tiles)
    if (content.industries) {
      var ind = content.industries;
      setText("#ind-eyebrow", ind.eyebrow);
      setText("#ind-h2", ind.h2);
      var tiles = $all("#ind-grid .ind-tile");
      (ind.tiles || []).forEach(function (tile, i) {
        if (!tiles[i]) return;
        $(".ind-name", tiles[i]).textContent = tile.name;
        var note = $(".ind-note", tiles[i]);
        if (note) {
          note.textContent = tile.note;
          if (tile.figure) {
            var strong = document.createElement("strong");
            strong.textContent = tile.figure;
            note.appendChild(strong);
          }
        }
      });
    }

    // Testimonial wall (results.html quote-card component)
    if (content.testimonials) {
      var tw = content.testimonials;
      setText("#tw-eyebrow", tw.eyebrow);
      setText("#tw-h2", tw.h2);
      var quoteCards = $all("#twall-grid .quote-card");
      (tw.quotes || []).forEach(function (q, i) {
        if (!quoteCards[i]) return;
        $(".quote-text", quoteCards[i]).textContent = "“" + q.quote + "”";
        $(".quote-company", quoteCards[i]).textContent = q.company;
        $(".quote-title", quoteCards[i]).textContent = q.title;
      });
    }

    // Risk reversal band
    if (content.risk) {
      setText("#risk-line", content.risk.line);
      setText("#risk-support", content.risk.support);
      setText("#risk-footnote", content.risk.footnote);
    }

    // Footer — lists rebuilt from JSON so new links land by data edit only.
    if (content.footer) {
      var cols = $all("#footer-grid .footer-col");
      (content.footer.columns || []).forEach(function (col, i) {
        if (!cols[i]) return;
        $(".footer-col-h", cols[i]).textContent = col.header;
        var list = $(".footer-list", cols[i]);
        if (!list) return;
        list.innerHTML = "";
        (col.links || []).forEach(function (link) {
          var li = document.createElement("li");
          var a = document.createElement("a");
          a.textContent = link.label;
          a.setAttribute("href", link.href);
          li.appendChild(a);
          list.appendChild(li);
        });
        (col.items || []).forEach(function (item) {
          var li = document.createElement("li");
          var span = document.createElement("span");
          span.textContent = item;
          li.appendChild(span);
          list.appendChild(li);
        });
      });
      setText("#footer-copy", content.footer.copyright);
    }
  }

  /* ---------- 2. counter count-up ---------- */

  function runCounter() {
    var fig = $("#counter-figure");
    if (!fig) return;
    var target = parseInt(fig.dataset.target, 10);
    var prefix = fig.dataset.prefix || "$";
    var duration = parseInt(fig.dataset.duration, 10) || 600;
    if (isNaN(target)) return;

    if (REDUCED) {
      fig.textContent = formatMoney(prefix, target);
      return;
    }

    var start = null;
    function frame(ts) {
      if (start === null) start = ts;
      var t = Math.min((ts - start) / duration, 1);
      fig.textContent = formatMoney(prefix, target * EASE_OUT(t));
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- 3. hero entrance ---------- */

  function runEntrance() {
    var els = $all(".enter");
    if (REDUCED) {
      els.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    // Double rAF so initial styles paint before the transition starts.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        els.forEach(function (el) { el.classList.add("is-in"); });
      });
    });
  }

  /* ---------- 3b. scroll-into-view count-ups (v4) ----------
     Mirrors js/results.js: 600ms ease-out, runs ONCE per element.
     Motion budget (v4, locked): the only elements carrying .count on this
     page are the two proof-teaser case-card numbers — nothing else counts. */

  function runCount(el) {
    var target = parseFloat(el.dataset.target);
    var prefix = el.dataset.prefix || "";
    var suffix = el.dataset.suffix || "";
    if (isNaN(target)) return;
    var start = null;
    function frame(ts) {
      if (start === null) start = ts;
      var t = Math.min((ts - start) / 600, 1);
      el.textContent = prefix + Math.round(target * EASE_OUT(t)).toLocaleString("en-US") + suffix;
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function initCountups() {
    var els = $all(".count");
    if (!els.length) return;

    // Reduced motion or no IntersectionObserver: baked-in final values stand.
    if (REDUCED || !("IntersectionObserver" in window)) return;

    var seen = new WeakSet();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || seen.has(entry.target)) return;
        seen.add(entry.target);
        runCount(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.4 });

    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 4. duo micro-animations (v3) ---------- */

  function initDuoMotion(content) {
    if (REDUCED || !content || !content.duo) return;

    var tickerData = content.duo.left && content.duo.left.ticker;
    var invoiceData = content.duo.right && content.duo.right.invoice;
    var tickerOk = !!(tickerData && tickerData.items && tickerData.items.length > 1 && $("#duo-ticker-figure"));
    var invoiceOk = !!(invoiceData && invoiceData.flags && invoiceData.flags.length > 1 && $("#duo-invoice-rows"));
    if (!tickerOk && !invoiceOk) return;

    /* --- left (orange): rolling results ticker — odometer-style vertical roll --- */
    var tickerIdx = 0;
    var tickerFigure = $("#duo-ticker-figure");
    var tickerSource = $("#duo-ticker-source");
    var tickerCurrent = $("#duo-ticker-num");

    function advanceTicker() {
      tickerIdx = (tickerIdx + 1) % tickerData.items.length;
      var item = tickerData.items[tickerIdx];
      var incoming = document.createElement("span");
      incoming.className = "duo-ticker-num is-below";
      incoming.textContent = item.value;
      tickerFigure.appendChild(incoming);
      void incoming.offsetHeight;              // paint the staged position first
      tickerCurrent.classList.add("is-out");   // old value rolls up and out (400ms)
      incoming.classList.remove("is-below");   // new value rolls up in (400ms)
      setTickerBar(item.value);                // progress bar eases to the new value (800ms)
      if (tickerSource) {
        tickerSource.classList.add("is-swapping");
        window.setTimeout(function () {
          tickerSource.textContent = item.label;
          tickerSource.classList.remove("is-swapping");
        }, 200);
      }
      var outgoing = tickerCurrent;
      tickerCurrent = incoming;
      window.setTimeout(function () {
        if (outgoing.parentNode) outgoing.parentNode.removeChild(outgoing);
      }, 450);
    }

    /* --- right (navy): creep flags stamping across the mini invoice rows --- */
    var flagIdx = 0;

    function advanceInvoice() {
      flagIdx = (flagIdx + 1) % invoiceData.flags.length;
      var flag = invoiceData.flags[flagIdx];
      var lines = $all("#duo-invoice-rows .duo-invoice-line");
      lines.forEach(function (line) {
        if (line.classList.contains("is-flagged")) {
          line.classList.remove("is-flagged");   // previous flag clears with a quick fade
        }
      });
      var line = lines[flag.row];
      if (!line) return;
      var tag = $(".duo-invoice-tag", line);
      tag.textContent = flag.tag;
      tag.classList.add("is-stamping");
      line.classList.add("is-flagged");          // row highlight fades in (250ms)
      void tag.offsetHeight;
      window.setTimeout(function () {
        tag.classList.remove("is-stamping");     // tag stamps in ~150ms after the row flags
      }, 150);
    }

    /* --- shared heartbeat: 2s beats; left on even beats (t=4,8,…),
           right on odd beats (t=2,6,…) — a fixed ~2s offset --- */
    var HEARTBEAT = (tickerData && tickerData.interval_ms || invoiceData && invoiceData.interval_ms || 4000) / 2;
    var beat = 0;
    var timer = null;

    function onBeat() {
      beat++;
      if (beat % 2 === 0) { if (tickerOk) advanceTicker(); }
      else { if (invoiceOk) advanceInvoice(); }
    }
    function start() { if (timer === null) timer = window.setInterval(onBeat, HEARTBEAT); }
    function stop() { if (timer !== null) { window.clearInterval(timer); timer = null; } }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else start();   // don't burn cycles in hidden tabs
    });
    start();
  }

  /* ---------- boot ---------- */

  function boot() {
    fetch("content.json")
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (content) {
        if (content) inject(content);
        return content;
      })
      .catch(function () { return null; /* file:// or offline — baked-in fallback stands */ })
      .then(function (content) {
        runEntrance();
        runCounter();
        initCountups();
        initDuoMotion(content);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
