(function () {
  if (!window.Stat2Dist) return;
  const { registry, clamp } = window.Stat2Dist;
  const fmt = (x, d = 3) => Number.isFinite(x) ? Number(x).toFixed(d) : "no finita";
  const ids = ["bernoulli", "binomial", "poisson", "uniform_discrete", "geometric", "uniform", "normal", "exponential", "gamma", "beta", "student_t", "weibull"];

  function svgEl(name, attrs = {}) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  }

  function clear(svg) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
  }

  function text(svg, x, y, value, attrs = {}) {
    const el = svgEl("text", { x, y, ...attrs });
    el.textContent = value;
    svg.appendChild(el);
  }

  function line(svg, x1, y1, x2, y2, attrs = {}) {
    svg.appendChild(svgEl("line", { x1, y1, x2, y2, ...attrs }));
  }

  function path(points) {
    return points.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  }

  function paramsFor(prefix) {
    const id = document.getElementById(`${prefix}Select`).value;
    const dist = registry[id];
    const out = {};
    dist.params.forEach((p) => {
      const value = Number(document.getElementById(`${prefix}_${p.key}`).value);
      out[p.key] = p.step >= 1 ? Math.round(value) : value;
    });
    if (id === "uniform" && out.b <= out.a) out.b = out.a + 0.5;
    return out;
  }

  function renderParamControls(prefix, id) {
    const box = document.getElementById(`${prefix}Params`);
    const dist = registry[id];
    box.innerHTML = "";
    dist.params.forEach((p) => {
      const row = document.createElement("div");
      row.className = "control-row";
      row.innerHTML = `<label for="${prefix}_${p.key}">${p.label}<span id="${prefix}_${p.key}_value"></span></label><input id="${prefix}_${p.key}" type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${dist.defaults[p.key]}">`;
      box.appendChild(row);
      const input = row.querySelector("input");
      input.addEventListener("input", () => {
        document.getElementById(`${prefix}_${p.key}_value`).textContent = input.value;
        drawAll();
      });
      document.getElementById(`${prefix}_${p.key}_value`).textContent = input.value;
    });
  }

  function domainFor(dist, params) {
    if (dist.kind === "discrete") {
      const xs = dist.xs(params);
      return [Math.min(...xs) - 0.75, Math.max(...xs) + 0.75];
    }
    return dist.domain(params);
  }

  function comparisonDomainFor(id, dist) {
    const fixed = {
      bernoulli: [-0.5, 1.5],
      binomial: [-0.75, 60.75],
      poisson: [-0.75, 42.75],
      uniform_discrete: [0.25, 20.75],
      geometric: [0.25, 30.75],
      uniform: [-10.5, 20.5],
      normal: [-26, 26],
      exponential: [0, 32],
      gamma: [0, 90],
      beta: [0, 1],
      student_t: [-6, 6],
      weibull: [0, 34]
    };
    if (fixed[id]) return fixed[id];
    return dist.kind === "continuous" ? dist.domain(dist.defaults) : domainFor(dist, dist.defaults);
  }

  function valuesFor(dist, params, domainOverride = null) {
    if (dist.kind === "discrete") {
      const xs = dist.xs(params);
      return xs.map((x) => ({ x, y: dist.pmf(x, params), cdf: dist.cdf(x, params) }));
    }
    const [lo, hi] = domainOverride || domainFor(dist, params);
    return Array.from({ length: 220 }, (_, i) => {
      const x = lo + (hi - lo) * i / 219;
      return { x, y: dist.pdf(x, params), cdf: clamp(dist.cdf(x, params), 0, 1) };
    });
  }

  function drawDistribution(svg, dist, params, markerX = null, domainOverride = null) {
    clear(svg);
    const w = 720, h = 360, pad = 44;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const vals = valuesFor(dist, params, domainOverride);
    const [lo, hi] = domainOverride || domainFor(dist, params);
    const maxY = Math.max(...vals.map((d) => d.y), 0.001);
    const sx = (x) => pad + (x - lo) / (hi - lo) * (w - 2 * pad);
    const sy = (y) => h - pad - y / maxY * (h - 2 * pad);
    line(svg, pad, h - pad, w - pad, h - pad, { stroke: "#52606f", "stroke-width": 1.4 });
    line(svg, pad, h - pad, pad, pad, { stroke: "#52606f", "stroke-width": 1.4 });
    if (dist.kind === "discrete") {
      vals.forEach((d) => {
        line(svg, sx(d.x), h - pad, sx(d.x), sy(d.y), { stroke: "#24577a", "stroke-width": 3 });
        svg.appendChild(svgEl("circle", { cx: sx(d.x), cy: sy(d.y), r: 5, fill: "#c96f2d" }));
      });
    } else {
      const pts = vals.map((d) => [sx(d.x), sy(d.y)]);
      const area = [[sx(lo), h - pad], ...pts, [sx(hi), h - pad]];
      svg.appendChild(svgEl("path", { d: path(area) + " Z", fill: "rgba(22,137,135,0.16)" }));
      svg.appendChild(svgEl("path", { d: path(pts), fill: "none", stroke: "#24577a", "stroke-width": 4 }));
    }
    if (markerX !== null) {
      const mx = sx(markerX);
      line(svg, mx, h - pad, mx, pad, { stroke: "#c96f2d", "stroke-width": 3 });
    }
    text(svg, pad, h - 12, fmt(lo, 1), { fill: "#52606f", "font-size": 12 });
    text(svg, w - pad - 36, h - 12, fmt(hi, 1), { fill: "#52606f", "font-size": 12 });
  }

  function drawCdf(svg, dist, params, markerX) {
    clear(svg);
    const w = 720, h = 360, pad = 44;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const vals = valuesFor(dist, params);
    const [lo, hi] = domainFor(dist, params);
    const sx = (x) => pad + (x - lo) / (hi - lo) * (w - 2 * pad);
    const sy = (y) => h - pad - y * (h - 2 * pad);
    line(svg, pad, h - pad, w - pad, h - pad, { stroke: "#52606f", "stroke-width": 1.4 });
    line(svg, pad, h - pad, pad, pad, { stroke: "#52606f", "stroke-width": 1.4 });
    line(svg, pad, sy(1), w - pad, sy(1), { stroke: "#d9e0e5", "stroke-width": 1.2, "stroke-dasharray": "5 6" });
    let pts;
    if (dist.kind === "discrete") {
      pts = [];
      vals.forEach((d, i) => {
        const prev = i === 0 ? 0 : vals[i - 1].cdf;
        pts.push([sx(d.x - 0.5), sy(prev)], [sx(d.x - 0.5), sy(d.cdf)], [sx(d.x + 0.5), sy(d.cdf)]);
      });
    } else {
      pts = vals.map((d) => [sx(d.x), sy(d.cdf)]);
    }
    svg.appendChild(svgEl("path", { d: path(pts), fill: "none", stroke: "#6b5aa6", "stroke-width": 4 }));
    const f = clamp(dist.cdf(markerX, params), 0, 1);
    line(svg, sx(markerX), h - pad, sx(markerX), sy(f), { stroke: "#c96f2d", "stroke-width": 3 });
    svg.appendChild(svgEl("circle", { cx: sx(markerX), cy: sy(f), r: 6, fill: "#c96f2d" }));
    text(svg, pad + 8, sy(1) - 8, "1", { fill: "#52606f", "font-size": 12 });
    text(svg, sx(markerX) + 8, sy(f) - 10, `F(x)=${fmt(f, 3)}`, { fill: "#18222f", "font-size": 14, "font-weight": 800 });
  }

  function drawShapeLab() {
    const id = document.getElementById("shapeSelect").value;
    const dist = registry[id];
    const params = paramsFor("shape");
    drawDistribution(document.getElementById("shapePlot"), dist, params, null, comparisonDomainFor(id, dist));
    document.getElementById("shapeName").textContent = dist.label;
    document.getElementById("shapeUse").textContent = dist.use;
    document.getElementById("shapeSupport").textContent = dist.supportText;
    document.getElementById("shapeMean").textContent = fmt(dist.mean(params), 3);
    document.getElementById("shapeVar").textContent = fmt(dist.variance(params), 3);
  }

  function drawCdfBuilder(reset = false) {
    const id = document.getElementById("cdfSelect").value;
    const dist = registry[id];
    const params = paramsFor("cdf");
    const [lo, hi] = domainFor(dist, params);
    const slider = document.getElementById("cdfX");
    if (reset || Number(slider.min) !== lo || Number(slider.max) !== hi) {
      slider.min = lo;
      slider.max = hi;
      slider.step = dist.kind === "discrete" ? 1 : (hi - lo) / 300;
      slider.value = lo;
    }
    const x = Number(slider.value);
    drawDistribution(document.getElementById("cdfPdfPlot"), dist, params, x);
    drawCdf(document.getElementById("cdfPlot"), dist, params, x);
    document.getElementById("cdfValue").textContent = `x = ${fmt(x, 3)}, F(x) = ${fmt(clamp(dist.cdf(x, params), 0, 1), 3)}`;
  }

  function drawAll() {
    drawShapeLab();
    drawCdfBuilder(false);
  }

  function moveCdfFromPointer(event) {
    const slider = document.getElementById("cdfX");
    const rect = event.currentTarget.getBoundingClientRect();
    const p = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    slider.value = Number(slider.min) + p * (Number(slider.max) - Number(slider.min));
    drawCdfBuilder(false);
  }

  function populateSelect(selectId, selected, allowed = ids) {
    const select = document.getElementById(selectId);
    select.innerHTML = "";
    allowed.forEach((id) => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = registry[id].label;
      if (id === selected) opt.selected = true;
      select.appendChild(opt);
    });
  }

  function initChoiceQuiz() {
    document.querySelectorAll("[data-scenario-answer]").forEach((panel) => {
      panel.querySelectorAll(".choice-button").forEach((button) => {
        button.addEventListener("click", () => {
          const ok = button.dataset.choice === panel.dataset.scenarioAnswer;
          panel.querySelectorAll(".choice-button").forEach((b) => b.classList.remove("selected-ok", "selected-warn"));
          button.classList.add(ok ? "selected-ok" : "selected-warn");
          const feedback = panel.querySelector(".feedback");
          feedback.className = `feedback ${ok ? "ok" : "warn"}`;
          feedback.textContent = ok ? panel.dataset.ok : panel.dataset.hint;
        });
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!document.getElementById("distributionWorkshop")) return;
    populateSelect("shapeSelect", "beta");
    populateSelect("cdfSelect", "normal", ["normal", "uniform", "beta", "exponential", "poisson", "binomial"]);
    renderParamControls("shape", "beta");
    renderParamControls("cdf", "normal");
    document.getElementById("shapeSelect").addEventListener("change", (e) => {
      renderParamControls("shape", e.target.value);
      drawShapeLab();
    });
    document.getElementById("cdfSelect").addEventListener("change", (e) => {
      renderParamControls("cdf", e.target.value);
      drawCdfBuilder(true);
    });
    document.getElementById("cdfX").addEventListener("input", () => drawCdfBuilder(false));
    document.getElementById("cdfX").addEventListener("change", () => drawCdfBuilder(false));
    const cdfPdfPlot = document.getElementById("cdfPdfPlot");
    cdfPdfPlot.addEventListener("pointerdown", (event) => {
      moveCdfFromPointer(event);
      cdfPdfPlot.setPointerCapture(event.pointerId);
    });
    cdfPdfPlot.addEventListener("pointermove", (event) => {
      if (event.buttons) moveCdfFromPointer(event);
    });
    initChoiceQuiz();
    drawShapeLab();
    drawCdfBuilder(true);
  });
})();
