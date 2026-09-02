(function () {
  const state = {
    answered: new Map(),
    totalQuestions: 0
  };

  const fmt = (value, digits = 3) => Number(value).toFixed(digits);
  const near = (a, b, tol = 0.015) => Math.abs(a - b) <= tol;

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function updateProgress() {
    const total = state.totalQuestions || document.querySelectorAll("[data-question]").length;
    const correct = [...state.answered.values()].filter(Boolean).length;
    const answered = state.answered.size;
    const pct = total ? Math.round((correct / total) * 100) : 0;
    setText("scoreCount", `${correct}/${total}`);
    setText("answeredCount", `${answered} respondidas`);
    const fill = document.getElementById("scoreFill");
    if (fill) fill.style.width = `${pct}%`;

    const profile = document.getElementById("profileLabel");
    const profileText = document.getElementById("profileText");
    if (!profile || !profileText) return;
    if (answered < Math.max(5, Math.floor(total * 0.45))) {
      profile.textContent = "En construcción";
      profileText.textContent = "Responde varias preguntas y revisa las simulaciones para obtener un perfil útil.";
    } else if (pct >= 80) {
      profile.textContent = "Dominas";
      profileText.textContent = "Tu lectura de áreas, masas y formas es consistente. En el repaso final, concéntrate en justificar con símbolos.";
    } else if (pct >= 55) {
      profile.textContent = "Repasa";
      profileText.textContent = "La base está apareciendo. Vuelve a los bloques donde confundiste altura con probabilidad o independencia con disyunción.";
    } else {
      profile.textContent = "Alerta conceptual";
      profileText.textContent = "Conviene rehacer el recorrido con lápiz y papel: define primero Ω, X y la regla de probabilidad antes de calcular.";
    }
  }

  function initQuizzes() {
    const questions = document.querySelectorAll("[data-question]");
    state.totalQuestions = questions.length;
    questions.forEach((card) => {
      card.addEventListener("change", (event) => {
        const input = event.target;
        if (!input.matches("input[type='radio']")) return;
        const correct = input.value === card.dataset.answer;
        state.answered.set(card.dataset.question, correct);
        const feedback = card.querySelector(".feedback");
        if (feedback) {
          feedback.textContent = correct ? card.dataset.ok : card.dataset.hint;
          feedback.className = `feedback ${correct ? "ok" : "warn"}`;
        }
        updateProgress();
      });
    });
    updateProgress();
  }

  function svgEl(name, attrs = {}) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
    return el;
  }

  function clearSvg(svg) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
  }

  function line(svg, x1, y1, x2, y2, attrs = {}) {
    svg.appendChild(svgEl("line", { x1, y1, x2, y2, ...attrs }));
  }

  function text(svg, x, y, content, attrs = {}) {
    const node = svgEl("text", { x, y, ...attrs });
    node.textContent = content;
    svg.appendChild(node);
  }

  function pathFromPoints(points) {
    return points.map((p, index) => `${index ? "L" : "M"}${fmt(p[0], 1)},${fmt(p[1], 1)}`).join(" ");
  }

  function drawTriangle() {
    const base = Number(document.getElementById("triBase").value);
    const height = Number(document.getElementById("triHeight").value);
    const area = base * height / 2;
    setText("triBaseValue", fmt(base, 1));
    setText("triHeightValue", fmt(height, 2));
    setText("triArea", fmt(area, 3));
    setText("triValidity", near(area, 1) ? "válida" : "no válida");
    setText("triFix", fmt(2 / base, 3));

    const svg = document.getElementById("triangleChart");
    clearSvg(svg);
    const w = 520, h = 300, pad = 38;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const x0 = pad, x1 = w - pad, y0 = h - pad;
    const top = pad + (1 - height / 1.5) * 120;
    line(svg, pad, y0, w - pad / 2, y0, { stroke: "#52606f", "stroke-width": 1.5 });
    line(svg, pad, y0, pad, pad, { stroke: "#52606f", "stroke-width": 1.5 });
    const poly = svgEl("polygon", {
      points: `${x0},${y0} ${(x0 + x1) / 2},${top} ${x1},${y0}`,
      fill: near(area, 1) ? "rgba(22,137,135,0.28)" : "rgba(201,111,45,0.26)",
      stroke: near(area, 1) ? "#168987" : "#c96f2d",
      "stroke-width": 3
    });
    svg.appendChild(poly);
    text(svg, w / 2 - 54, top - 10, `Área = ${fmt(area, 3)}`, { fill: "#18222f", "font-size": 18, "font-weight": 800 });
    text(svg, x0, y0 + 24, "0", { fill: "#52606f", "font-size": 13 });
    text(svg, x1 - 38, y0 + 24, `base ${fmt(base, 1)}`, { fill: "#52606f", "font-size": 13 });
  }

  function drawDiscrete() {
    const values = [...document.querySelectorAll(".prob-input")].map((input) => Math.max(0, Number(input.value)));
    const total = values.reduce((a, b) => a + b, 0);
    const valid = near(total, 1, 0.005) && values.every((v) => v >= 0);
    setText("massTotal", fmt(total, 3));
    setText("massValidity", valid ? "válida" : "revisar");

    const svg = document.getElementById("barChart");
    clearSvg(svg);
    const w = 620, h = 300, pad = 38;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    line(svg, pad, h - pad, w - pad / 2, h - pad, { stroke: "#52606f", "stroke-width": 1.5 });
    line(svg, pad, h - pad, pad, pad, { stroke: "#52606f", "stroke-width": 1.5 });
    const maxVal = Math.max(0.25, ...values);
    const barW = (w - pad * 2) / values.length - 10;
    values.forEach((v, i) => {
      const x = pad + i * ((w - pad * 2) / values.length) + 6;
      const barH = (v / maxVal) * (h - pad * 2);
      const y = h - pad - barH;
      svg.appendChild(svgEl("rect", {
        x, y, width: barW, height: barH,
        fill: valid ? "#24577a" : "#c96f2d",
        rx: 4
      }));
      text(svg, x + barW / 2 - 5, h - 12, String(i + 1), { fill: "#52606f", "font-size": 12 });
      text(svg, x + 2, y - 6, fmt(v, 2), { fill: "#18222f", "font-size": 11, "font-weight": 700 });
    });
  }

  function curvePoints(xs, ys, w, h, pad, minX, maxX, maxY) {
    return xs.map((x, i) => {
      const px = pad + ((x - minX) / (maxX - minX)) * (w - 2 * pad);
      const py = h - pad - (ys[i] / maxY) * (h - 2 * pad);
      return [px, py];
    });
  }

  function drawShapeCompare() {
    const spread = Number(document.getElementById("spread").value);
    const skew = Number(document.getElementById("skew").value);
    setText("spreadValue", fmt(spread, 1));
    setText("skewValue", fmt(skew, 1));
    const xs = Array.from({ length: 181 }, (_, i) => 5 + i * (40 / 180));
    const yMetro = xs.map((x) => Math.exp(-0.5 * Math.pow((x - 25) / 4, 2)));
    const yBrt = xs.map((x) => {
      const leftSd = spread * 0.8;
      const rightSd = spread * (1 + skew / 5);
      const sd = x < 25 ? leftSd : rightSd;
      return Math.exp(-0.5 * Math.pow((x - 25) / sd, 2));
    });
    const maxY = Math.max(...yMetro, ...yBrt);
    const svg = document.getElementById("shapeChart");
    clearSvg(svg);
    const w = 620, h = 330, pad = 42;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    line(svg, pad, h - pad, w - pad, h - pad, { stroke: "#52606f", "stroke-width": 1.5 });
    line(svg, pad, h - pad, pad, pad, { stroke: "#52606f", "stroke-width": 1.5 });
    const metroPts = curvePoints(xs, yMetro, w, h, pad, 5, 45, maxY);
    const brtPts = curvePoints(xs, yBrt, w, h, pad, 5, 45, maxY);
    svg.appendChild(svgEl("path", { d: pathFromPoints(brtPts), fill: "none", stroke: "#c96f2d", "stroke-width": 4 }));
    svg.appendChild(svgEl("path", { d: pathFromPoints(metroPts), fill: "none", stroke: "#168987", "stroke-width": 4 }));
    const meanX = pad + ((25 - 5) / 40) * (w - 2 * pad);
    line(svg, meanX, h - pad, meanX, pad, { stroke: "#18222f", "stroke-width": 1.5, "stroke-dasharray": "5 5" });
    text(svg, meanX + 8, pad + 18, "media común: 25", { fill: "#18222f", "font-size": 14, "font-weight": 800 });
    text(svg, w - 210, pad + 28, "BRT: más dispersa/asimétrica", { fill: "#c96f2d", "font-size": 13, "font-weight": 800 });
    text(svg, w - 210, pad + 48, "Metro: simétrica", { fill: "#168987", "font-size": 13, "font-weight": 800 });
  }

  function drawVDensity() {
    const a = Number(document.getElementById("vLimit").value);
    const c = Number(document.getElementById("vConstant").value);
    const area = c * a * a;
    setText("vLimitValue", fmt(a, 1));
    setText("vConstantValue", fmt(c, 3));
    setText("vArea", fmt(area, 3));
    setText("vCorrectC", fmt(1 / (a * a), 3));
    setText("vMean", "0 por simetría");
    const svg = document.getElementById("vChart");
    clearSvg(svg);
    const w = 620, h = 315, pad = 42;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    line(svg, pad, h - pad, w - pad, h - pad, { stroke: "#52606f", "stroke-width": 1.5 });
    line(svg, w / 2, h - pad, w / 2, pad, { stroke: "#52606f", "stroke-width": 1.2 });
    const left = pad + ((-a + 5) / 10) * (w - 2 * pad);
    const right = pad + ((a + 5) / 10) * (w - 2 * pad);
    const mid = w / 2;
    const peakY = h - pad - Math.min(1, c * a / 0.55) * (h - 2 * pad);
    svg.appendChild(svgEl("polygon", {
      points: `${left},${peakY} ${mid},${h - pad} ${right},${peakY}`,
      fill: near(area, 1) ? "rgba(107,90,166,0.22)" : "rgba(201,111,45,0.24)",
      stroke: near(area, 1) ? "#6b5aa6" : "#c96f2d",
      "stroke-width": 4
    }));
    text(svg, mid + 8, h - pad - 8, "E[X] = 0", { fill: "#18222f", "font-size": 14, "font-weight": 800 });
    text(svg, left - 6, h - 12, `-${fmt(a, 1)}`, { fill: "#52606f", "font-size": 12 });
    text(svg, right - 10, h - 12, fmt(a, 1), { fill: "#52606f", "font-size": 12 });
  }

  function drawTriangularPiece() {
    const leftH = Number(document.getElementById("leftHeight").value);
    const rightH = Number(document.getElementById("rightHeight").value);
    const rawArea = (2 * leftH / 2) + (3 * rightH / 2);
    const k = 1 / rawArea;
    setText("leftHeightValue", fmt(leftH, 1));
    setText("rightHeightValue", fmt(rightH, 1));
    setText("rawArea", fmt(rawArea, 3));
    setText("kValue", fmt(k, 3));
    setText("rightProb", fmt((3 * rightH / 2) * k, 3));
    const svg = document.getElementById("pieceChart");
    clearSvg(svg);
    const w = 620, h = 315, pad = 42;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const sx = (x) => pad + ((x + 2.5) / 6) * (w - 2 * pad);
    const sy = (y) => h - pad - (y / 3.6) * (h - 2 * pad);
    line(svg, pad, h - pad, w - pad, h - pad, { stroke: "#52606f", "stroke-width": 1.5 });
    line(svg, sx(0), h - pad, sx(0), pad, { stroke: "#52606f", "stroke-width": 1.1, "stroke-dasharray": "4 5" });
    svg.appendChild(svgEl("polygon", {
      points: `${sx(-2)},${h - pad} ${sx(0)},${sy(leftH)} ${sx(0)},${h - pad}`,
      fill: "rgba(36,87,122,0.20)",
      stroke: "#24577a",
      "stroke-width": 3
    }));
    svg.appendChild(svgEl("polygon", {
      points: `${sx(0)},${sy(rightH)} ${sx(3)},${h - pad} ${sx(0)},${h - pad}`,
      fill: "rgba(22,137,135,0.22)",
      stroke: "#168987",
      "stroke-width": 3
    }));
    text(svg, sx(0) + 8, sy(rightH) + 18, "moda", { fill: "#168987", "font-size": 14, "font-weight": 900 });
    text(svg, sx(-2) - 8, h - 12, "-2", { fill: "#52606f", "font-size": 12 });
    text(svg, sx(3) - 6, h - 12, "3", { fill: "#52606f", "font-size": 12 });
  }

  function calcEventProb(values, eventSet) {
    return eventSet.reduce((acc, x) => acc + values[x - 1], 0);
  }

  function drawIndependence() {
    const values = [...document.querySelectorAll(".prob-input")].map((input) => Math.max(0, Number(input.value)));
    const pairs = {
      AB: { first: [2, 4, 6, 8], second: [5, 6, 7, 8], label: "A par y B norte" },
      AC: { first: [2, 4, 6, 8], second: [1, 2], label: "A par y C prioritario" },
      DE: { first: [1, 2, 3, 4], second: [1, 2], label: "D incluye E" }
    };
    const selected = pairs[document.getElementById("eventPair").value];
    const p1 = calcEventProb(values, selected.first);
    const p2 = calcEventProb(values, selected.second);
    const intersection = selected.first.filter((x) => selected.second.includes(x));
    const pInt = calcEventProb(values, intersection);
    const conditional = p2 > 0 ? pInt / p2 : NaN;
    const independent = Number.isFinite(conditional) && near(conditional, p1, 0.015);
    setText("pFirst", fmt(p1, 3));
    setText("pSecond", fmt(p2, 3));
    setText("pIntersection", fmt(pInt, 3));
    setText("pConditional", Number.isFinite(conditional) ? fmt(conditional, 3) : "indefinida");
    setText("independenceResult", independent ? "independientes" : "dependientes");
    setText("eventPairLabel", selected.label);

    const svg = document.getElementById("vennChart");
    clearSvg(svg);
    const w = 560, h = 260;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.appendChild(svgEl("rect", { x: 28, y: 24, width: 504, height: 204, fill: "#fff", stroke: "#d9e0e5", "stroke-width": 2, rx: 8 }));
    const overlap = pInt > 0 ? 64 : 0;
    svg.appendChild(svgEl("circle", { cx: 230, cy: 126, r: 76, fill: "rgba(36,87,122,0.24)", stroke: "#24577a", "stroke-width": 3 }));
    svg.appendChild(svgEl("circle", { cx: 230 + 106 - overlap, cy: 126, r: 76, fill: "rgba(201,111,45,0.24)", stroke: "#c96f2d", "stroke-width": 3 }));
    text(svg, 42, 48, "Ω", { fill: "#52606f", "font-size": 18, "font-weight": 900 });
    text(svg, 192, 128, "1er evento", { fill: "#24577a", "font-size": 14, "font-weight": 900 });
    text(svg, 300 - overlap, 128, "2do evento", { fill: "#8a3b23", "font-size": 14, "font-weight": 900 });
  }

  function initNumericAnswers() {
    document.querySelectorAll("[data-numeric-answer]").forEach((box) => {
      const input = box.querySelector("input");
      const button = box.querySelector("button");
      const feedback = box.querySelector(".feedback");
      button.addEventListener("click", () => {
        const expected = Number(box.dataset.numericAnswer);
        const tolerance = Number(box.dataset.tolerance || 0.01);
        const value = Number(input.value);
        const correct = Math.abs(value - expected) <= tolerance;
        state.answered.set(box.dataset.question, correct);
        feedback.textContent = correct ? box.dataset.ok : box.dataset.hint;
        feedback.className = `feedback ${correct ? "ok" : "warn"}`;
        updateProgress();
      });
    });
  }

  function initControls() {
    if (!document.getElementById("triangleChart")) return;
    ["triBase", "triHeight"].forEach((id) => document.getElementById(id).addEventListener("input", drawTriangle));
    document.querySelectorAll(".prob-input").forEach((input) => input.addEventListener("input", () => {
      drawDiscrete();
      drawIndependence();
    }));
    document.getElementById("resetMass").addEventListener("click", () => {
      const defaults = window.LAB_R_DATA?.defaultDiscrete || [0.10, 0.15, 0.20, 0.05, 0.15, 0.10, 0.15, 0.10];
      document.querySelectorAll(".prob-input").forEach((input, i) => input.value = defaults[i].toFixed(2));
      drawDiscrete();
      drawIndependence();
    });
    ["spread", "skew"].forEach((id) => document.getElementById(id).addEventListener("input", drawShapeCompare));
    ["vLimit", "vConstant"].forEach((id) => document.getElementById(id).addEventListener("input", drawVDensity));
    ["leftHeight", "rightHeight"].forEach((id) => document.getElementById(id).addEventListener("input", drawTriangularPiece));
    document.getElementById("eventPair").addEventListener("change", drawIndependence);
    drawTriangle();
    drawDiscrete();
    drawShapeCompare();
    drawVDensity();
    drawTriangularPiece();
    drawIndependence();
  }

  document.addEventListener("DOMContentLoaded", () => {
    initQuizzes();
    initNumericAnswers();
    initControls();
  });
})();
