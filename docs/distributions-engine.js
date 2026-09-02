(function () {
  const TAU = Math.PI * 2;

  function clamp(x, lo, hi) {
    return Math.max(lo, Math.min(hi, x));
  }

  function erf(x) {
    const sign = x < 0 ? -1 : 1;
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    const ax = Math.abs(x);
    const t = 1 / (1 + p * ax);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
    return sign * y;
  }

  function normalPdf(x, mu = 0, sd = 1) {
    const z = (x - mu) / sd;
    return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(TAU));
  }

  function normalCdf(x, mu = 0, sd = 1) {
    return 0.5 * (1 + erf((x - mu) / (sd * Math.SQRT2)));
  }

  function normalQ(p) {
    const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
    const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
    const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
    const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
    const plow = 0.02425;
    const phigh = 1 - plow;
    let q, r;
    if (p < plow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    if (p > phigh) {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }

  function logGamma(z) {
    const p = [
      676.5203681218851, -1259.1392167224028, 771.32342877765313,
      -176.61502916214059, 12.507343278686905, -0.13857109526572012,
      9.9843695780195716e-6, 1.5056327351493116e-7
    ];
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

  function betaFn(a, b) {
    return Math.exp(logGamma(a) + logGamma(b) - logGamma(a + b));
  }

  function choose(n, k) {
    if (k < 0 || k > n) return 0;
    return Math.exp(logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1));
  }

  function integratePdf(pdf, lo, hi, steps = 600) {
    if (hi <= lo) return 0;
    const n = steps + (steps % 2);
    const h = (hi - lo) / n;
    let sum = pdf(lo) + pdf(hi);
    for (let i = 1; i < n; i++) sum += pdf(lo + i * h) * (i % 2 ? 4 : 2);
    return Math.max(0, sum * h / 3);
  }

  function range(start, end) {
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  function sampleNormal(mu = 0, sd = 1) {
    const u1 = Math.max(Number.EPSILON, Math.random());
    const u2 = Math.random();
    return mu + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(TAU * u2);
  }

  function samplePoisson(lambda) {
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k += 1;
      p *= Math.random();
    } while (p > L);
    return k - 1;
  }

  function sampleGamma(shape, scale) {
    if (shape < 1) {
      const u = Math.random();
      return sampleGamma(shape + 1, scale) * Math.pow(u, 1 / shape);
    }
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
      let x;
      let v;
      do {
        x = sampleNormal();
        v = 1 + c * x;
      } while (v <= 0);
      v = v * v * v;
      const u = Math.random();
      if (u < 1 - 0.0331 * x ** 4) return scale * d * v;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return scale * d * v;
    }
  }

  function tCritical95(df) {
    const table = {
      1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571, 6: 2.447, 7: 2.365,
      8: 2.306, 9: 2.262, 10: 2.228, 11: 2.201, 12: 2.179, 13: 2.160, 14: 2.145,
      15: 2.131, 16: 2.120, 17: 2.110, 18: 2.101, 19: 2.093, 20: 2.086,
      21: 2.080, 22: 2.074, 23: 2.069, 24: 2.064, 25: 2.060, 26: 2.056,
      27: 2.052, 28: 2.048, 29: 2.045, 30: 2.042
    };
    if (df <= 30) return table[Math.max(1, Math.round(df))];
    const z = 1.959964;
    return z + (z ** 3 + z) / (4 * df);
  }

  const registry = {
    bernoulli: {
      label: "Bernoulli",
      kind: "discrete",
      supportText: "{0, 1}",
      defaults: { p: 0.55 },
      params: [{ key: "p", label: "Probabilidad de éxito", min: 0.05, max: 0.95, step: 0.01 }],
      xs: (p) => [0, 1],
      pmf: (x, p) => (x === 1 ? p.p : x === 0 ? 1 - p.p : 0),
      cdf: (x, p) => x < 0 ? 0 : x < 1 ? 1 - p.p : 1,
      sample: (p) => Math.random() < p.p ? 1 : 0,
      mean: (p) => p.p,
      variance: (p) => p.p * (1 - p.p),
      use: "Decisiones binarias: apoyar o no apoyar una política."
    },
    binomial: {
      label: "Binomial",
      kind: "discrete",
      supportText: "0, 1, ..., n",
      defaults: { n: 20, p: 0.45 },
      params: [
        { key: "n", label: "Número de ensayos", min: 2, max: 60, step: 1 },
        { key: "p", label: "Probabilidad de éxito", min: 0.05, max: 0.95, step: 0.01 }
      ],
      xs: (p) => range(0, Math.round(p.n)),
      pmf: (x, p) => choose(Math.round(p.n), x) * p.p ** x * (1 - p.p) ** (Math.round(p.n) - x),
      cdf: (x, p) => range(0, Math.min(Math.floor(x), Math.round(p.n))).reduce((s, k) => s + registry.binomial.pmf(k, p), 0),
      sample: (p) => range(1, Math.round(p.n)).reduce((s) => s + (Math.random() < p.p ? 1 : 0), 0),
      mean: (p) => p.n * p.p,
      variance: (p) => p.n * p.p * (1 - p.p),
      use: "Conteos de éxitos en un número fijo de hogares, encuestas o puestos."
    },
    poisson: {
      label: "Poisson",
      kind: "discrete",
      supportText: "0, 1, 2, ...",
      defaults: { lambda: 4 },
      params: [{ key: "lambda", label: "Tasa promedio lambda", min: 0.2, max: 18, step: 0.1 }],
      xs: (p) => range(0, Math.max(12, Math.ceil(p.lambda + 5 * Math.sqrt(p.lambda)))),
      pmf: (x, p) => Math.exp(-p.lambda) * p.lambda ** x / gammaFn(x + 1),
      cdf: (x, p) => registry.poisson.xs(p).filter((k) => k <= Math.floor(x)).reduce((s, k) => s + registry.poisson.pmf(k, p), 0),
      sample: (p) => samplePoisson(p.lambda),
      mean: (p) => p.lambda,
      variance: (p) => p.lambda,
      use: "Eventos raros o conteos por intervalo: llamadas, delitos, solicitudes."
    },
    uniform_discrete: {
      label: "Uniforme discreta",
      kind: "discrete",
      supportText: "1, ..., k",
      defaults: { k: 6 },
      params: [{ key: "k", label: "Número de resultados", min: 2, max: 20, step: 1 }],
      xs: (p) => range(1, Math.round(p.k)),
      pmf: (x, p) => x >= 1 && x <= Math.round(p.k) ? 1 / Math.round(p.k) : 0,
      cdf: (x, p) => clamp(Math.floor(x) / Math.round(p.k), 0, 1),
      sample: (p) => 1 + Math.floor(Math.random() * Math.round(p.k)),
      mean: (p) => (Math.round(p.k) + 1) / 2,
      variance: (p) => (Math.round(p.k) ** 2 - 1) / 12,
      use: "Sorteos equiprobables o asignación aleatoria simple."
    },
    geometric: {
      label: "Geométrica",
      kind: "discrete",
      supportText: "1, 2, 3, ...",
      defaults: { p: 0.25 },
      params: [{ key: "p", label: "Probabilidad de éxito", min: 0.05, max: 0.8, step: 0.01 }],
      xs: () => range(1, 30),
      pmf: (x, p) => (1 - p.p) ** (x - 1) * p.p,
      cdf: (x, p) => x < 1 ? 0 : 1 - (1 - p.p) ** Math.floor(x),
      sample: (p) => Math.ceil(Math.log(1 - Math.random()) / Math.log(1 - p.p)),
      mean: (p) => 1 / p.p,
      variance: (p) => (1 - p.p) / (p.p * p.p),
      use: "Intentos hasta el primer éxito: primera respuesta o primera adopción."
    },
    uniform: {
      label: "Uniforme continua",
      kind: "continuous",
      supportText: "[a, b]",
      defaults: { a: 0, b: 10 },
      params: [
        { key: "a", label: "Mínimo a", min: -10, max: 4, step: 0.5 },
        { key: "b", label: "Máximo b", min: 5, max: 20, step: 0.5 }
      ],
      domain: (p) => [Math.min(p.a, p.b - 0.5), Math.max(p.b, p.a + 0.5)],
      pdf: (x, p) => x >= p.a && x <= p.b ? 1 / (p.b - p.a) : 0,
      cdf: (x, p) => x <= p.a ? 0 : x >= p.b ? 1 : (x - p.a) / (p.b - p.a),
      sample: (p) => p.a + Math.random() * (p.b - p.a),
      mean: (p) => (p.a + p.b) / 2,
      variance: (p) => (p.b - p.a) ** 2 / 12,
      use: "Incertidumbre plana cuando todo valor de un intervalo parece igualmente plausible."
    },
    normal: {
      label: "Normal",
      kind: "continuous",
      supportText: "(-infinito, infinito)",
      defaults: { mu: 0, sigma: 1.6 },
      params: [
        { key: "mu", label: "Media mu", min: -6, max: 6, step: 0.1 },
        { key: "sigma", label: "Desviación sigma", min: 0.3, max: 5, step: 0.1 }
      ],
      domain: (p) => [p.mu - 4 * p.sigma, p.mu + 4 * p.sigma],
      pdf: (x, p) => normalPdf(x, p.mu, p.sigma),
      cdf: (x, p) => normalCdf(x, p.mu, p.sigma),
      sample: (p) => sampleNormal(p.mu, p.sigma),
      mean: (p) => p.mu,
      variance: (p) => p.sigma ** 2,
      use: "Errores simétricos, promedios y mediciones agregadas."
    },
    exponential: {
      label: "Exponencial",
      kind: "continuous",
      supportText: "[0, infinito)",
      defaults: { lambda: 0.7 },
      params: [{ key: "lambda", label: "Tasa lambda", min: 0.1, max: 3, step: 0.05 }],
      domain: (p) => [0, Math.max(8, 7 / p.lambda)],
      pdf: (x, p) => x >= 0 ? p.lambda * Math.exp(-p.lambda * x) : 0,
      cdf: (x, p) => x <= 0 ? 0 : 1 - Math.exp(-p.lambda * x),
      sample: (p) => -Math.log(1 - Math.random()) / p.lambda,
      mean: (p) => 1 / p.lambda,
      variance: (p) => 1 / (p.lambda ** 2),
      use: "Tiempos de espera con tasa constante."
    },
    gamma: {
      label: "Gamma",
      kind: "continuous",
      supportText: "[0, infinito)",
      defaults: { shape: 2.5, scale: 1.5 },
      params: [
        { key: "shape", label: "Forma k", min: 0.4, max: 8, step: 0.1 },
        { key: "scale", label: "Escala theta", min: 0.3, max: 5, step: 0.1 }
      ],
      domain: (p) => [0, Math.max(10, p.shape * p.scale + 5 * Math.sqrt(p.shape) * p.scale)],
      pdf: (x, p) => x <= 0 ? 0 : x ** (p.shape - 1) * Math.exp(-x / p.scale) / (gammaFn(p.shape) * p.scale ** p.shape),
      cdf: (x, p) => x <= 0 ? 0 : integratePdf((z) => registry.gamma.pdf(z, p), 0, x),
      sample: (p) => sampleGamma(p.shape, p.scale),
      mean: (p) => p.shape * p.scale,
      variance: (p) => p.shape * p.scale ** 2,
      use: "Duraciones positivas y acumulación de tiempos o demandas."
    },
    beta: {
      label: "Beta",
      kind: "continuous",
      supportText: "[0, 1]",
      defaults: { alpha: 2, beta: 5 },
      params: [
        { key: "alpha", label: "Alpha", min: 0.4, max: 8, step: 0.1 },
        { key: "beta", label: "Beta", min: 0.4, max: 8, step: 0.1 }
      ],
      domain: () => [0, 1],
      pdf: (x, p) => x <= 0 || x >= 1 ? 0 : x ** (p.alpha - 1) * (1 - x) ** (p.beta - 1) / betaFn(p.alpha, p.beta),
      cdf: (x, p) => x <= 0 ? 0 : x >= 1 ? 1 : integratePdf((z) => registry.beta.pdf(z, p), 0, x),
      sample: (p) => {
        const a = sampleGamma(p.alpha, 1);
        const b = sampleGamma(p.beta, 1);
        return a / (a + b);
      },
      mean: (p) => p.alpha / (p.alpha + p.beta),
      variance: (p) => p.alpha * p.beta / ((p.alpha + p.beta) ** 2 * (p.alpha + p.beta + 1)),
      use: "Proporciones: aprobación, cobertura, participación o riesgo entre 0 y 1."
    },
    student_t: {
      label: "t de Student",
      kind: "continuous",
      supportText: "(-infinito, infinito)",
      defaults: { df: 8 },
      params: [{ key: "df", label: "Grados de libertad", min: 1, max: 40, step: 1 }],
      domain: () => [-6, 6],
      pdf: (x, p) => gammaFn((p.df + 1) / 2) / (Math.sqrt(p.df * Math.PI) * gammaFn(p.df / 2)) * (1 + x * x / p.df) ** (-(p.df + 1) / 2),
      cdf: (x, p) => x <= -6 ? 0 : x >= 6 ? 1 : integratePdf((z) => registry.student_t.pdf(z, p), -8, x),
      sample: (p) => sampleNormal() / Math.sqrt(sampleGamma(p.df / 2, 2) / p.df),
      mean: () => 0,
      variance: (p) => p.df > 2 ? p.df / (p.df - 2) : Infinity,
      use: "Promedios con muestras pequeñas y desviación poblacional desconocida."
    },
    weibull: {
      label: "Weibull",
      kind: "continuous",
      supportText: "[0, infinito)",
      defaults: { shape: 1.5, scale: 3 },
      params: [
        { key: "shape", label: "Forma k", min: 0.4, max: 5, step: 0.1 },
        { key: "scale", label: "Escala lambda", min: 0.6, max: 8, step: 0.1 }
      ],
      domain: (p) => [0, p.scale * 4],
      pdf: (x, p) => x < 0 ? 0 : (p.shape / p.scale) * (x / p.scale) ** (p.shape - 1) * Math.exp(-((x / p.scale) ** p.shape)),
      cdf: (x, p) => x <= 0 ? 0 : 1 - Math.exp(-((x / p.scale) ** p.shape)),
      sample: (p) => p.scale * (-Math.log(1 - Math.random())) ** (1 / p.shape),
      mean: (p) => p.scale * gammaFn(1 + 1 / p.shape),
      variance: (p) => p.scale ** 2 * (gammaFn(1 + 2 / p.shape) - gammaFn(1 + 1 / p.shape) ** 2),
      use: "Tiempo hasta falla, duración de infraestructura o riesgo que cambia con el tiempo."
    }
  };

  window.Stat2Dist = {
    registry,
    clamp,
    normalPdf,
    normalCdf,
    normalQ,
    tCritical95,
    integratePdf
  };
})();
