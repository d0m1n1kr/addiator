/*
 * Addiator Duplex – Ansicht & Bedienung.
 *
 * Bedienung wie beim Original mit dem Stift:
 *  - Man greift oben bei der 0 an und zieht nach unten bis zur Zahl, die man
 *    addieren (bzw. nach dem Umdrehen subtrahieren) möchte.
 *  - Beim Loslassen wird der Betrag verbucht; der Griff springt zurück auf 0.
 *  - Die rot unterlegte Zone der Skala zeigt, ab welcher Zahl ein Übertrag
 *    nötig wird.
 *
 * Transparent-Modus: zeigt die Zahnstange (mit Zacken) und den Übertragshebel.
 *  - Die Zahnstange folgt der Eingabe (Position = aktuelle Ziffer).
 *  - Läuft eine Stelle über die 9 (bzw. unter die 0), macht die Zahnstange den
 *    Rückhub „über die Null". Dabei betätigt ihr hervorgehobener Übertragszahn
 *    den Hebel zwischen den Stellen, der die Nachbarstelle eine Zacke
 *    weiterrückt – Überträge kaskadieren so sichtbar nach links.
 */
(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';

  // ---- Geometrie (SVG-Einheiten) ----------------------------------------
  const N = 9;
  const COL_W = 64;
  const MARGIN = 22;
  const WINDOW_H = 56;
  const GAP = 14;
  const TOP_HOOK = 38; // Bereich für den Übertragshebel über der Skala
  const DETENT = 26; // Abstand zweier Rasten / Zacken
  const STEPS = 9; // 0..9
  const TRACK_H = STEPS * DETENT;
  const BOT_HOOK = 30;

  const WIDTH = MARGIN * 2 + N * COL_W;
  const TRACK_TOP = MARGIN + WINDOW_H + GAP + TOP_HOOK;
  const HEIGHT = TRACK_TOP + TRACK_H + BOT_HOOK + MARGIN;

  const yOf = (a) => TRACK_TOP + a * DETENT; // a = Position/Betrag 0..9
  const LEVER_Y = TRACK_TOP - 2; // Höhe des Übertragshebels / Pin-Kontakt

  // ---- Hilfsfunktionen ---------------------------------------------------
  function el(tag, attrs, children) {
    const node = document.createElementNS(SVG_NS, tag);
    if (attrs) for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (children) children.forEach((c) => node.appendChild(c));
    return node;
  }

  // gezahnte Kontur (Zacken auf beiden Seiten)
  function teethPath(cx, yTop, yBot, pitch, halfW, toothD) {
    let d = `M ${cx + halfW} ${yTop}`;
    for (let y = yTop; y < yBot; y += pitch) {
      d += ` L ${cx + halfW + toothD} ${y + pitch * 0.5} L ${cx + halfW} ${y + pitch}`;
    }
    d += ` L ${cx - halfW} ${yBot}`;
    for (let y = yBot; y > yTop; y -= pitch) {
      d += ` L ${cx - halfW - toothD} ${y - pitch * 0.5} L ${cx - halfW} ${y - pitch}`;
    }
    return d + ' Z';
  }

  // rAF-Tween (Werte in SVG-Einheiten)
  function tween(duration, from, to, onUpdate) {
    return new Promise((resolve) => {
      if (duration <= 0 || from === to) {
        onUpdate(to);
        return resolve();
      }
      const start = performance.now();
      function frame(now) {
        const t = Math.min(1, (now - start) / duration);
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOutQuad
        onUpdate(from + (to - from) * e);
        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      }
      requestAnimationFrame(frame);
    });
  }

  // ---- Aufbau ------------------------------------------------------------
  const model = new window.AddiatorModel(N);
  const deviceEl = document.getElementById('device');
  const readoutEl = document.getElementById('readout');
  const bodyEl = document.body;

  const svg = el('svg', {
    viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
    class: 'addiator-svg',
    preserveAspectRatio: 'xMidYMid meet',
  });
  deviceEl.appendChild(svg);

  // Clip für die Zahnstange (lokale Koordinaten, je Spalte wiederverwendet)
  const cx0 = COL_W / 2;
  const defs = el('defs');
  const clip = el('clipPath', { id: 'trackClip', clipPathUnits: 'userSpaceOnUse' });
  clip.appendChild(el('rect', { x: cx0 - 20, y: TRACK_TOP - DETENT, width: 40, height: TRACK_H + DETENT + 4 }));
  defs.appendChild(clip);
  svg.appendChild(defs);

  svg.appendChild(
    el('rect', { x: 4, y: 4, width: WIDTH - 8, height: HEIGHT - 8, rx: 14, class: 'plate' })
  );

  const cols = [];

  for (let i = 0; i < N; i++) {
    const x = MARGIN + i * COL_W;
    const cx = COL_W / 2;
    const g = el('g', { transform: `translate(${x},0)`, class: 'col', 'data-col': i });

    if (i > 0) {
      g.appendChild(el('line', { x1: 0, y1: MARGIN, x2: 0, y2: HEIGHT - MARGIN, class: 'col-sep' }));
    }

    // --- Mechanik (nur im Transparent-Modus sichtbar) ---
    const mech = el('g', { class: 'mech' });
    // bewegliche Zahnstange (Position = Ziffer): teeth + Übertragszahn
    const rack = el('g', { class: 'rack', 'clip-path': 'url(#trackClip)', transform: 'translate(0,0)' });
    rack.appendChild(
      el('path', {
        d: teethPath(cx, TRACK_TOP - 10 * DETENT, TRACK_TOP + TRACK_H + DETENT, DETENT, 6, 6),
        class: 'rack-teeth',
      })
    );
    // Übertragszahn: sitzt bei Ziffer 0 auf Höhe des Hebels und wandert mit
    rack.appendChild(
      el('path', { d: `M ${cx - 6} ${LEVER_Y - 7} L ${cx - 19} ${LEVER_Y} L ${cx - 6} ${LEVER_Y + 7} Z`, class: 'carry-tooth' })
    );
    mech.appendChild(rack);
    g.appendChild(mech);

    // --- Schiene ---
    g.appendChild(el('rect', { x: cx - 12, y: yOf(0) - 8, width: 24, height: TRACK_H + 16, rx: 12, class: 'track' }));

    // --- Rote Übertrag-Zone (dynamisch) ---
    const redZone = el('rect', { x: cx - 12, width: 24, rx: 5, class: 'redzone', y: yOf(10), height: 0 });
    g.appendChild(redZone);

    // --- Skala 0..9 ---
    const scaleLabels = [];
    for (let a = 0; a <= 9; a++) {
      g.appendChild(el('line', { x1: cx + 13, y1: yOf(a), x2: cx + 18, y2: yOf(a), class: 'tick' }));
      const lbl = el('text', { x: cx + 24, y: yOf(a) + 4, class: 'scale-num' });
      lbl.textContent = String(a);
      g.appendChild(lbl);
      scaleLabels.push(lbl);
    }

    // --- Stift-Griff (ruht oben bei 0) ---
    const handle = el('g', { class: 'handle', transform: `translate(${cx},${yOf(0)})` });
    handle.appendChild(el('rect', { x: -13, y: -11, width: 26, height: 22, rx: 7, class: 'handle-body' }));
    handle.appendChild(el('path', { d: 'M -5 -2 L 5 -2 L 0 6 Z', class: 'handle-arrow' }));
    g.appendChild(handle);

    // --- Ergebnisfenster ---
    g.appendChild(el('rect', { x: 9, y: MARGIN, width: COL_W - 18, height: WINDOW_H, rx: 6, class: 'window' }));
    const winText = el('text', { x: cx, y: MARGIN + WINDOW_H / 2 + 11, class: 'window-num' });
    winText.textContent = '0';
    g.appendChild(winText);
    const carryInd = el('circle', { cx: COL_W - 16, cy: MARGIN + 11, r: 5, class: 'carry-ind' });
    g.appendChild(carryInd);

    // Greiffläche für Pointer
    const grab = el('rect', {
      x: cx - 18, y: yOf(0) - 10, width: 36, height: TRACK_H + 20, class: 'grab', 'data-col': i, tabindex: 0,
    });
    g.appendChild(grab);

    svg.appendChild(g);
    const col = { i, g, handle, winText, grab, rack, redZone, scaleLabels, carryInd, rackDigit: 0 };
    cols.push(col);
    bindColumn(col);
  }

  // --- Übertragshebel zwischen den Stellen (eigene Ebene, ungeclippt) ---
  const pawlLayer = el('g', { class: 'pawl-layer' });
  svg.appendChild(pawlLayer);
  for (let i = 1; i < N; i++) {
    const X = MARGIN + i * COL_W; // Grenze zwischen Stelle i (rechts) und i-1 (links)
    const lever = el('g', { class: 'cpawl', transform: `rotate(0 ${X} ${LEVER_Y})` });
    lever.appendChild(el('line', { x1: X - 30, y1: LEVER_Y, x2: X + 20, y2: LEVER_Y, class: 'lever-rod' }));
    lever.appendChild(el('circle', { cx: X + 18, cy: LEVER_Y, r: 3.2, class: 'lever-tip' })); // Antrieb (Stelle i)
    lever.appendChild(el('circle', { cx: X - 28, cy: LEVER_Y, r: 3.2, class: 'lever-tip' })); // Abtrieb (Stelle i-1)
    lever.appendChild(el('circle', { cx: X, cy: LEVER_Y, r: 2, class: 'lever-pivot' }));
    pawlLayer.appendChild(lever);
    cols[i].pawl = { el: lever, X, y: LEVER_Y };
  }

  // ---- Anzeige aktualisieren --------------------------------------------
  function isAdd() {
    return bodyEl.dataset.mode === 'add';
  }
  function isTransparent() {
    return bodyEl.classList.contains('transparent');
  }
  function carryThreshold(v) {
    return isAdd() ? 10 - v : v + 1; // Beträge >= threshold liegen in der roten Zone
  }

  function setRack(col, digit) {
    col.rackDigit = digit;
    col.rack.setAttribute('transform', `translate(0,${digit * DETENT})`);
  }

  function updateRedZone(col) {
    const v = model.digits[col.i];
    const th = carryThreshold(v);
    if (th > 9) {
      col.redZone.setAttribute('height', 0);
    } else {
      const top = yOf(th) - DETENT / 2;
      const bottom = yOf(9) + DETENT / 2;
      col.redZone.setAttribute('y', top);
      col.redZone.setAttribute('height', bottom - top);
    }
    col.scaleLabels.forEach((lbl, a) => lbl.classList.toggle('red', a >= th && a >= 1));
  }

  function setHandle(col, a, animate) {
    col.handle.classList.toggle('no-anim', !animate);
    col.handle.setAttribute('transform', `translate(${COL_W / 2},${yOf(a)})`);
  }

  function refresh(animate) {
    for (const col of cols) {
      col.winText.textContent = String(model.digits[col.i]);
      col.carryInd.classList.remove('show');
      setHandle(col, 0, animate);
      setRack(col, model.digits[col.i]);
      updateRedZone(col);
    }
    readoutEl.textContent = String(model.value);
  }

  function pulse(idx) {
    const c = cols[idx];
    c.g.classList.remove('pulse');
    void c.g.getBoundingClientRect();
    c.g.classList.add('pulse');
    setTimeout(() => c.g.classList.remove('pulse'), 600);
  }

  function animateChain(events) {
    let delay = 0;
    events.forEach((e) => {
      setTimeout(() => pulse(e.to), delay);
      delay += 220;
    });
  }

  // ---- Mechanik-Simulation (Transparent-Modus) --------------------------
  let animating = false;

  function scrollTo(col, toDigit) {
    const from = cols[col].rackDigit * DETENT;
    const to = toDigit * DETENT;
    const teeth = Math.abs(toDigit - cols[col].rackDigit);
    return tween(Math.max(0, teeth) * 120, from, to, (v) => {
      cols[col].rack.setAttribute('transform', `translate(0,${v})`);
    }).then(() => {
      cols[col].rackDigit = toDigit;
    });
  }

  // Rückhub „über die Null" (Übertrag) bzw. „unter die Neun" (Entlehnung)
  function overTop(col, dir) {
    const from = cols[col].rackDigit * DETENT;
    const to = (dir > 0 ? 0 : 9) * DETENT;
    return tween(420, from, to, (v) => {
      cols[col].rack.setAttribute('transform', `translate(0,${v})`);
    }).then(() => {
      cols[col].rackDigit = dir > 0 ? 0 : 9;
    });
  }

  function rotatePawl(col, fromA, toA) {
    const p = cols[col].pawl;
    return tween(150, fromA, toA, (a) => {
      p.el.setAttribute('transform', `rotate(${a} ${p.X} ${p.y})`);
    });
  }

  function setWin(col, d) {
    cols[col].winText.textContent = String(d);
  }

  // einen Betrag k auf Stelle col verbuchen (dir +1 add / -1 sub), animiert
  async function opChain(disp, col, k, dir) {
    const d0 = disp[col];
    const target = d0 + dir * k;
    const wraps = dir > 0 ? target > 9 : target < 0;

    if (!wraps) {
      await scrollTo(col, target);
      disp[col] = target;
      setWin(col, target);
      pulse(col);
      return;
    }

    // bis zur Grenze (9 bzw. 0) fahren …
    await scrollTo(col, dir > 0 ? 9 : 0);
    // … dann der Übertrags-Rückhub: der Übertragszahn fährt zum Hebel
    await overTop(col, dir);
    disp[col] = dir > 0 ? 0 : 9;
    setWin(col, disp[col]);

    // Hebel betätigt die Nachbarstelle (eine Zacke), ggf. kaskadierend
    if (col > 0) {
      cols[col].pawl.el.classList.add('active');
      await rotatePawl(col, 0, dir > 0 ? -16 : 16);
      await opChain(disp, col - 1, 1, dir);
      await rotatePawl(col, dir > 0 ? -16 : 16, 0);
      cols[col].pawl.el.classList.remove('active');
    }

    // restlichen Betrag der eigenen Stelle nachführen
    const remainder = target - dir * 10;
    await scrollTo(col, remainder);
    disp[col] = remainder;
    setWin(col, remainder);
    pulse(col);
  }

  async function runMechanism(i, amount, dir, oldDigits) {
    animating = true;
    bodyEl.classList.add('animating');
    const disp = [...oldDigits];
    await opChain(disp, i, amount, dir);
    animating = false;
    bodyEl.classList.remove('animating');
    refresh(false); // mit Modell-Endstand abgleichen
  }

  // ---- Drag-Logik (Stift von 0 nach unten ziehen) -----------------------
  function svgPoint(clientX, clientY) {
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  function bindColumn(col) {
    const grab = col.grab;
    let dragging = false;
    let amount = 0;

    function preview() {
      const v = model.digits[col.i];
      const carry = amount >= carryThreshold(v);
      // Zahnstange folgt dem Stift bis zur Grenze (9 bzw. 0)
      const clamped = isAdd() ? Math.min(v + amount, 9) : Math.max(v - amount, 0);
      setRack(col, clamped);
      // Fenster: im Transparent-Modus den Mechanik-Stand zeigen, sonst Ergebnis-Vorschau
      const shown = isTransparent() ? clamped : isAdd() ? (v + amount) % 10 : (v - amount + 10) % 10;
      col.winText.textContent = String(shown);
      col.carryInd.classList.toggle('show', amount > 0 && carry);
      col.g.classList.toggle('carry-pending', amount > 0 && carry);
      setHandle(col, amount, false);
    }

    grab.addEventListener('pointerdown', (e) => {
      if (animating) return;
      e.preventDefault();
      dragging = true;
      amount = 0;
      grab.setPointerCapture(e.pointerId);
      col.g.classList.add('grabbing');
      setHandle(col, 0, false);
    });

    grab.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const y = svgPoint(e.clientX, e.clientY).y;
      amount = Math.max(0, Math.min(9, Math.round((y - yOf(0)) / DETENT)));
      preview();
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      col.g.classList.remove('grabbing', 'carry-pending');
      try {
        grab.releasePointerCapture(e.pointerId);
      } catch (_) {}
      commit(col.i, amount);
      amount = 0;
    }

    grab.addEventListener('pointerup', endDrag);
    grab.addEventListener('pointercancel', endDrag);

    grab.addEventListener('keydown', (e) => {
      if (animating) return;
      if (e.key >= '0' && e.key <= '9') {
        commit(col.i, Number(e.key));
        e.preventDefault();
      }
    });
  }

  function commit(i, amount) {
    if (animating) return;
    if (!amount) {
      refresh(true);
      return;
    }
    const old = [...model.digits];
    const res = isAdd() ? model.add(i, amount) : model.sub(i, amount);
    const chain = isAdd() ? res.carries : res.borrows;
    if ((isAdd() && res.overflow) || (!isAdd() && res.underflow)) flashError();

    if (isTransparent()) {
      setHandle(cols[i], 0, false); // Griff zurück auf 0, Mechanik zeigt den Rest
      runMechanism(i, amount, isAdd() ? 1 : -1, old);
    } else {
      refresh(true);
      if (chain.length) animateChain(chain);
    }
  }

  function flashError() {
    deviceEl.classList.add('error');
    setTimeout(() => deviceEl.classList.remove('error'), 400);
  }

  // ---- Bedienelemente ----------------------------------------------------
  const flipBtn = document.getElementById('flipBtn');
  const clearBtn = document.getElementById('clearBtn');
  const transToggle = document.getElementById('transparentToggle');
  const helpBtn = document.getElementById('helpBtn');
  const helpDialog = document.getElementById('helpDialog');
  const modeBadge = document.getElementById('modeBadge');

  let flipping = false;
  flipBtn.addEventListener('click', () => {
    if (flipping || animating) return;
    flipping = true;
    deviceEl.classList.add('flipping');
    setTimeout(() => {
      const next = bodyEl.dataset.mode === 'add' ? 'sub' : 'add';
      bodyEl.dataset.mode = next;
      modeBadge.textContent = next === 'add' ? 'Addition' : 'Subtraktion';
      refresh(false);
    }, 250);
    setTimeout(() => {
      deviceEl.classList.remove('flipping');
      flipping = false;
    }, 500);
  });

  clearBtn.addEventListener('click', () => {
    if (animating) return;
    model.clear();
    refresh(true);
  });

  transToggle.addEventListener('change', () => {
    bodyEl.classList.toggle('transparent', transToggle.checked);
  });

  helpBtn.addEventListener('click', () => helpDialog.showModal());

  // Start
  refresh(false);
})();
