/*
 * Addiator Duplex – Ansicht & Bedienung.
 *
 * Jede Stelle ist ein vertikaler Schieber. Ziehen nach unten addiert,
 * Ziehen nach oben (nach dem Umdrehen) subtrahiert. Läuft eine Stelle über
 * die 9 / unter die 0, wird der Übertrag wie beim echten Gerät über den Bogen
 * an die nächste Stelle weitergegeben.
 */
(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';

  // ---- Geometrie (SVG-Einheiten) ----------------------------------------
  const N = 9;
  const COL_W = 64;
  const MARGIN = 22;
  const WINDOW_H = 56;
  const GAP = 10;
  const CARRY_ZONE = 46; // Bogen oben (Übertrag)
  const DETENT = 26; // Abstand zweier Rasten
  const STEPS = 9; // 0..9
  const TRACK_H = STEPS * DETENT;
  const BORROW_ZONE = 46; // Bogen unten (Entlehnung)

  const WIDTH = MARGIN * 2 + N * COL_W;
  const HEIGHT = MARGIN + WINDOW_H + GAP + CARRY_ZONE + TRACK_H + BORROW_ZONE + MARGIN;

  const TRACK_TOP = MARGIN + WINDOW_H + GAP + CARRY_ZONE;
  const yOf = (v) => TRACK_TOP + v * DETENT;

  // ---- Hilfsfunktionen ---------------------------------------------------
  function el(tag, attrs, children) {
    const node = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      for (const k in attrs) node.setAttribute(k, attrs[k]);
    }
    if (children) children.forEach((c) => node.appendChild(c));
    return node;
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

  // Hintergrundplatte
  svg.appendChild(
    el('rect', { x: 4, y: 4, width: WIDTH - 8, height: HEIGHT - 8, rx: 14, class: 'plate' })
  );

  const cols = [];

  for (let i = 0; i < N; i++) {
    const x = MARGIN + i * COL_W;
    const cx = COL_W / 2;
    const g = el('g', { transform: `translate(${x},0)`, class: 'col', 'data-col': i });

    // Trennlinie zwischen den Spalten
    if (i > 0) {
      g.appendChild(el('line', { x1: 0, y1: MARGIN, x2: 0, y2: HEIGHT - MARGIN, class: 'col-sep' }));
    }

    // --- Transparent-Mechanik (liegt hinter dem Schieber) ---
    const rack = el('g', { class: 'mech' });
    // Zahnstange
    const rackBar = el('rect', {
      x: cx - 7,
      y: yOf(0) - DETENT,
      width: 14,
      height: TRACK_H + 2 * DETENT,
      rx: 3,
      class: 'rack-bar',
    });
    rack.appendChild(rackBar);
    for (let t = -1; t <= STEPS + 1; t++) {
      rack.appendChild(
        el('line', { x1: cx - 7, y1: yOf(0) + t * DETENT, x2: cx + 7, y2: yOf(0) + t * DETENT, class: 'rack-tooth' })
      );
    }
    // Übertrag-Hebel (Pawl) oben, zeigt zur linken Nachbarstelle
    const pawl = el('path', {
      d: `M ${cx - 2} ${TRACK_TOP - 6} q -16 -10 -22 -22`,
      class: 'pawl',
    });
    rack.appendChild(pawl);
    g.appendChild(rack);

    // --- Bogen oben (Übertrag) & unten (Entlehnung) ---
    g.appendChild(
      el('path', {
        d: `M ${cx} ${TRACK_TOP} C ${cx} ${TRACK_TOP - CARRY_ZONE}, ${cx - COL_W + 14} ${TRACK_TOP - CARRY_ZONE}, ${cx - COL_W + 14} ${TRACK_TOP - 6}`,
        class: 'hook hook-carry',
      })
    );
    g.appendChild(
      el('path', {
        d: `M ${cx} ${TRACK_TOP + TRACK_H} C ${cx} ${TRACK_TOP + TRACK_H + BORROW_ZONE}, ${cx - COL_W + 14} ${TRACK_TOP + TRACK_H + BORROW_ZONE}, ${cx - COL_W + 14} ${TRACK_TOP + TRACK_H + 6}`,
        class: 'hook hook-borrow',
      })
    );

    // --- Schiene ---
    g.appendChild(el('rect', { x: cx - 11, y: yOf(0) - 6, width: 22, height: TRACK_H + 12, rx: 11, class: 'track' }));

    // Skala 0..9
    for (let v = 0; v <= 9; v++) {
      g.appendChild(el('line', { x1: cx + 12, y1: yOf(v), x2: cx + 17, y2: yOf(v), class: 'tick' }));
      const lbl = el('text', { x: cx + 23, y: yOf(v) + 4, class: 'scale-num' });
      lbl.textContent = String(v);
      g.appendChild(lbl);
    }

    // --- Schieber-Griff ---
    const handle = el('g', { class: 'handle', transform: `translate(${cx},${yOf(0)})` });
    handle.appendChild(el('rect', { x: -13, y: -12, width: 26, height: 24, rx: 7, class: 'handle-body' }));
    handle.appendChild(el('circle', { cx: 0, cy: 0, r: 4.5, class: 'handle-hole' }));
    g.appendChild(handle);

    // --- Ergebnisfenster ---
    g.appendChild(el('rect', { x: 9, y: MARGIN, width: COL_W - 18, height: WINDOW_H, rx: 6, class: 'window' }));
    const winText = el('text', { x: cx, y: MARGIN + WINDOW_H / 2 + 11, class: 'window-num' });
    winText.textContent = '0';
    g.appendChild(winText);

    // Greiffläche für Pointer (über der gesamten Schiene)
    const grab = el('rect', {
      x: cx - 18,
      y: TRACK_TOP - 8,
      width: 36,
      height: TRACK_H + 16,
      class: 'grab',
      'data-col': i,
      tabindex: 0,
    });
    g.appendChild(grab);

    svg.appendChild(g);
    cols.push({ i, g, handle, winText, grab, rack });

    bindColumn(cols[i]);
  }

  // ---- Anzeige aktualisieren --------------------------------------------
  function setHandle(col, value, animate) {
    col.handle.classList.toggle('no-anim', !animate);
    col.handle.setAttribute('transform', `translate(${COL_W / 2},${yOf(value)})`);
  }

  function refresh(animate) {
    for (let i = 0; i < N; i++) {
      cols[i].winText.textContent = String(model.digits[i]);
      setHandle(cols[i], model.digits[i], animate);
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
    // betroffene Stelle zuerst, dann die Überträge der Reihe nach
    let delay = 0;
    events.forEach((e) => {
      setTimeout(() => {
        pulse(e.to);
        const fromCol = cols[e.from];
        fromCol.rack.classList.add('carry-active');
        setTimeout(() => fromCol.rack.classList.remove('carry-active'), 400);
      }, delay);
      delay += 220;
    });
  }

  // ---- Drag-Logik --------------------------------------------------------
  function svgPoint(clientX, clientY) {
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  function bindColumn(col) {
    const grab = col.grab;
    let dragging = false;
    let startY = 0;
    let startValue = 0;
    let previewAmount = 0;
    let pendingCarry = false;

    function isAdd() {
      return bodyEl.dataset.mode === 'add';
    }

    grab.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      dragging = true;
      pendingCarry = false;
      previewAmount = 0;
      startValue = model.digits[col.i];
      startY = svgPoint(e.clientX, e.clientY).y;
      grab.setPointerCapture(e.pointerId);
      col.g.classList.add('grabbing');
      setHandle(col, startValue, false); // Animation für direktes Folgen aus
    });

    grab.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const y = svgPoint(e.clientX, e.clientY).y;
      const dySteps = (y - startY) / DETENT;

      if (isAdd()) {
        // nach unten ziehen = addieren
        previewAmount = Math.max(0, Math.min(9, Math.round(dySteps)));
        pendingCarry = startValue + previewAmount > 9;
        const shownDigit = (startValue + previewAmount) % 10;
        col.winText.textContent = String(shownDigit);
        const visY = Math.min(yOf(startValue) + previewAmount * DETENT, yOf(9));
        col.handle.setAttribute('transform', `translate(${COL_W / 2},${visY})`);
      } else {
        // nach oben ziehen = subtrahieren
        previewAmount = Math.max(0, Math.min(9, Math.round(-dySteps)));
        pendingCarry = startValue - previewAmount < 0;
        const shownDigit = (startValue - previewAmount + 10) % 10;
        col.winText.textContent = String(shownDigit);
        const visY = Math.max(yOf(startValue) - previewAmount * DETENT, yOf(0));
        col.handle.setAttribute('transform', `translate(${COL_W / 2},${visY})`);
      }
      col.g.classList.toggle('carry-pending', pendingCarry);
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      col.g.classList.remove('grabbing', 'carry-pending');
      try {
        grab.releasePointerCapture(e.pointerId);
      } catch (_) {}
      commit(col.i, previewAmount, isAdd());
      previewAmount = 0;
    }

    grab.addEventListener('pointerup', endDrag);
    grab.addEventListener('pointercancel', endDrag);

    // Tastatur: Stelle fokussieren, Ziffer drücken
    grab.addEventListener('keydown', (e) => {
      if (e.key >= '0' && e.key <= '9') {
        commit(col.i, Number(e.key), isAdd());
        e.preventDefault();
      }
    });
  }

  function commit(i, amount, add) {
    if (!amount) {
      refresh(true);
      return;
    }
    const res = add ? model.add(i, amount) : model.sub(i, amount);
    const chain = add ? res.carries : res.borrows;
    if ((add && res.overflow) || (!add && res.underflow)) {
      flashError();
    }
    refresh(true);
    if (chain.length) animateChain(chain);
  }

  function flashError() {
    deviceEl.classList.add('error');
    setTimeout(() => deviceEl.classList.remove('error'), 400);
  }

  model.on(() => {});

  // ---- Bedienelemente ----------------------------------------------------
  const flipBtn = document.getElementById('flipBtn');
  const clearBtn = document.getElementById('clearBtn');
  const transToggle = document.getElementById('transparentToggle');
  const helpBtn = document.getElementById('helpBtn');
  const helpDialog = document.getElementById('helpDialog');
  const modeBadge = document.getElementById('modeBadge');

  let flipping = false;
  flipBtn.addEventListener('click', () => {
    if (flipping) return;
    flipping = true;
    deviceEl.classList.add('flipping');
    // In der Mitte der Flip-Animation den Modus umschalten (Text nie spiegeln)
    setTimeout(() => {
      const next = bodyEl.dataset.mode === 'add' ? 'sub' : 'add';
      bodyEl.dataset.mode = next;
      modeBadge.textContent = next === 'add' ? 'Addition' : 'Subtraktion';
    }, 250);
    setTimeout(() => {
      deviceEl.classList.remove('flipping');
      flipping = false;
    }, 500);
  });

  clearBtn.addEventListener('click', () => {
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
