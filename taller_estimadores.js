(function () {
  if (!window.Stat2Dist) return;
  const { registry, normalPdf, normalCdf, normalQ, tCritical95, clamp } = window.Stat2Dist;
  const allowed = ["normal", "uniform", "exponential", "gamma", "beta", "poisson", "binomial"];
  const fmt = (x, d = 3) => Number.isFinite(x) ? Number(x).toFixed(d) : "no finita";
  const state = { sample: [] };

  function svgEl(name, attrs = {}) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  }

  function clear(svg) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
  }

  function line(svg, x1, y1, x2, y2, attrs = {}) {
    svg.appendChild(svgEl("line", { x1, y1, x2, y2, ...attrs }));
  }

  function text(svg, x, y, value, attrs = {}) {
    const el = svgEl("text", { x, y, ...attrs });
    el.textContent = value;
    svg.appendChild(el);
  }

  function path(points) {
    return points.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  }

  function populateSelect() {
    const select = document.getElementById("estDist");
    select.innerHTML = "";
    allowed.forEach((id) => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = registry[id].label;
      if (id === "normal") opt.selected = true;
      select.appendChild(opt);
    });
  }

  function renderParamControls(id) {
    const box = document.getElementById("estParams");
    const dist = registry[id];
    box.innerHTML = "";
    dist.params.forEach((p) => {
      const row = document.createElement("div");
      row.className = "control-row";
      row.innerHTML = `<label for="est_${p.key}">${p.label}<span id="est_${p.key}_value"></span></label><input id="est_${p.key}" type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${dist.defaults[p.key]}">`;
      box.appendChild(row);
      const input = row.querySelector("input");
      input.addEventListener("input", () => {
        document.getElementById(`est_${p.key}_value`).textContent = input.value;
        if (state.sample.length) generateSample(false);
        else drawEmpty();
      });
      document.getElementById(`est_${p.key}_value`).textContent = input.value;
    });
  }

  function params() {
    const id = document.getElementById("estDist").value;
    const dist = registry[id];
    const out = {};
    dist.params.forEach((p) => {
      const value = Number(document.getElementById(`est_${p.key}`).value);
      out[p.key] = p.step >= 1 ? Math.round(value) : value;
    });
    if (id === "uniform" && out.b <= out.a) out.b = out.a + 0.5;
    return out;
  }

  function domainFor(dist, p) {
    if (dist.kind === "discrete") {
      const xs = dist.xs(p);
      return [Math.min(...xs) - 0.75, Math.max(...xs) + 0.75];
    }
    return dist.domain(p);
  }

  function valuesFor(dist, p) {
    if (dist.kind === "discrete") {
      return dist.xs(p).map((x) => ({ x, y: dist.pmf(x, p) }));
    }
    const [lo, hi] = domainFor(dist, p);
    return Array.from({ length: 220 }, (_, i) => {
      const x = lo + (hi - lo) * i / 219;
      return { x, y: dist.pdf(x, p) };
    });
  }

  function mean(xs) {
    return xs.reduce((s, x) => s + x, 0) / xs.length;
  }

  function sampleSd(xs) {
    if (xs.length < 2) return 0;
    const m = mean(xs);
    return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
  }

  function ciFor(xs, mu, variance) {
    const n = xs.length;
    const xbar = mean(xs);
    const known = document.getElementById("knownSigma").checked;
    const se = known ? Math.sqrt(variance / n) : sampleSd(xs) / Math.sqrt(n);
    const crit = known ? normalQ(0.975) : tCritical95(n - 1);
    const lo = xbar - crit * se;
    const hi = xbar + crit * se;
    return { xbar, se, crit, lo, hi, covers: lo <= mu && mu <= hi, known };
  }

  function drawPopulation(svg, dist, p, xs) {
    clear(svg);
    const w = 720, h = 360, pad = 44;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const vals = valuesFor(dist, p);
    const [lo, hi] = domainFor(dist, p);
    const maxY = Math.max(...vals.map((d) => d.y), 0.001);
    const sx = (x) => pad + (x - lo) / (hi - lo) * (w - 2 * pad);
    const sy = (y) => h - pad - y / maxY * (h - 2 * pad);
    line(svg, pad, h - pad, w - pad, h - pad, { stroke: "#52606f", "stroke-width": 1.4 });
    line(svg, pad, h - pad, pad, pad, { stroke: "#52606f", "stroke-width": 1.4 });
    if (dist.kind === "discrete") {
      vals.forEach((d) => {
        line(svg, sx(d.x), h - pad, sx(d.x), sy(d.y), { stroke: "#24577a", "stroke-width": 3 });
        svg.appendChild(svgEl("circle", { cx: sx(d.x), cy: sy(d.y), r: 5, fill: "#24577a" }));
      });
    } else {
      const pts = vals.map((d) => [sx(d.x), sy(d.y)]);
      svg.appendChild(svgEl("path", { d: path(pts), fill: "none", stroke: "#24577a", "stroke-width": 4 }));
    }
    xs.forEach((x, i) => {
      const cy = h - pad - 10 - (i % 5) * 8;
      svg.appendChild(svgEl("circle", { cx: sx(clamp(x, lo, hi)), cy, r: 4.6, fill: "#c96f2d", opacity: 0.88 }));
    });
    const mu = dist.mean(p);
    line(svg, sx(clamp(mu, lo, hi)), h - pad, sx(clamp(mu, lo, hi)), pad, { stroke: "#168987", "stroke-width": 2, "stroke-dasharray": "5 5" });
    text(svg, pad, h - 12, fmt(lo, 1), { fill: "#52606f", "font-size": 12 });
    text(svg, w - pad - 36, h - 12, fmt(hi, 1), { fill: "#52606f", "font-size": 12 });
    text(svg, sx(clamp(mu, lo, hi)) + 8, pad + 16, "mu", { fill: "#168987", "font-size": 15, "font-weight": 900 });
  }

  function drawEstimator(svg, dist, p, xs) {
    clear(svg);
    const n = xs.length;
    const mu = dist.mean(p);
    const variance = dist.variance(p);
    const ci = ciFor(xs, mu, variance);
    const sdXbar = Math.sqrt(variance / n);
    const lo = Math.min(mu - 4 * sdXbar, ci.lo - sdXbar, ci.xbar - 3 * sdXbar);
    const hi = Math.max(mu + 4 * sdXbar, ci.hi + sdXbar, ci.xbar + 3 * sdXbar);
    const w = 720, h = 360, pad = 44;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const sx = (x) => pad + (x - lo) / (hi - lo) * (w - 2 * pad);
    const maxY = normalPdf(mu, mu, sdXbar);
    const sy = (y) => h - pad - y / maxY * (h - 2 * pad);
    const pts = Array.from({ length: 220 }, (_, i) => {
      const x = lo + (hi - lo) * i / 219;
      return [sx(x), sy(normalPdf(x, mu, sdXbar))];
    });
    line(svg, pad, h - pad, w - pad, h - pad, { stroke: "#52606f", "stroke-width": 1.4 });
    line(svg, pad, h - pad, pad, pad, { stroke: "#52606f", "stroke-width": 1.4 });
    svg.appendChild(svgEl("path", { d: path(pts), fill: "none", stroke: "#6b5aa6", "stroke-width": 4 }));
    line(svg, sx(mu), h - pad, sx(mu), pad, { stroke: "#168987", "stroke-width": 2, "stroke-dasharray": "5 5" });
    line(svg, sx(ci.lo), h - pad - 28, sx(ci.hi), h - pad - 28, { stroke: ci.covers ? "#168987" : "#b94747", "stroke-width": 7, "stroke-linecap": "round" });
    svg.appendChild(svgEl("circle", { cx: sx(ci.xbar), cy: h - pad - 28, r: 7, fill: "#c96f2d" }));
    text(svg, sx(mu) + 8, pad + 16, "mu real", { fill: "#168987", "font-size": 14, "font-weight": 900 });
    text(svg, sx(ci.xbar) + 8, h - pad - 42, "xbar", { fill: "#c96f2d", "font-size": 14, "font-weight": 900 });
    text(svg, pad, h - 12, fmt(lo, 2), { fill: "#52606f", "font-size": 12 });
    text(svg, w - pad - 44, h - 12, fmt(hi, 2), { fill: "#52606f", "font-size": 12 });
    return ci;
  }

  function updateMetrics(dist, p, ci) {
    document.getElementById("metricMu").textContent = fmt(dist.mean(p), 3);
    document.getElementById("metricVar").textContent = fmt(dist.variance(p), 3);
    document.getElementById("metricXbar").textContent = fmt(ci.xbar, 3);
    document.getElementById("metricSe").textContent = fmt(ci.se, 3);
    document.getElementById("metricCi").textContent = `[${fmt(ci.lo, 3)}, ${fmt(ci.hi, 3)}]`;
    document.getElementById("metricCovers").textContent = ci.covers ? "sí cubre mu" : "no cubre mu";
    document.getElementById("metricCrit").textContent = `${ci.known ? "z" : "t"} = ${fmt(ci.crit, 3)}`;
  }

  function generateSample(newDraw = true) {
    const id = document.getElementById("estDist").value;
    const dist = registry[id];
    const p = params();
    const n = Number(document.getElementById("sampleN").value);
    if (newDraw || state.sample.length !== n) state.sample = Array.from({ length: n }, () => dist.sample(p));
    drawPopulation(document.getElementById("populationPlot"), dist, p, state.sample);
    const ci = drawEstimator(document.getElementById("estimatorPlot"), dist, p, state.sample);
    updateMetrics(dist, p, ci);
    drawHypothesis();
  }

  function drawEmpty() {
    generateSample(true);
  }

  function simulateMany(reps) {
    const id = document.getElementById("estDist").value;
    const dist = registry[id];
    const p = params();
    const n = Number(document.getElementById("sampleN").value);
    const mu = dist.mean(p);
    const variance = dist.variance(p);
    const means = [];
    let covered = 0;
    for (let r = 0; r < reps; r++) {
      const xs = Array.from({ length: n }, () => dist.sample(p));
      const ci = ciFor(xs, mu, variance);
      means.push(ci.xbar);
      if (ci.covers) covered += 1;
    }
    drawMeansHistogram(document.getElementById("manyMeansPlot"), means, mu, Math.sqrt(variance / n));
    document.getElementById("coverageResult").textContent = `${covered}/${reps} intervalos cubrieron mu (${fmt(covered / reps, 3)})`;
  }

  function drawMeansHistogram(svg, means, mu, sd) {
    clear(svg);
    const w = 720, h = 340, pad = 44;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const lo = Math.min(...means, mu - 4 * sd);
    const hi = Math.max(...means, mu + 4 * sd);
    const bins = 24;
    const counts = Array(bins).fill(0);
    means.forEach((m) => {
      const idx = clamp(Math.floor((m - lo) / (hi - lo) * bins), 0, bins - 1);
      counts[idx] += 1;
    });
    const maxCount = Math.max(...counts, 1);
    const sx = (x) => pad + (x - lo) / (hi - lo) * (w - 2 * pad);
    const sy = (y) => h - pad - y / maxCount * (h - 2 * pad);
    line(svg, pad, h - pad, w - pad, h - pad, { stroke: "#52606f", "stroke-width": 1.4 });
    counts.forEach((c, i) => {
      const x0 = lo + i * (hi - lo) / bins;
      const x1 = lo + (i + 1) * (hi - lo) / bins;
      svg.appendChild(svgEl("rect", { x: sx(x0), y: sy(c), width: Math.max(1, sx(x1) - sx(x0) - 2), height: h - pad - sy(c), fill: "rgba(36,87,122,0.58)" }));
    });
    const densityScale = maxCount / normalPdf(mu, mu, sd) * 0.92;
    const pts = Array.from({ length: 180 }, (_, i) => {
      const x = lo + (hi - lo) * i / 179;
      return [sx(x), sy(normalPdf(x, mu, sd) * densityScale)];
    });
    svg.appendChild(svgEl("path", { d: path(pts), fill: "none", stroke: "#c96f2d", "stroke-width": 4 }));
    line(svg, sx(mu), h - pad, sx(mu), pad, { stroke: "#168987", "stroke-width": 2, "stroke-dasharray": "5 5" });
  }

  function drawEmpiricalRule() {
    const svg = document.getElementById("empiricalRulePlot");
    if (!svg) return;
    clear(svg);
    const w = 720, h = 280, pad = 40;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const lo = -3.5, hi = 3.5;
    const sx = (x) => pad + (x - lo) / (hi - lo) * (w - 2 * pad);
    const sy = (y) => h - pad - y / normalPdf(0) * (h - 2 * pad);
    const pts = Array.from({ length: 240 }, (_, i) => {
      const x = lo + (hi - lo) * i / 239;
      return [sx(x), sy(normalPdf(x))];
    });
    line(svg, pad, h - pad, w - pad, h - pad, { stroke: "#52606f", "stroke-width": 1.4 });
    svg.appendChild(svgEl("path", { d: path(pts), fill: "none", stroke: "#24577a", "stroke-width": 4 }));
    [-3, -2, -1, 0, 1, 2, 3].forEach((z) => {
      line(svg, sx(z), h - pad, sx(z), z === 0 ? pad : h - pad - 80, { stroke: z === 0 ? "#18222f" : "#d9e0e5", "stroke-width": 1.4 });
      text(svg, sx(z) - 10, h - 12, String(z), { fill: "#52606f", "font-size": 12 });
    });
    text(svg, sx(-1) + 22, h - 70, "68%", { fill: "#168987", "font-size": 15, "font-weight": 900 });
    text(svg, sx(-2) + 46, h - 42, "95%", { fill: "#c96f2d", "font-size": 15, "font-weight": 900 });
    text(svg, sx(-3) + 70, h - 16, "99%", { fill: "#6b5aa6", "font-size": 15, "font-weight": 900 });
  }

  function drawHypothesis() {
    if (!state.sample.length) return;
    const id = document.getElementById("estDist").value;
    const dist = registry[id];
    const p = params();
    const mu0 = Number(document.getElementById("mu0").value);
    const xs = state.sample;
    const n = xs.length;
    const xbar = mean(xs);
    const se = document.getElementById("knownSigma").checked ? Math.sqrt(dist.variance(p) / n) : sampleSd(xs) / Math.sqrt(n);
    const z = (xbar - mu0) / se;
    const pValue = 2 * (1 - normalCdf(Math.abs(z)));
    const critical = 1.96;
    const decision = Math.abs(z) > critical ? "rechazar H0 al 5%" : "no rechazar H0 al 5%";
    document.getElementById("hypothesisResult").textContent = `z/t observado aproximado = ${fmt(z, 3)}; p-valor bilateral ≈ ${fmt(pValue, 3)}; decisión: ${decision}.`;
    const svg = document.getElementById("hypothesisPlot");
    clear(svg);
    const w = 720, h = 260, pad = 42;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const lo = -4, hi = 4;
    const sx = (x) => pad + (x - lo) / (hi - lo) * (w - 2 * pad);
    const sy = (y) => h - pad - y / normalPdf(0) * (h - 2 * pad);
    const pts = Array.from({ length: 200 }, (_, i) => {
      const x = lo + (hi - lo) * i / 199;
      return [sx(x), sy(normalPdf(x))];
    });
    line(svg, pad, h - pad, w - pad, h - pad, { stroke: "#52606f", "stroke-width": 1.4 });
    svg.appendChild(svgEl("path", { d: path(pts), fill: "none", stroke: "#24577a", "stroke-width": 4 }));
    [-critical, critical].forEach((c) => line(svg, sx(c), h - pad, sx(c), pad, { stroke: "#b94747", "stroke-width": 2, "stroke-dasharray": "5 5" }));
    line(svg, sx(clamp(z, lo, hi)), h - pad, sx(clamp(z, lo, hi)), pad, { stroke: "#c96f2d", "stroke-width": 4 });
    text(svg, sx(-critical) - 30, pad + 16, "-1.96", { fill: "#b94747", "font-size": 12, "font-weight": 900 });
    text(svg, sx(critical) + 6, pad + 16, "1.96", { fill: "#b94747", "font-size": 12, "font-weight": 900 });
  }

  function drawTargets() {
    document.querySelectorAll(".target-card svg").forEach((svg) => {
      clear(svg);
      svg.setAttribute("viewBox", "0 0 180 150");
      [58, 38, 18].forEach((r) => svg.appendChild(svgEl("circle", { cx: 90, cy: 68, r, fill: "none", stroke: "#18222f", "stroke-width": 2 })));
      svg.appendChild(svgEl("circle", { cx: 90, cy: 68, r: 5, fill: "#c96f2d" }));
      const mode = svg.dataset.target;
      const points = {
        good: [[88, 66], [93, 70], [85, 72], [92, 63], [89, 69]],
        biased_precise: [[125, 38], [128, 41], [122, 35], [130, 37], [126, 43]],
        unbiased_noisy: [[60, 35], [120, 102], [70, 112], [105, 30], [91, 65]],
        bad: [[130, 32], [145, 78], [120, 116], [150, 100], [116, 45]]
      }[mode];
      points.forEach(([x, y]) => {
        line(svg, x - 5, y - 5, x + 5, y + 5, { stroke: "#168987", "stroke-width": 2 });
        line(svg, x + 5, y - 5, x - 5, y + 5, { stroke: "#168987", "stroke-width": 2 });
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!document.getElementById("estimatorsWorkshop")) return;
    populateSelect();
    renderParamControls("normal");
    document.getElementById("estDist").addEventListener("change", (e) => {
      renderParamControls(e.target.value);
      generateSample(true);
    });
    document.getElementById("sampleN").addEventListener("input", (e) => {
      document.getElementById("sampleNValue").textContent = e.target.value;
      generateSample(true);
    });
    document.getElementById("knownSigma").addEventListener("change", () => generateSample(false));
    document.getElementById("generateSample").addEventListener("click", () => generateSample(true));
    document.getElementById("simulate100").addEventListener("click", () => simulateMany(100));
    document.getElementById("simulate500").addEventListener("click", () => simulateMany(500));
    document.getElementById("mu0").addEventListener("input", drawHypothesis);
    document.getElementById("sampleNValue").textContent = document.getElementById("sampleN").value;
    drawEmpiricalRule();
    drawTargets();
    generateSample(true);
    simulateMany(100);
  });
})();
