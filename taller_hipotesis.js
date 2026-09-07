(function () {
  if (!window.Stat2Dist) return;
  const { normalPdf, normalCdf, normalQ, clamp } = window.Stat2Dist;
  const fmt = (x, d = 3) => Number.isFinite(x) ? Number(x).toFixed(d) : "no finito";
  const TAU = Math.PI * 2;
  let ksSample = [];

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

  function fillUnder(svg, xs, pdf, sx, sy, y0, pred, color) {
    const pts = xs.filter(pred).map((x) => [sx(x), sy(pdf(x))]);
    if (pts.length < 2) return;
    const area = [[pts[0][0], y0], ...pts, [pts[pts.length - 1][0], y0]];
    svg.appendChild(svgEl("path", { d: path(area) + " Z", fill: color }));
  }

  function logGamma(z) {
    const p = [676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
    let x = 0.99999999999980993;
    const zz = z - 1;
    for (let i = 0; i < p.length; i++) x += p[i] / (zz + i + 1);
    const t = zz + p.length - 0.5;
    return 0.5 * Math.log(TAU) + (zz + 0.5) * Math.log(t) - t + Math.log(x);
  }

  function gammaFn(z) {
    return Math.exp(logGamma(z));
  }

  function tPdf(x, df) {
    return gammaFn((df + 1) / 2) / (Math.sqrt(df * Math.PI) * gammaFn(df / 2)) * (1 + x * x / df) ** (-(df + 1) / 2);
  }

  function integrate(fn, lo, hi, steps = 500) {
    if (hi <= lo) return 0;
    const n = steps + (steps % 2);
    const h = (hi - lo) / n;
    let sum = fn(lo) + fn(hi);
    for (let i = 1; i < n; i++) sum += fn(lo + i * h) * (i % 2 ? 4 : 2);
    return sum * h / 3;
  }

  function tCdf(x, df) {
    if (x < -12) return 0;
    if (x > 12) return 1;
    return clamp(integrate((z) => tPdf(z, df), -12, x, 700), 0, 1);
  }

  function chiPdf(x, df) {
    if (x <= 0) return 0;
    return x ** (df / 2 - 1) * Math.exp(-x / 2) / (2 ** (df / 2) * gammaFn(df / 2));
  }

  function chiUpperApprox(x, df) {
    if (x <= 0) return 1;
    const z = ((x / df) ** (1 / 3) - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df));
    return clamp(1 - normalCdf(z), 0, 1);
  }

  function sampleNormal(mu = 0, sd = 1) {
    const u1 = Math.max(Number.EPSILON, Math.random());
    const u2 = Math.random();
    return mu + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(TAU * u2);
  }

  function sampleExp(rate) {
    return -Math.log(1 - Math.random()) / rate;
  }

  function mean(xs) {
    return xs.reduce((s, x) => s + x, 0) / xs.length;
  }

  function sd(xs) {
    const m = mean(xs);
    return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
  }

  function pForZ(z, tail) {
    if (tail === "right") return 1 - normalCdf(z);
    if (tail === "left") return normalCdf(z);
    return 2 * (1 - normalCdf(Math.abs(z)));
  }

  function pForT(t, df, tail) {
    if (tail === "right") return 1 - tCdf(t, df);
    if (tail === "left") return tCdf(t, df);
    return 2 * (1 - tCdf(Math.abs(t), df));
  }

  function drawNormalTest(svg, stat, alpha, tail, labels = {}) {
    clear(svg);
    const w = 760, h = 360, pad = 46;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const lo = -4, hi = 4;
    const xs = Array.from({ length: 360 }, (_, i) => lo + (hi - lo) * i / 359);
    const sx = (x) => pad + (x - lo) / (hi - lo) * (w - 2 * pad);
    const sy = (y) => h - pad - y / normalPdf(0) * (h - 2 * pad);
    line(svg, pad, h - pad, w - pad, h - pad, { stroke: "#52606f", "stroke-width": 1.4 });
    const crit = tail === "two" ? normalQ(1 - alpha / 2) : normalQ(1 - alpha);
    if (tail === "left") fillUnder(svg, xs, normalPdf, sx, sy, h - pad, (x) => x <= -crit, "rgba(185,71,71,0.22)");
    else if (tail === "right") fillUnder(svg, xs, normalPdf, sx, sy, h - pad, (x) => x >= crit, "rgba(185,71,71,0.22)");
    else {
      fillUnder(svg, xs, normalPdf, sx, sy, h - pad, (x) => x <= -crit, "rgba(185,71,71,0.22)");
      fillUnder(svg, xs, normalPdf, sx, sy, h - pad, (x) => x >= crit, "rgba(185,71,71,0.22)");
    }
    if (tail === "left") fillUnder(svg, xs, normalPdf, sx, sy, h - pad, (x) => x <= stat, "rgba(201,111,45,0.28)");
    else if (tail === "right") fillUnder(svg, xs, normalPdf, sx, sy, h - pad, (x) => x >= stat, "rgba(201,111,45,0.28)");
    else fillUnder(svg, xs, normalPdf, sx, sy, h - pad, (x) => Math.abs(x) >= Math.abs(stat), "rgba(201,111,45,0.28)");
    svg.appendChild(svgEl("path", { d: path(xs.map((x) => [sx(x), sy(normalPdf(x))])), fill: "none", stroke: "#24577a", "stroke-width": 4 }));
    if (tail !== "left") line(svg, sx(crit), h - pad, sx(crit), pad, { stroke: "#b94747", "stroke-width": 2, "stroke-dasharray": "5 5" });
    if (tail !== "right") line(svg, sx(-crit), h - pad, sx(-crit), pad, { stroke: "#b94747", "stroke-width": 2, "stroke-dasharray": "5 5" });
    line(svg, sx(clamp(stat, lo, hi)), h - pad, sx(clamp(stat, lo, hi)), pad, { stroke: "#c96f2d", "stroke-width": 4 });
    text(svg, sx(clamp(stat, lo, hi)) + 8, pad + 20, labels.stat || "observado", { fill: "#c96f2d", "font-size": 14, "font-weight": 900 });
  }

  function drawPValueLab() {
    const tail = document.getElementById("tailSelect").value;
    const alpha = Number(document.getElementById("alphaSlider").value);
    const stat = Number(document.getElementById("statSlider").value);
    const p = pForZ(stat, tail);
    const crit = tail === "two" ? normalQ(1 - alpha / 2) : normalQ(1 - alpha);
    document.getElementById("alphaValue").textContent = fmt(alpha, 2);
    document.getElementById("statValue").textContent = fmt(stat, 2);
    document.getElementById("pValueText").textContent = fmt(p, 4);
    document.getElementById("criticalText").textContent = tail === "two" ? `|z| > ${fmt(crit, 2)}` : `${tail === "left" ? "z <" : "z >"} ${fmt(tail === "left" ? -crit : crit, 2)}`;
    document.getElementById("decisionText").textContent = p < alpha ? "rechazar H0" : "no rechazar H0";
    drawNormalTest(document.getElementById("pValuePlot"), stat, alpha, tail, { stat: "z observado" });
  }

  function drawSelector() {
    const target = document.getElementById("targetType").value;
    const design = document.getElementById("sampleCount").value;
    const sigma = document.getElementById("sigmaSelect").value;
    const shape = document.getElementById("normalitySelect").value;
    const recs = {
      mean: sigma === "known" ? ["Z para una media", "Usa z = (x-barra - mu0)/(sigma/sqrt(n)). Requiere sigma conocida y normalidad plausible o n grande."] : ["t de una muestra", "Usa t = (x-barra - mu0)/(s/sqrt(n)). Es la opción central cuando sigma es desconocida."],
      proportion: ["Z para una proporción", "Usa p0 para el error estándar: sqrt(p0(1-p0)/n). Revisa np0 y n(1-p0) suficientemente grandes."],
      variance: ["Chi-cuadrado para una varianza", "Usa chi2 = (n-1)s2/sigma0^2. Supuesto crítico: población aproximadamente normal."],
      two_means: design === "paired" ? ["t pareada", "Convierte cada par en una diferencia y aplica t de una muestra sobre esas diferencias."] : ["t de Welch para dos medias", "Contrasta mu1 - mu2 sin asumir varianzas iguales. Si la forma falla gravemente, considera alternativa robusta o remuestreo."],
      two_props: ["Z para dos proporciones", "Compara p1 - p2. En H0 de igualdad suele usarse proporción combinada para el error estándar."],
      independence: ["Chi-cuadrado de independencia", "Usa tabla de contingencia, esperados y suma (O-E)^2/E. La conclusión es asociación entre categorías."],
      fit: ["Kolmogorov-Smirnov", "Compara la ECDF con una CDF teórica. No rechazar no prueba que la distribución sea verdadera."]
    };
    const [name, body] = recs[target];
    const warning = shape === "small_skew" ? " Alerta: con muestra pequeña y asimetría fuerte, revisa gráficos, transformaciones, pruebas robustas o simulación." : "";
    document.getElementById("testRecommendation").innerHTML = `<strong>${name}</strong><p>${body}${warning}</p>`;
    drawTestMap(document.getElementById("testMapPlot"), name);
  }

  function drawTestMap(svg, active) {
    clear(svg);
    const w = 760, h = 360;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const nodes = [
      ["Media", 70, 52, "t de una muestra"],
      ["Proporción", 290, 52, "Z para una proporción"],
      ["Varianza", 530, 52, "Chi-cuadrado para una varianza"],
      ["Dos medias", 70, 185, "t de Welch para dos medias"],
      ["Dos proporciones", 290, 185, "Z para dos proporciones"],
      ["Categorías", 530, 185, "Chi-cuadrado de independencia"],
      ["Forma completa", 290, 295, "Kolmogorov-Smirnov"]
    ];
    nodes.forEach(([label, x, y, test]) => {
      const selected = active === test || active === "t pareada" && label === "Dos medias" || active === "Z para una media" && label === "Media";
      svg.appendChild(svgEl("rect", { x, y, width: 160, height: 70, rx: 8, fill: selected ? "#fff0e5" : "#f4f7f8", stroke: selected ? "#c96f2d" : "#d9e0e5", "stroke-width": selected ? 3 : 1.5 }));
      text(svg, x + 14, y + 26, label, { fill: "#18222f", "font-size": 14, "font-weight": 900 });
      text(svg, x + 14, y + 50, test, { fill: "#24577a", "font-size": 12, "font-weight": 700 });
    });
  }

  function drawPropTest() {
    const n = Math.max(1, Number(document.getElementById("propN").value));
    const x = clamp(Number(document.getElementById("propX").value), 0, n);
    const p0 = clamp(Number(document.getElementById("propP0").value), 0.001, 0.999);
    const tail = document.getElementById("propAlt").value;
    const phat = x / n;
    const se = Math.sqrt(p0 * (1 - p0) / n);
    const z = (phat - p0) / se;
    const p = pForZ(z, tail);
    document.getElementById("propPhat").textContent = fmt(phat, 3);
    document.getElementById("propZ").textContent = fmt(z, 3);
    document.getElementById("propP").textContent = fmt(p, 4);
    document.getElementById("propDecision").textContent = `Bajo H0, p-hat se centra en ${fmt(p0, 2)}. Con alpha=0.05: ${p < 0.05 ? "rechazar H0" : "no rechazar H0"}.`;
    drawScaledNormal(document.getElementById("propPlot"), p0, se, phat, tail, "p-hat");
  }

  function drawScaledNormal(svg, mu, sd, observed, tail, label) {
    clear(svg);
    const w = 760, h = 360, pad = 48;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const lo = mu - 4 * sd, hi = mu + 4 * sd;
    const xs = Array.from({ length: 260 }, (_, i) => lo + (hi - lo) * i / 259);
    const pdf = (x) => normalPdf(x, mu, sd);
    const sx = (x) => pad + (x - lo) / (hi - lo) * (w - 2 * pad);
    const sy = (y) => h - pad - y / pdf(mu) * (h - 2 * pad);
    line(svg, pad, h - pad, w - pad, h - pad, { stroke: "#52606f", "stroke-width": 1.4 });
    if (tail === "right") fillUnder(svg, xs, pdf, sx, sy, h - pad, (x) => x >= observed, "rgba(201,111,45,0.28)");
    else if (tail === "left") fillUnder(svg, xs, pdf, sx, sy, h - pad, (x) => x <= observed, "rgba(201,111,45,0.28)");
    else fillUnder(svg, xs, pdf, sx, sy, h - pad, (x) => Math.abs(x - mu) >= Math.abs(observed - mu), "rgba(201,111,45,0.28)");
    svg.appendChild(svgEl("path", { d: path(xs.map((x) => [sx(x), sy(pdf(x))])), fill: "none", stroke: "#24577a", "stroke-width": 4 }));
    line(svg, sx(mu), h - pad, sx(mu), pad, { stroke: "#168987", "stroke-width": 2, "stroke-dasharray": "5 5" });
    line(svg, sx(clamp(observed, lo, hi)), h - pad, sx(clamp(observed, lo, hi)), pad, { stroke: "#c96f2d", "stroke-width": 4 });
    text(svg, sx(mu) + 8, pad + 20, "H0", { fill: "#168987", "font-size": 14, "font-weight": 900 });
    text(svg, sx(clamp(observed, lo, hi)) + 8, pad + 42, label, { fill: "#c96f2d", "font-size": 14, "font-weight": 900 });
  }

  function drawMeanTest() {
    const n = Math.max(3, Number(document.getElementById("meanN").value));
    const xbar = Number(document.getElementById("meanXbar").value);
    const s = Math.max(0.001, Number(document.getElementById("meanS").value));
    const mu0 = Number(document.getElementById("meanMu0").value);
    const df = n - 1;
    const t = (xbar - mu0) / (s / Math.sqrt(n));
    const p = pForT(Math.abs(t), df, "two");
    document.getElementById("meanDf").textContent = String(df);
    document.getElementById("meanT").textContent = fmt(t, 3);
    document.getElementById("meanP").textContent = fmt(p, 4);
    drawTPdf(document.getElementById("meanPlot"), df, t);
  }

  function drawTPdf(svg, df, observed) {
    clear(svg);
    const w = 760, h = 360, pad = 48;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const lo = -5, hi = 5;
    const xs = Array.from({ length: 300 }, (_, i) => lo + (hi - lo) * i / 299);
    const sx = (x) => pad + (x - lo) / (hi - lo) * (w - 2 * pad);
    const sy = (y) => h - pad - y / normalPdf(0) * (h - 2 * pad);
    line(svg, pad, h - pad, w - pad, h - pad, { stroke: "#52606f", "stroke-width": 1.4 });
    fillUnder(svg, xs, (x) => tPdf(x, df), sx, sy, h - pad, (x) => Math.abs(x) >= Math.abs(observed), "rgba(201,111,45,0.25)");
    svg.appendChild(svgEl("path", { d: path(xs.map((x) => [sx(x), sy(tPdf(x, df))])), fill: "none", stroke: "#24577a", "stroke-width": 4 }));
    svg.appendChild(svgEl("path", { d: path(xs.map((x) => [sx(x), sy(normalPdf(x))])), fill: "none", stroke: "#6b5aa6", "stroke-width": 3, "stroke-dasharray": "7 7" }));
    line(svg, sx(clamp(observed, lo, hi)), h - pad, sx(clamp(observed, lo, hi)), pad, { stroke: "#c96f2d", "stroke-width": 4 });
    text(svg, pad + 10, pad + 16, `t con gl=${df}`, { fill: "#24577a", "font-size": 14, "font-weight": 900 });
    text(svg, pad + 10, pad + 38, "normal punteada", { fill: "#6b5aa6", "font-size": 13, "font-weight": 800 });
  }

  function drawWelch() {
    const m1 = Number(document.getElementById("m1").value), m2 = Number(document.getElementById("m2").value);
    const s1 = Math.max(0.001, Number(document.getElementById("s1").value)), s2 = Math.max(0.001, Number(document.getElementById("s2").value));
    const n1 = Math.max(2, Number(document.getElementById("n1").value)), n2 = Math.max(2, Number(document.getElementById("n2").value));
    const diff = m1 - m2;
    const se = Math.sqrt(s1 * s1 / n1 + s2 * s2 / n2);
    const t = diff / se;
    const df = (s1 * s1 / n1 + s2 * s2 / n2) ** 2 / ((s1 * s1 / n1) ** 2 / (n1 - 1) + (s2 * s2 / n2) ** 2 / (n2 - 1));
    const p = pForT(Math.abs(t), df, "two");
    document.getElementById("diffMean").textContent = fmt(diff, 2);
    document.getElementById("welchT").textContent = fmt(t, 3);
    document.getElementById("welchP").textContent = fmt(p, 4);
    document.getElementById("welchDecision").textContent = `gl aproximados = ${fmt(df, 1)}. Con alpha=0.05: ${p < 0.05 ? "evidencia de diferencia" : "no hay evidencia suficiente de diferencia"}.`;
    drawScaledNormal(document.getElementById("twoMeanPlot"), 0, se, diff, "two", "diferencia");
  }

  function drawChiIndependence() {
    const cells = Array.from(document.querySelectorAll(".chiInput")).map((el) => Math.max(0, Number(el.value)));
    const table = [[cells[0], cells[1]], [cells[2], cells[3]], [cells[4], cells[5]]];
    const rowSums = table.map((r) => r[0] + r[1]);
    const colSums = [table[0][0] + table[1][0] + table[2][0], table[0][1] + table[1][1] + table[2][1]];
    const total = rowSums.reduce((a, b) => a + b, 0);
    let stat = 0;
    const expected = table.map((row, i) => row.map((_, j) => total ? rowSums[i] * colSums[j] / total : 0));
    table.forEach((row, i) => row.forEach((obs, j) => {
      if (expected[i][j] > 0) stat += (obs - expected[i][j]) ** 2 / expected[i][j];
    }));
    const df = 2;
    const p = chiUpperApprox(stat, df);
    document.getElementById("chiStat").textContent = fmt(stat, 3);
    document.getElementById("chiDf").textContent = String(df);
    document.getElementById("chiP").textContent = fmt(p, 4);
    document.getElementById("chiDecision").textContent = p < 0.05 ? "Hay evidencia de asociación entre las categorías, no de causalidad." : "No hay evidencia suficiente contra independencia en esta tabla.";
    drawChiHeat(document.getElementById("chiPlot"), table, expected);
  }

  function drawChiHeat(svg, observed, expected) {
    clear(svg);
    const w = 760, h = 360, pad = 58;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const labels = ["Bajo", "Medio", "Alto"];
    const cols = ["Votó", "No votó"];
    const contrib = observed.map((row, i) => row.map((obs, j) => expected[i][j] ? (obs - expected[i][j]) ** 2 / expected[i][j] : 0));
    const maxC = Math.max(...contrib.flat(), 0.001);
    const cw = 220, ch = 72;
    cols.forEach((c, j) => text(svg, pad + j * cw + 70, 38, c, { fill: "#24577a", "font-size": 14, "font-weight": 900 }));
    labels.forEach((r, i) => text(svg, 14, pad + i * ch + 42, r, { fill: "#18222f", "font-size": 14, "font-weight": 900 }));
    observed.forEach((row, i) => row.forEach((obs, j) => {
      const intensity = contrib[i][j] / maxC;
      const fill = `rgba(201,111,45,${0.18 + 0.55 * intensity})`;
      svg.appendChild(svgEl("rect", { x: pad + j * cw, y: pad + i * ch, width: cw - 10, height: ch - 10, rx: 8, fill, stroke: "#d9e0e5" }));
      text(svg, pad + j * cw + 16, pad + i * ch + 28, `O=${fmt(obs, 0)}  E=${fmt(expected[i][j], 1)}`, { fill: "#18222f", "font-size": 14, "font-weight": 800 });
      text(svg, pad + j * cw + 16, pad + i * ch + 51, `aporte=${fmt(contrib[i][j], 2)}`, { fill: "#24577a", "font-size": 12, "font-weight": 800 });
    }));
  }

  function refreshKsSample() {
    const n = Math.max(10, Math.min(150, Number(document.getElementById("ksN").value)));
    const scenario = document.getElementById("ksScenario").value;
    ksSample = Array.from({ length: n }, () => {
      if (scenario === "skew") return sampleExp(1) - 1;
      if (scenario === "bimodal") return Math.random() < 0.5 ? sampleNormal(-1.4, 0.55) : sampleNormal(1.4, 0.55);
      return sampleNormal(0, 1);
    }).sort((a, b) => a - b);
    drawKs();
  }

  function drawKs() {
    if (!ksSample.length) refreshKsSample();
    const n = ksSample.length;
    const m = mean(ksSample), ss = sd(ksSample) || 1;
    let d = 0;
    ksSample.forEach((x, i) => {
      const theor = normalCdf(x, m, ss);
      d = Math.max(d, Math.abs((i + 1) / n - theor), Math.abs(i / n - theor));
    });
    const crit = 1.36 / Math.sqrt(n);
    document.getElementById("ksD").textContent = fmt(d, 3);
    document.getElementById("ksCrit").textContent = fmt(crit, 3);
    document.getElementById("ksDecision").textContent = d > crit ? "rechazar" : "no rechazar";
    const svg = document.getElementById("ksPlot");
    clear(svg);
    const w = 760, h = 360, pad = 48;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const lo = Math.min(-3.5, ksSample[0] - 0.3), hi = Math.max(3.5, ksSample[n - 1] + 0.3);
    const sx = (x) => pad + (x - lo) / (hi - lo) * (w - 2 * pad);
    const sy = (y) => h - pad - y * (h - 2 * pad);
    line(svg, pad, h - pad, w - pad, h - pad, { stroke: "#52606f", "stroke-width": 1.4 });
    line(svg, pad, h - pad, pad, pad, { stroke: "#52606f", "stroke-width": 1.4 });
    const xs = Array.from({ length: 240 }, (_, i) => lo + (hi - lo) * i / 239);
    svg.appendChild(svgEl("path", { d: path(xs.map((x) => [sx(x), sy(normalCdf(x, m, ss))])), fill: "none", stroke: "#6b5aa6", "stroke-width": 4 }));
    const steps = [[sx(lo), sy(0)]];
    ksSample.forEach((x, i) => {
      steps.push([sx(x), sy(i / n)], [sx(x), sy((i + 1) / n)], [sx(i < n - 1 ? ksSample[i + 1] : hi), sy((i + 1) / n)]);
    });
    svg.appendChild(svgEl("path", { d: path(steps), fill: "none", stroke: "#24577a", "stroke-width": 3 }));
    text(svg, pad + 10, pad + 18, "azul: ECDF", { fill: "#24577a", "font-size": 13, "font-weight": 900 });
    text(svg, pad + 10, pad + 39, "violeta: CDF normal ajustada", { fill: "#6b5aa6", "font-size": 13, "font-weight": 900 });
  }

  function drawVarianceTest() {
    const n = Math.max(3, Number(document.getElementById("varN").value));
    const s = Math.max(0.001, Number(document.getElementById("varS").value));
    const sigma0 = Math.max(0.001, Number(document.getElementById("varSigma0").value));
    const df = n - 1;
    const chi = df * s * s / (sigma0 * sigma0);
    const p = Math.min(1, 2 * Math.min(chiUpperApprox(chi, df), 1 - chiUpperApprox(chi, df)));
    const warning = document.getElementById("varShapeWarning").value === "skew" ? " Alerta: la asimetría o los atípicos debilitan esta prueba." : "";
    document.getElementById("varChi").textContent = fmt(chi, 3);
    document.getElementById("varDf").textContent = String(df);
    document.getElementById("varP").textContent = fmt(p, 4);
    document.getElementById("varDecision").textContent = `${p < 0.05 ? "Evidencia contra sigma=sigma0." : "No hay evidencia suficiente contra sigma=sigma0."}${warning}`;
    drawChiCurve(document.getElementById("variancePlot"), df, chi);
  }

  function drawChiCurve(svg, df, observed) {
    clear(svg);
    const w = 760, h = 360, pad = 48;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const hi = Math.max(df + 5 * Math.sqrt(2 * df), observed * 1.15, 4);
    const xs = Array.from({ length: 260 }, (_, i) => hi * i / 259);
    const maxY = Math.max(...xs.map((x) => chiPdf(x, df)), 0.001);
    const sx = (x) => pad + x / hi * (w - 2 * pad);
    const sy = (y) => h - pad - y / maxY * (h - 2 * pad);
    line(svg, pad, h - pad, w - pad, h - pad, { stroke: "#52606f", "stroke-width": 1.4 });
    fillUnder(svg, xs, (x) => chiPdf(x, df), sx, sy, h - pad, (x) => x >= observed, "rgba(201,111,45,0.26)");
    svg.appendChild(svgEl("path", { d: path(xs.map((x) => [sx(x), sy(chiPdf(x, df))])), fill: "none", stroke: "#24577a", "stroke-width": 4 }));
    line(svg, sx(clamp(observed, 0, hi)), h - pad, sx(clamp(observed, 0, hi)), pad, { stroke: "#c96f2d", "stroke-width": 4 });
    text(svg, sx(clamp(observed, 0, hi)) + 8, pad + 18, "observado", { fill: "#c96f2d", "font-size": 14, "font-weight": 900 });
  }

  function drawPower() {
    const alpha = Number(document.getElementById("powerAlpha").value);
    const effect = Number(document.getElementById("powerEffect").value);
    const n = Number(document.getElementById("powerN").value);
    const se = 1 / Math.sqrt(n);
    const crit = normalQ(1 - alpha);
    const threshold = crit * se;
    const beta = normalCdf(threshold, effect, se);
    const power = 1 - beta;
    document.getElementById("powerAlphaText").textContent = fmt(alpha, 2);
    document.getElementById("powerEffectText").textContent = fmt(effect, 2);
    document.getElementById("powerNText").textContent = String(n);
    document.getElementById("alphaMetric").textContent = fmt(alpha, 3);
    document.getElementById("betaMetric").textContent = fmt(beta, 3);
    document.getElementById("powerMetric").textContent = fmt(power, 3);
    const svg = document.getElementById("powerPlot");
    clear(svg);
    const w = 760, h = 360, pad = 48;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const lo = Math.min(-4 * se, effect - 4 * se), hi = Math.max(4 * se, effect + 4 * se);
    const xs = Array.from({ length: 320 }, (_, i) => lo + (hi - lo) * i / 319);
    const nullPdf = (x) => normalPdf(x, 0, se);
    const altPdf = (x) => normalPdf(x, effect, se);
    const maxY = Math.max(nullPdf(0), altPdf(effect));
    const sx = (x) => pad + (x - lo) / (hi - lo) * (w - 2 * pad);
    const sy = (y) => h - pad - y / maxY * (h - 2 * pad);
    line(svg, pad, h - pad, w - pad, h - pad, { stroke: "#52606f", "stroke-width": 1.4 });
    fillUnder(svg, xs, nullPdf, sx, sy, h - pad, (x) => x >= threshold, "rgba(185,71,71,0.24)");
    fillUnder(svg, xs, altPdf, sx, sy, h - pad, (x) => x >= threshold, "rgba(22,137,135,0.24)");
    svg.appendChild(svgEl("path", { d: path(xs.map((x) => [sx(x), sy(nullPdf(x))])), fill: "none", stroke: "#24577a", "stroke-width": 4 }));
    svg.appendChild(svgEl("path", { d: path(xs.map((x) => [sx(x), sy(altPdf(x))])), fill: "none", stroke: "#168987", "stroke-width": 4 }));
    line(svg, sx(threshold), h - pad, sx(threshold), pad, { stroke: "#b94747", "stroke-width": 3, "stroke-dasharray": "5 5" });
    text(svg, sx(0) + 8, pad + 18, "H0", { fill: "#24577a", "font-size": 14, "font-weight": 900 });
    text(svg, sx(effect) + 8, pad + 40, "H1 real", { fill: "#168987", "font-size": 14, "font-weight": 900 });
  }

  function initChoiceQuiz() {
    document.querySelectorAll("[data-hyp-answer]").forEach((panel) => {
      panel.querySelectorAll(".choice-button").forEach((button) => {
        button.addEventListener("click", () => {
          const ok = button.dataset.choice === panel.dataset.hypAnswer;
          panel.querySelectorAll(".choice-button").forEach((b) => b.classList.remove("selected-ok", "selected-warn"));
          button.classList.add(ok ? "selected-ok" : "selected-warn");
          const feedback = panel.querySelector(".feedback");
          feedback.className = `feedback ${ok ? "ok" : "warn"}`;
          feedback.textContent = ok ? panel.dataset.ok : panel.dataset.hint;
        });
      });
    });
  }

  function wire(ids, fn, event = "input") {
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener(event, fn);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!document.getElementById("hypothesisWorkshop")) return;
    wire(["tailSelect", "alphaSlider", "statSlider"], drawPValueLab);
    wire(["targetType", "sampleCount", "sigmaSelect", "normalitySelect"], drawSelector, "change");
    wire(["propN", "propX", "propP0", "propAlt"], drawPropTest);
    wire(["meanN", "meanXbar", "meanS", "meanMu0"], drawMeanTest);
    wire(["m1", "s1", "n1", "m2", "s2", "n2"], drawWelch);
    document.querySelectorAll(".chiInput").forEach((el) => el.addEventListener("input", drawChiIndependence));
    wire(["ksScenario", "ksN"], refreshKsSample, "change");
    document.getElementById("ksRefresh").addEventListener("click", refreshKsSample);
    wire(["varN", "varS", "varSigma0", "varShapeWarning"], drawVarianceTest);
    wire(["powerAlpha", "powerEffect", "powerN"], drawPower);
    initChoiceQuiz();
    drawPValueLab();
    drawSelector();
    drawPropTest();
    drawMeanTest();
    drawWelch();
    drawChiIndependence();
    refreshKsSample();
    drawVarianceTest();
    drawPower();
  });
})();
