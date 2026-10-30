(function () {
  const root = document.getElementById("questionsWorkshop");
  if (!root) return;

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const listText = (items) => items.length <= 1 ? items.join("") : items.slice(0, -1).join(", ") + " y " + items[items.length - 1];
  const rName = (s) => /^[A-Za-z.][A-Za-z0-9._]*$/.test(s) ? s : "`" + s.replace(/`/g, "") + "`";

  // ---------- Cuestionarios ----------
  const answered = new Map();

  function updateQuizCount() {
    const ok = [...answered.values()].filter(Boolean).length;
    $("quizCount").textContent = `${ok}/${document.querySelectorAll("[data-q-answer]").length} preguntas acertadas`;
  }

  document.querySelectorAll("[data-q-answer]").forEach((card, idx) => {
    const feedback = card.querySelector(".feedback");
    card.querySelectorAll(".choice-button").forEach((button) => {
      button.addEventListener("click", () => {
        const correct = button.dataset.choice === card.dataset.qAnswer;
        card.querySelectorAll(".choice-button").forEach((b) => b.classList.remove("selected-ok", "selected-warn"));
        button.classList.add(correct ? "selected-ok" : "selected-warn");
        feedback.textContent = correct ? card.dataset.ok : "Revisa: " + card.dataset.hint;
        feedback.classList.toggle("ok", correct);
        feedback.classList.toggle("warn", !correct);
        answered.set(idx, correct);
        updateQuizCount();
      });
    });
  });
  updateQuizCount();

  // ---------- Selector paso a paso ----------
  const modelNames = { lm: "Regresión lineal", anova: "ANOVA", logit: "Regresión logística", chisq: "Tabla de contingencia", tree: "Árbol de decisión" };
  const modelColors = { lm: "#24577a", anova: "#168987", logit: "#c96f2d", chisq: "#6b5aa6", tree: "#3a7d44" };
  const selState = { y: "num", x: "mix", g: "explain" };
  const yLabel = { num: "Y numérica", bin: "Y binaria", multi: "Y con 3+ clases" };
  const xLabel = { num: "X numéricas", cat: "X categóricas", mix: "X mezcladas" };
  const gLabel = { explain: "Explicar", compare: "Comparar grupos", classify: "Clasificar" };

  function selectModel({ y, x, g }) {
    if (y === "num") {
      if (g === "classify") return { m: "tree", why: "Y es numérica y buscas reglas de predicción: un árbol de regresión (method = \"anova\") divide los datos en grupos con promedios distintos de Y. Evalúalo en datos de prueba y compáralo con una regresión lineal.", alt: "lm" };
      if (x === "cat") return { m: "anova", why: "Y es numérica y todas las explicativas son categóricas, es decir, definen grupos. ANOVA contrasta si el promedio de Y difiere entre esos grupos; Tukey dice cuáles.", alt: "lm" };
      if (x === "num" && g === "compare") return { m: "lm", why: "Para comparar grupos necesitas al menos una explicativa categórica. Con X solo numéricas, la pregunta es cuánto cambia Y con cada X: regresión lineal.", alt: null };
      if (g === "compare") return { m: "lm", why: "Y es numérica, hay grupos y además covariables numéricas. Una regresión lineal con factores compara los grupos ajustando por las numéricas (ANCOVA). El ANOVA solo con los factores sirve como primer paso.", alt: "anova" };
      return { m: "lm", why: "Y es numérica y quieres cuantificar cómo cambia su promedio con cada X, manteniendo las demás constantes. La regresión lineal admite X numéricas y categóricas (como factores).", alt: x === "mix" ? "tree" : null };
    }
    if (y === "bin") {
      if (g === "classify") return { m: "tree", why: "Y es binaria y buscas reglas de clasificación interpretables con entradas posiblemente mezcladas: árbol de clasificación evaluado en datos de prueba. La regresión logística es el contraste natural.", alt: "logit" };
      if (x === "cat") return { m: "logit", why: "Y es binaria. La regresión logística estima cómo cambian los odds del evento con cada X, ajustando por las demás. Como todas las X son categóricas, las tablas de contingencia con chi-cuadrado son un buen primer análisis descriptivo.", alt: "chisq" };
      return { m: "logit", why: "Y solo toma dos valores, así que se modela la probabilidad del evento, que debe quedar entre 0 y 1. La regresión lineal podría predecir probabilidades imposibles.", alt: x === "mix" ? "tree" : null };
    }
    if (x === "cat" && g !== "classify") return { m: "chisq", why: "Todas las variables son categóricas y Y tiene varias clases. La tabla de contingencia muestra cómo se distribuye Y en cada categoría de X; chi-cuadrado evalúa la asociación y la estratificación incorpora una segunda X.", alt: "tree" };
    return { m: "tree", why: "Y tiene tres o más clases y hay explicativas numéricas o el objetivo es clasificar. La logística del curso es binaria, así que el árbol de clasificación es la herramienta indicada.", alt: x === "cat" ? "chisq" : null };
  }

  function drawFlow(res) {
    const svg = $("decisionFlow");
    const ns = "http://www.w3.org/2000/svg";
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const mk = (tag, attrs, text) => {
      const el = document.createElementNS(ns, tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      if (text) el.textContent = text;
      svg.appendChild(el);
      return el;
    };
    const defs = mk("defs", {});
    const marker = document.createElementNS(ns, "marker");
    [["id", "arrowHead"], ["viewBox", "0 0 10 10"], ["refX", "9"], ["refY", "5"], ["markerWidth", "7"], ["markerHeight", "7"], ["orient", "auto"]].forEach(([k, v]) => marker.setAttribute(k, v));
    const tip = document.createElementNS(ns, "path");
    tip.setAttribute("d", "M0,0 L10,5 L0,10 z");
    tip.setAttribute("fill", "#52606f");
    marker.appendChild(tip);
    defs.appendChild(marker);
    const nodes = [
      { label: "Paso 1", text: yLabel[selState.y], x: 20, y: 30 },
      { label: "Paso 2", text: xLabel[selState.x], x: 230, y: 30 },
      { label: "Paso 3", text: gLabel[selState.g], x: 440, y: 30 }
    ];
    nodes.forEach((n, i) => {
      mk("rect", { x: n.x, y: n.y, width: 180, height: 70, rx: 10, fill: "#eef5f5", stroke: "#d9e0e5" });
      mk("text", { x: n.x + 90, y: n.y + 26, "text-anchor": "middle", "font-size": 13, fill: "#52606f" }, n.label);
      mk("text", { x: n.x + 90, y: n.y + 50, "text-anchor": "middle", "font-size": 16, "font-weight": 700, fill: "#18222f" }, n.text);
      if (i < 2) mk("line", { x1: n.x + 182, y1: n.y + 35, x2: n.x + 226, y2: n.y + 35, stroke: "#52606f", "stroke-width": 2, "marker-end": "url(#arrowHead)" });
    });
    mk("path", { d: "M530,102 C530,150 320,140 320,186", fill: "none", stroke: "#52606f", "stroke-width": 2, "marker-end": "url(#arrowHead)" });
    const col = modelColors[res.m];
    mk("rect", { x: 170, y: 190, width: 300, height: 80, rx: 12, fill: col });
    mk("text", { x: 320, y: 222, "text-anchor": "middle", "font-size": 14, fill: "#ffffff" }, "Modelo indicado");
    mk("text", { x: 320, y: 252, "text-anchor": "middle", "font-size": 22, "font-weight": 800, fill: "#ffffff" }, modelNames[res.m]);
  }

  function renderSelector() {
    const res = selectModel(selState);
    drawFlow(res);
    $("selectorResult").innerHTML = `<strong>${esc(modelNames[res.m])}</strong><p>${esc(res.why)}</p>` +
      (res.alt ? `<p class="mini-note">Complemento posible: ${esc(modelNames[res.alt])}.</p>` : "");
  }

  document.querySelectorAll(".seg[data-step]").forEach((group) => {
    group.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        group.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        selState[group.dataset.step] = btn.dataset.v;
        renderSelector();
      });
    });
  });
  renderSelector();

  // ---------- Entrenador de selección de modelos ----------
  const scenarios = [
    { s: "Una alcaldía quiere saber cómo se relacionan el área de espacio público por habitante, el estrato predominante y la densidad poblacional con la tasa de hurtos por 1.000 habitantes de cada barrio.", y: "tasa de hurtos (numérica)", x: "espacio público (num.), estrato (cat.), densidad (num.)", a: "lm", e: "Y es numérica y las X son mezcladas; se quiere cuantificar el cambio en la tasa con cada X: regresión lineal." },
    { s: "Con una encuesta postelectoral se quiere explicar si cada persona votó o no, a partir de su edad, nivel educativo y confianza en las instituciones (escala 1-10).", y: "votó (sí/no)", x: "edad (num.), educación (cat.), confianza (num.)", a: "logit", e: "Y es binaria: se modela la probabilidad de votar. Regresión logística con odds ratios." },
    { s: "¿Difiere el tiempo promedio de viaje al trabajo entre las 16 comunas de Medellín y según el medio de transporte?", y: "tiempo de viaje (minutos)", x: "comuna (cat.), medio de transporte (cat.)", a: "anova", e: "Y numérica comparada entre grupos definidos por dos categóricas: ANOVA de dos factores y Tukey." },
    { s: "¿Existe asociación entre el partido por el que votó la persona (5 partidos) y su estrato socioeconómico, y se mantiene al separar por zona urbana/rural?", y: "partido (5 categorías)", x: "estrato (cat.), zona (cat.)", a: "chisq", e: "Todas las variables son categóricas: tabla de contingencia, chi-cuadrado y estratificación por zona." },
    { s: "Se quieren reglas simples para clasificar el modo principal de transporte (bus, metro, moto, carro, a pie) usando ingreso, distancia al trabajo, edad y comuna.", y: "modo de transporte (5 clases)", x: "ingreso (num.), distancia (num.), edad (num.), comuna (cat.)", a: "tree", e: "Y tiene varias clases y las entradas son heterogéneas; se buscan reglas: árbol de clasificación." },
    { s: "¿Cómo se relacionan los años de educación, la experiencia laboral y el sexo con el salario por hora?", y: "salario por hora (numérica)", x: "educación (num.), experiencia (num.), sexo (cat.)", a: "lm", e: "Y numérica, X mezcladas, objetivo cuantificar efectos: regresión lineal múltiple." },
    { s: "¿El puntaje promedio en la prueba de lectura difiere entre colegios oficiales, privados y de concesión, y entre jornadas mañana/tarde/única?", y: "puntaje de lectura", x: "tipo de colegio (cat.), jornada (cat.)", a: "anova", e: "Comparación de promedios de una Y numérica entre grupos: ANOVA." },
    { s: "¿Qué variables ayudan a explicar si un hogar está en situación de pobreza monetaria (sí/no): número de personas, jefatura femenina y nivel educativo del jefe?", y: "pobreza (sí/no)", x: "tamaño del hogar (num.), jefatura femenina (cat.), educación (cat.)", a: "logit", e: "Y binaria con X mezcladas: regresión logística." },
    { s: "En una encuesta de percepción, ¿la opinión sobre el metro (favorable, neutral, desfavorable) se asocia con la comuna de residencia y el grupo de edad (joven, adulto, mayor)?", y: "opinión (3 categorías)", x: "comuna (cat.), grupo de edad (cat.)", a: "chisq", e: "Y y X categóricas, objetivo de asociación: tabla de contingencia y chi-cuadrado, estratificando." },
    { s: "Se quiere un modelo interpretable que indique qué combinaciones de edad, ingreso, uso de redes sociales y estrato llevan a que una persona participe en presupuesto participativo (sí/no), evaluado en datos nuevos.", y: "participa (sí/no)", x: "edad, ingreso, redes, estrato (mezcla)", a: "tree", e: "Se piden reglas (combinaciones) y evaluación en datos nuevos: árbol de clasificación. La logística sería el contraste." },
    { s: "¿Cómo se relacionan la temperatura, la precipitación semanal y el año con el número de casos semanales de dengue en Medellín?", y: "casos semanales (numérica)", x: "temperatura (num.), lluvia (num.), año (cat.)", a: "lm", e: "Y numérica con X mezcladas: regresión lineal (revisando independencia, pues son datos en el tiempo)." },
    { s: "¿Difiere el consumo promedio de energía de los hogares según el estrato (1 a 6)?  Se quiere saber además qué estratos son distintos entre sí.", y: "consumo de energía (kWh)", x: "estrato (cat.) — y luego tipo de vivienda (cat.)", a: "anova", e: "Promedio de Y numérica comparado entre grupos y comparaciones por pares (Tukey): ANOVA." },
    { s: "¿Qué variables ayudan a predecir si un proyecto de ley es aprobado: partido del ponente, número de coautores y si tiene mensaje de urgencia?", y: "aprobado (sí/no)", x: "partido (cat.), coautores (num.), urgencia (cat.)", a: "logit", e: "Y binaria, se busca el aporte de cada variable: regresión logística." },
    { s: "En pingüinos Palmer: ¿la especie (Adelie, Chinstrap, Gentoo) se relaciona con la isla donde fue observado y con el sexo?", y: "especie (3 categorías)", x: "isla (cat.), sexo (cat.)", a: "chisq", e: "Todas categóricas: tabla de especie × isla, estratificada por sexo, con chi-cuadrado." },
    { s: "En pingüinos Palmer: ¿se puede clasificar la especie a partir de longitud y profundidad del pico, aleta, masa y sexo? Interesa saber qué medidas separan mejor las especies.", y: "especie (3 clases)", x: "medidas morfológicas (num.), sexo (cat.)", a: "tree", e: "Y con 3 clases y entradas mezcladas, se quieren reglas de clasificación: árbol de decisión." },
    { s: "En pingüinos Palmer: ¿la masa corporal puede explicarse por la longitud de aleta, la longitud del pico y el sexo?", y: "masa corporal (g)", x: "aleta (num.), pico (num.), sexo (cat.)", a: "lm", e: "Y numérica con X mezcladas: regresión lineal múltiple." },
    { s: "¿El número de homicidios por cada 100.000 habitantes difiere entre regiones del país (Andina, Caribe, Pacífica, Orinoquía, Amazonía) y entre municipios con o sin presencia de cultivos ilícitos?", y: "tasa de homicidios", x: "región (cat.), cultivos ilícitos (cat.)", a: "anova", e: "Y numérica y dos factores categóricos: ANOVA de dos factores." },
    { s: "¿El tipo de vivienda (casa, apartamento, cuarto) se asocia con la tenencia (propia, arrendada, familiar) y con el estrato?", y: "tenencia (3 categorías)", x: "tipo de vivienda (cat.), estrato (cat.)", a: "chisq", e: "Variables categóricas y objetivo de asociación: tabla de contingencia con chi-cuadrado y estratos." },
    { s: "¿Qué factores (edad, estrato, tiempo de desplazamiento en minutos y género) ayudan a explicar si un estudiante abandona la universidad en el primer año?", y: "abandona (sí/no)", x: "edad (num.), estrato (cat.), desplazamiento (num.), género (cat.)", a: "logit", e: "Y binaria y X mezcladas, objetivo explicar: regresión logística." },
    { s: "Se quiere predecir el precio por m² de apartamentos con reglas fáciles de explicar a un comité (si estrato ≥ 5 y área < 60 m², entonces ...), usando estrato, área, antigüedad y comuna, y medir el error en datos nuevos.", y: "precio por m² (numérica)", x: "estrato, área, antigüedad, comuna (mezcla)", a: "tree", e: "Aunque Y es numérica, se piden reglas tipo si-entonces evaluadas en datos nuevos: árbol de regresión. La regresión lineal sería el contraste." }
  ];
  let order = [];
  let pos = 0;
  let tries = 0;
  let hits = 0;
  let streak = 0;
  let locked = false;

  function shuffle(a) {
    const b = a.slice();
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  }

  function showScenario() {
    if (pos >= order.length) { order = shuffle(scenarios.map((_, i) => i)); pos = 0; }
    const sc = scenarios[order[pos]];
    locked = false;
    $("trainerScenario").textContent = sc.s;
    $("trainerVars").innerHTML = `<span class="tag">Y: ${esc(sc.y)}</span><span class="tag tag-x">X: ${esc(sc.x)}</span>`;
    $("trainerProgress").textContent = `Escenario ${pos + 1} de ${order.length}`;
    $("trainerFeedback").textContent = "Lee el escenario, identifica Y y sus X, y elige.";
    $("trainerFeedback").classList.remove("ok", "warn");
    document.querySelectorAll("#trainerOptions .choice-button").forEach((b) => b.classList.remove("selected-ok", "selected-warn"));
  }

  document.querySelectorAll("#trainerOptions .choice-button").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (locked) return;
      const sc = scenarios[order[pos]];
      const ok = btn.dataset.model === sc.a;
      locked = true;
      tries += 1;
      if (ok) { hits += 1; streak += 1; } else { streak = 0; }
      btn.classList.add(ok ? "selected-ok" : "selected-warn");
      if (!ok) document.querySelector(`#trainerOptions [data-model="${sc.a}"]`).classList.add("selected-ok");
      $("trainerFeedback").textContent = (ok ? "Correcto. " : `No: el modelo indicado es ${modelNames[sc.a]}. `) + sc.e;
      $("trainerFeedback").classList.toggle("ok", ok);
      $("trainerFeedback").classList.toggle("warn", !ok);
      $("trainerScore").textContent = `${hits} de ${tries} · racha ${streak}`;
    });
  });
  $("trainerNext").addEventListener("click", () => { pos += 1; showScenario(); });
  order = shuffle(scenarios.map((_, i) => i));
  showScenario();

  // ---------- Auditoría de la base ----------
  const auditBoxes = [...document.querySelectorAll("[data-audit]")];
  const auditMessages = {
    real: "Busca una base real: datos abiertos (datos.gov.co, MEData, DANE), repositorios académicos o datos de literatura.",
    n50: "Necesitas al menos 50 filas completas en las variables de cada pregunta. Considera otra unidad (barrio, año) o una base más grande.",
    code: "Lee la base con read.csv desde el archivo subido a Colab o desde una URL directa (por ejemplo, el enlace raw de GitHub).",
    source: "Agrega la referencia de la fuente y explica quién recolectó los datos, cuándo y cómo.",
    dict: "Construye una tabla en Markdown con nombre, descripción, tipo y unidad de cada variable usada.",
    y: "Define una única variable respuesta para cada pregunta.",
    x: "Cada pregunta necesita dos o más explicativas con un argumento de por qué se relacionan con Y.",
    types: "Clasifica cada variable como numérica o categórica y convierte las categóricas con as.factor().",
    na: "Cuenta los faltantes con colSums(is.na(datos)) y explica si eliminas filas o por qué."
  };

  function updateAudit() {
    const done = auditBoxes.filter((b) => b.checked).length;
    const total = auditBoxes.length;
    $("auditCount").textContent = `${done}/${total}`;
    $("auditFill").style.width = `${(100 * done) / total}%`;
    const missing = auditBoxes.filter((b) => !b.checked).map((b) => b.dataset.audit);
    const panel = $("auditVerdict");
    if (done === 0) {
      panel.innerHTML = "Marca los requisitos que tu base ya cumple.";
    } else if (missing.length === 0) {
      panel.innerHTML = "<strong>Base lista para formular preguntas.</strong><p>Pasa al constructor y prueba con tus variables reales. Recuerda documentar en el notebook cada punto que marcaste.</p>";
    } else {
      const critical = missing.filter((m) => ["real", "n50", "code", "y", "x"].includes(m));
      const title = critical.length ? "Todavía hay requisitos obligatorios pendientes" : "Casi lista: falta documentación";
      panel.innerHTML = `<strong>${title}</strong><p>${esc(auditMessages[missing[0]])}</p>` +
        (missing.length > 1 ? `<p class="mini-note">Faltan ${missing.length} requisitos en total.</p>` : "");
    }
  }
  auditBoxes.forEach((b) => b.addEventListener("change", updateAudit));
  updateAudit();

  // ---------- Constructor de preguntas ----------
  const examples = {
    penguins: {
      unit: "pingüinos adultos del archipiélago Palmer (Antártida), 2007-2009",
      goal: "explain", y: "body_mass_g", yType: "num", data: "datos",
      xs: [["flipper_length_mm", "num"], ["bill_length_mm", "num"], ["sex", "cat"], ["", "num"]]
    },
    vote: {
      unit: "personas encuestadas mayores de 18 años",
      goal: "explain", y: "voto", yType: "bin", data: "encuesta",
      xs: [["edad", "num"], ["estrato", "cat"], ["confianza_partidos", "num"], ["zona", "cat"]]
    },
    crime: {
      unit: "comunas y corregimientos de Medellín por año",
      goal: "compare", y: "tasa_hurto_1000hab", yType: "num", data: "hurtos",
      xs: [["comuna", "cat"], ["anio", "cat"], ["", "num"], ["", "num"]]
    }
  };

  function readBuilder() {
    const xs = [...document.querySelectorAll("#xRows .var-row")].map((row) => ({
      name: row.querySelector(".x-name").value.trim(),
      type: row.querySelector(".x-type").value
    })).filter((x) => x.name);
    return {
      unit: $("unitInput").value.trim() || "[unidad, lugar, periodo]",
      goal: $("goalSelect").value,
      y: $("yName").value.trim(),
      yType: $("yType").value,
      data: $("dataName").value.trim() || "datos",
      xs
    };
  }

  function loadExample(key) {
    const ex = examples[key];
    $("unitInput").value = ex.unit;
    $("goalSelect").value = ex.goal;
    $("yName").value = ex.y;
    $("yType").value = ex.yType;
    $("dataName").value = ex.data;
    document.querySelectorAll("#xRows .var-row").forEach((row, i) => {
      row.querySelector(".x-name").value = ex.xs[i][0];
      row.querySelector(".x-type").value = ex.xs[i][1];
    });
    renderBuilder();
  }

  const modelInfo = {
    lm: {
      name: "Regresión lineal múltiple",
      why: (s) => `${s.y} es numérica y se quiere estimar cómo cambia su promedio con ${listText(s.xs.map((x) => x.name))}, manteniendo las demás variables constantes. La regresión lineal admite explicativas numéricas y categóricas (como factores) y entrega coeficientes interpretables en las unidades de Y.`,
      assumptions: ["Linealidad entre Y y cada X numérica (residuos vs ajustados sin curvatura).", "Homocedasticidad: varianza constante de los residuos (gráfica y ncvTest).", "Normalidad aproximada de los residuos (QQ-plot; Shapiro o KS como apoyo).", "Independencia de las observaciones (¿hay filas repetidas de la misma unidad o en el tiempo?).", "Multicolinealidad moderada entre X (vif < 5 como referencia).", "Observaciones influyentes (distancia de Cook)."],
      plots: ["Dispersión de Y contra la X numérica principal, con recta ajustada y color por una categórica.", "Boxplot de Y por la categórica principal.", "Residuos vs valores ajustados.", "QQ-plot de residuos."]
    },
    anova: {
      name: "ANOVA",
      why: (s) => `${s.y} es numérica y ${listText(s.xs.filter((x) => x.type === "cat").map((x) => x.name))} definen grupos. ANOVA contrasta si el promedio de ${s.y} difiere entre esos grupos; con dos factores permite separar el aporte de cada uno. Si encuentra diferencias, Tukey indica qué grupos difieren.`,
      assumptions: ["Normalidad aproximada de los residuos dentro de los grupos (QQ-plot).", "Homogeneidad de varianzas entre grupos (Levene).", "Independencia de las observaciones.", "Tamaños de grupo razonables: grupos con muy pocos datos dan estimaciones inestables."],
      plots: ["Boxplot de Y por cada factor (o por la combinación de factores).", "Gráfica de medias con intervalos de confianza por grupo.", "QQ-plot de residuos del ANOVA.", "Intervalos de Tukey (plot(TukeyHSD(...)))."]
    },
    logit: {
      name: "Regresión logística",
      why: (s) => `${s.y} es binaria, así que se modela la probabilidad de que ocurra el evento, que debe quedar entre 0 y 1; la regresión lineal podría predecir valores imposibles. La logística admite ${listText(s.xs.map((x) => x.name))} como explicativas numéricas o categóricas y sus coeficientes se leen como odds ratios.`,
      assumptions: ["Y realmente binaria y con la categoría de interés bien definida (revisa levels()).", "Independencia de las observaciones.", "Relación aproximadamente lineal entre X numéricas y el log-odds.", "Balance de clases: si una clase es rara, accuracy engaña; reporta recall y precisión.", "Suficientes eventos: como referencia, unos 10 casos de la clase menos frecuente por cada coeficiente.", "Calidad de clasificación: matriz de confusión, sensibilidad, especificidad y AUC."],
      plots: ["Barras de proporción de Y por cada categórica (position = \"fill\").", "Boxplot de cada X numérica según Y.", "Probabilidad predicha contra la X numérica principal.", "Curva ROC con su AUC."]
    },
    chisq: {
      name: "Tabla de contingencia y prueba chi-cuadrado",
      why: (s) => `${s.y} y ${listText(s.xs.map((x) => x.name))} son categóricas. La tabla de contingencia muestra cómo se distribuye ${s.y} dentro de cada categoría y la prueba chi-cuadrado evalúa si esa distribución cambia (asociación). Para incluir varias explicativas se estratifica: se repite la tabla de ${s.y} contra la primera X dentro de cada nivel de la segunda.`,
      assumptions: ["Frecuencias esperadas: idealmente ≥ 5 en al menos 80% de las celdas (revisa $expected).", "Independencia de las observaciones (cada persona o unidad cuenta una sola vez).", "Categorías con sentido sustantivo; si hay celdas vacías, reagrupa o usa fisher.test.", "Al estratificar, cada subtabla tiene menos datos: revisa las esperadas en cada estrato."],
      plots: ["Barras apiladas al 100% de Y por la primera X.", "Las mismas barras separadas (facet_wrap) por la segunda X.", "Mapa de calor de la tabla o de los residuos estandarizados del chi-cuadrado."]
    },
    tree: {
      name: "Árbol de decisión",
      why: (s) => `Las explicativas son heterogéneas (${listText(s.xs.map((x) => `${x.name} ${x.type === "num" ? "numérica" : "categórica"}`))}) y se busca un modelo con reglas interpretables para ${s.yType === "num" ? "predecir" : "clasificar"} ${s.y}. El árbol no exige linealidad ni normalidad, pero su calidad se juzga en datos que no usó para entrenar.`,
      assumptions: ["No exige normalidad ni homocedasticidad: el criterio es el desempeño en datos de prueba.", "Partición entrenamiento/prueba (por ejemplo 70/30) con set.seed para reproducir.", "Sobreajuste: un árbol muy profundo memoriza; revisa printcp y poda si hace falta.", "Balance de clases y métricas por clase (precision, recall), no solo accuracy.", "Estabilidad: con otra semilla, ¿cambian mucho las reglas?"],
      plots: ["Diagrama del árbol (rpart.plot).", "Matriz de confusión en datos de prueba como mapa de calor.", "Importancia de variables (arbol$variable.importance).", "Curva de complejidad (plotcp)."]
    }
  };

  function chooseModels(s) {
    const nNum = s.xs.filter((x) => x.type === "num").length;
    const nCat = s.xs.length - nNum;
    const allCat = s.xs.length > 0 && nNum === 0;
    const mixed = nNum > 0 && nCat > 0;
    const alerts = [];
    let primary;
    let secondary = null;

    if (s.yType === "num") {
      if (s.goal === "compare") {
        if (nCat === 0) {
          alerts.push("Para comparar grupos necesitas al menos una explicativa categórica. Con X solo numéricas, el objetivo es explicar (regresión).");
          primary = "lm";
        } else if (allCat) {
          primary = "anova";
          secondary = "lm";
        } else {
          primary = "lm";
          secondary = "anova";
          alerts.push("Tienes grupos y covariables numéricas: una regresión lineal con factores compara grupos ajustando por las numéricas (ANCOVA).");
        }
      } else if (s.goal === "classify") {
        primary = "tree";
        secondary = "lm";
        alerts.push("Con Y numérica el árbol es de regresión (method = \"anova\"). Compáralo con la regresión lineal como referencia.");
      } else if (s.goal === "associate") {
        primary = allCat ? "anova" : "lm";
        alerts.push("La asociación con chi-cuadrado requiere Y categórica. Con Y numérica, la relación se estudia con regresión o ANOVA. Solo categoriza Y si hay una razón sustantiva (por ejemplo, umbrales oficiales).");
      } else {
        primary = allCat ? "anova" : "lm";
        if (allCat) secondary = "lm";
      }
    } else if (s.yType === "bin") {
      if (s.goal === "classify") {
        primary = "tree";
        secondary = "logit";
      } else if (s.goal === "associate" && allCat) {
        primary = "chisq";
        secondary = "logit";
        alerts.push("La logística complementa la tabla: estima el aporte de cada explicativa ajustando por las demás.");
      } else {
        primary = "logit";
        secondary = mixed ? "tree" : null;
        if (s.goal === "compare") alerts.push("Con Y binaria, comparar grupos es comparar proporciones: la logística con factores lo hace ajustando por las demás variables.");
      }
    } else {
      if (allCat && s.goal !== "classify") {
        primary = "chisq";
        secondary = "tree";
      } else {
        primary = "tree";
        alerts.push("La regresión logística del curso es binaria. Si quieres usarla, define una Y binaria con sentido (por ejemplo, metro sí/no) y justifícalo.");
      }
    }

    if (!s.y) alerts.unshift("Escribe el nombre de la variable respuesta.");
    if (s.xs.length < 2) alerts.unshift("La Entrega 2 exige dos o más variables explicativas por pregunta.");
    if (s.xs.some((x) => x.name === s.y && s.y)) alerts.unshift("La variable respuesta no puede aparecer también como explicativa.");
    if (s.xs.length > 6) alerts.push("Muchas explicativas: verifica que tengas suficientes datos y un argumento para cada una.");
    return { primary, secondary, alerts };
  }

  function draftQuestion(s) {
    const xs = listText(s.xs.map((x) => x.name)) || "[X₁, X₂]";
    const y = s.y || "[Y]";
    const cats = s.xs.filter((x) => x.type === "cat").map((x) => x.name);
    const nums = s.xs.filter((x) => x.type === "num").map((x) => x.name);
    if (s.goal === "compare") {
      const what = s.yType === "num" ? `el promedio de ${y}` : `la distribución de ${y}`;
      const groups = cats.length ? listText(cats) : xs;
      const adj = nums.length && cats.length ? `, teniendo en cuenta ${listText(nums)}` : "";
      return `¿Difiere ${what} entre los grupos definidos por ${groups}${adj}, en ${s.unit}?`;
    }
    if (s.goal === "associate") {
      const first = s.xs[0] ? s.xs[0].name : "[X₁]";
      const rest = s.xs.slice(1).map((x) => x.name);
      return rest.length
        ? `¿Existe asociación entre ${y} y ${first} en ${s.unit}, y cambia según ${listText(rest)}?`
        : `¿Existe asociación entre ${y} y ${first} en ${s.unit}?`;
    }
    if (s.goal === "classify") {
      return s.yType === "num"
        ? `¿Qué tan bien permiten ${xs} predecir ${y} en ${s.unit}, y qué reglas resultan?`
        : `¿Qué tan bien permiten ${xs} clasificar ${y} en ${s.unit}, y qué reglas resultan?`;
    }
    if (s.yType === "bin") return `¿Qué variables, entre ${xs}, ayudan a explicar ${y} (sí/no) en ${s.unit}?`;
    return `¿Cómo se relacionan ${xs} con ${y} en ${s.unit}?`;
  }

  function buildCode(s, model) {
    const d = rName(s.data);
    const y = rName(s.y || "y");
    const xs = s.xs.length ? s.xs : [{ name: "x1", type: "num" }, { name: "x2", type: "cat" }];
    const xr = xs.map((x) => rName(x.name));
    const cats = xs.filter((x) => x.type === "cat").map((x) => rName(x.name));
    const nums = xs.filter((x) => x.type === "num").map((x) => rName(x.name));
    const f = `${y} ~ ${xr.join(" + ")}`;
    const vars = [s.y || "y", ...xs.map((x) => x.name)].map((v) => `"${v}"`).join(", ");
    const L = [];
    const libs = { lm: ["ggplot2", "car"], anova: ["ggplot2", "car"], logit: ["ggplot2", "pROC"], chisq: ["ggplot2"], tree: ["ggplot2", "rpart", "rpart.plot"] }[model];
    L.push("# Paquetes (en Colab, instalar una vez con install.packages si falta alguno)");
    libs.forEach((p) => L.push(`library(${p})`));
    L.push("");
    L.push("# Lectura de la base (archivo subido a Colab o URL directa)");
    L.push(`${d} <- read.csv("mi_base.csv")`);
    L.push("");
    L.push("# Variables de la pregunta y filas completas");
    L.push(`vars <- c(${vars})`);
    L.push(`dp <- na.omit(${d}[, vars])`);
    L.push("nrow(dp)  # debe ser >= 50");
    const factorVars = [...cats];
    if (s.yType !== "num") factorVars.unshift(y);
    if (factorVars.length) {
      L.push("");
      L.push("# Variables categóricas como factor");
      factorVars.forEach((v) => L.push(`dp$${v} <- as.factor(dp$${v})`));
    }
    L.push("");

    if (model === "lm") {
      L.push("# Ajuste del modelo");
      L.push(`modelo <- lm(${f}, data = dp)`);
      L.push("summary(modelo)");
      L.push("confint(modelo)  # intervalos de confianza de los coeficientes");
      L.push("");
      L.push("# Gráficas exploratorias");
      if (nums.length) L.push(`ggplot(dp, aes(x = ${nums[0]}, y = ${y}${cats.length ? `, color = ${cats[0]}` : ""})) +\n  geom_point(alpha = 0.6) +\n  geom_smooth(method = "lm", se = TRUE) +\n  labs(title = "${s.y} según ${nums[0].replace(/`/g, "")}", x = "${nums[0].replace(/`/g, "")} (unidades)", y = "${s.y} (unidades)")`);
      if (cats.length) L.push(`ggplot(dp, aes(x = ${cats[0]}, y = ${y})) +\n  geom_boxplot() +\n  labs(title = "${s.y} por ${cats[0].replace(/`/g, "")}", x = "${cats[0].replace(/`/g, "")}", y = "${s.y} (unidades)")`);
      L.push("");
      L.push("# Supuestos");
      L.push("plot(modelo, which = 1)  # residuos vs ajustados: linealidad y varianza constante");
      L.push("plot(modelo, which = 2)  # QQ-plot: normalidad de residuos");
      L.push("shapiro.test(residuals(modelo))  # usar con n <= 5000; con n grande, priorizar el QQ-plot");
      L.push("ncvTest(modelo)  # H0: varianza constante");
      if (xs.length >= 2) L.push("vif(modelo)  # multicolinealidad; valores > 5 merecen atención");
      L.push("plot(modelo, which = 4)  # distancia de Cook: observaciones influyentes");
    } else if (model === "anova") {
      const g = cats.length ? cats : xr;
      L.push("# Ajuste del modelo");
      L.push(`modelo <- aov(${y} ~ ${g.join(" + ")}${nums.length ? " + " + nums.join(" + ") : ""}, data = dp)`);
      L.push("summary(modelo)");
      L.push("");
      L.push("# Gráficas");
      L.push(`ggplot(dp, aes(x = ${g[0]}, y = ${y}${g[1] ? `, fill = ${g[1]}` : ""})) +\n  geom_boxplot() +\n  labs(title = "${s.y} por ${g[0].replace(/`/g, "")}", x = "${g[0].replace(/`/g, "")}", y = "${s.y} (unidades)")`);
      L.push(`ggplot(dp, aes(x = ${g[0]}, y = ${y})) +\n  stat_summary(fun.data = mean_se, fun.args = list(mult = 1.96), geom = "pointrange") +\n  labs(title = "Media e IC 95% aproximado por grupo", x = "${g[0].replace(/`/g, "")}", y = "${s.y}")`);
      L.push("");
      L.push("# Supuestos");
      L.push("qqnorm(residuals(modelo)); qqline(residuals(modelo))  # normalidad de residuos");
      g.forEach((v) => L.push(`leveneTest(${y} ~ ${v}, data = dp)  # H0: varianzas iguales entre grupos`));
      L.push("table(" + g.map((v) => `dp$${v}`).join(", ") + ")  # tamaño de cada grupo");
      L.push("");
      L.push("# Comparaciones múltiples (si el ANOVA es significativo)");
      L.push(`TukeyHSD(modelo, "${g[0].replace(/`/g, "")}")`);
    } else if (model === "logit") {
      L.push("# Balance de clases y categoría de referencia");
      L.push(`table(dp$${y}); prop.table(table(dp$${y}))`);
      L.push(`levels(dp$${y})  # glm modela la probabilidad del SEGUNDO nivel`);
      L.push("");
      L.push("# Ajuste del modelo");
      L.push(`modelo <- glm(${f}, data = dp, family = binomial)`);
      L.push("summary(modelo)");
      L.push("exp(cbind(OR = coef(modelo), confint.default(modelo)))  # odds ratios con IC 95%");
      L.push("");
      L.push("# Gráficas");
      if (cats.length) L.push(`ggplot(dp, aes(x = ${cats[0]}, fill = ${y})) +\n  geom_bar(position = "fill") +\n  labs(title = "Proporción de ${s.y} por ${cats[0].replace(/`/g, "")}", x = "${cats[0].replace(/`/g, "")}", y = "Proporción")`);
      if (nums.length) L.push(`ggplot(dp, aes(x = ${y}, y = ${nums[0]})) +\n  geom_boxplot() +\n  labs(title = "${nums[0].replace(/`/g, "")} según ${s.y}", x = "${s.y}", y = "${nums[0].replace(/`/g, "")}")`);
      L.push("");
      L.push("# Calidad de clasificación");
      L.push("dp$prob <- predict(modelo, type = \"response\")");
      L.push(`dp$pred <- ifelse(dp$prob >= 0.5, levels(dp$${y})[2], levels(dp$${y})[1])`);
      L.push(`confusion <- table(Observado = dp$${y}, Predicho = factor(dp$pred, levels = levels(dp$${y})))`);
      L.push("confusion");
      L.push("sum(diag(confusion)) / sum(confusion)  # accuracy");
      L.push("confusion[2, 2] / sum(confusion[2, ])  # sensibilidad (recall de la clase de interés)");
      L.push("confusion[1, 1] / sum(confusion[1, ])  # especificidad");
      L.push(`roc_obj <- roc(dp$${y}, dp$prob)`);
      L.push("plot(roc_obj, main = \"Curva ROC\"); auc(roc_obj)");
    } else if (model === "chisq") {
      const a = cats[0] || xr[0];
      const b = cats[1] || xr[1];
      L.push("# Tabla de contingencia: Y contra la primera explicativa");
      L.push(`tabla <- table(${s.y ? y : "Y"} = dp$${y}, ${a.replace(/`/g, "")} = dp$${a})`);
      L.push("tabla");
      L.push("prop.table(tabla, margin = 2)  # distribución de Y dentro de cada categoría de X");
      L.push("prueba <- chisq.test(tabla)");
      L.push("prueba");
      L.push("prueba$expected  # supuesto: esperadas >= 5 en la mayoría de celdas");
      L.push("round(prueba$stdres, 2)  # residuos estandarizados: |r| > 2 señala celdas que se apartan de la independencia");
      L.push("");
      L.push("# Gráfica: proporciones de Y por X");
      L.push(`ggplot(dp, aes(x = ${a}, fill = ${y})) +\n  geom_bar(position = "fill") +\n  labs(title = "Distribución de ${s.y} por ${a.replace(/`/g, "")}", x = "${a.replace(/`/g, "")}", y = "Proporción")`);
      if (b) {
        L.push("");
        L.push(`# Estratificación por ${b.replace(/`/g, "")}: ¿cambia la asociación?`);
        L.push(`ggplot(dp, aes(x = ${a}, fill = ${y})) +\n  geom_bar(position = "fill") +\n  facet_wrap(~ ${b}) +\n  labs(title = "${s.y} por ${a.replace(/`/g, "")}, separado por ${b.replace(/`/g, "")}", x = "${a.replace(/`/g, "")}", y = "Proporción")`);
        L.push(`for (nivel in levels(dp$${b})) {`);
        L.push(`  sub <- dp[dp$${b} == nivel, ]`);
        L.push(`  t_sub <- table(sub$${y}, sub$${a})`);
        L.push("  cat(\"\\nEstrato:\", nivel, \"\\n\")");
        L.push("  print(t_sub)");
        L.push("  p_sub <- suppressWarnings(chisq.test(t_sub))");
        L.push("  print(p_sub)");
        L.push("  print(round(p_sub$expected, 1))");
        L.push("}");
      }
      L.push("");
      L.push("# Alternativa con esperadas pequeñas");
      L.push("fisher.test(tabla, simulate.p.value = TRUE)");
    } else if (model === "tree") {
      const method = s.yType === "num" ? "anova" : "class";
      L.push("# Partición entrenamiento / prueba (70/30)");
      L.push("set.seed(123)");
      L.push("idx <- sample(seq_len(nrow(dp)), size = round(0.7 * nrow(dp)))");
      L.push("train <- dp[idx, ]");
      L.push("test  <- dp[-idx, ]");
      L.push("");
      L.push("# Ajuste del árbol");
      L.push(`arbol <- rpart(${f}, data = train, method = "${method}")`);
      L.push("rpart.plot(arbol)");
      L.push("printcp(arbol); plotcp(arbol)  # complejidad: ¿conviene podar?");
      L.push("arbol$variable.importance");
      L.push("");
      if (method === "class") {
        L.push("# Evaluación en datos de prueba");
        L.push("pred <- predict(arbol, newdata = test, type = \"class\")");
        L.push(`confusion <- table(Observado = test$${y}, Predicho = pred)`);
        L.push("confusion");
        L.push("sum(diag(confusion)) / sum(confusion)  # accuracy");
        L.push("diag(confusion) / rowSums(confusion)  # recall por clase");
        L.push("diag(confusion) / colSums(confusion)  # precision por clase");
        L.push(`prop.table(table(train$${y}))  # balance de clases`);
        L.push("");
        L.push("# Matriz de confusión como mapa de calor");
        L.push("cm <- as.data.frame(confusion)");
        L.push("ggplot(cm, aes(x = Predicho, y = Observado, fill = Freq)) +\n  geom_tile() + geom_text(aes(label = Freq)) +\n  labs(title = \"Matriz de confusión (datos de prueba)\")");
      } else {
        L.push("# Evaluación en datos de prueba");
        L.push("pred <- predict(arbol, newdata = test)");
        L.push(`rmse <- sqrt(mean((test$${y} - pred)^2)); rmse`);
        L.push(`cor(test$${y}, pred)^2  # R² aproximado en prueba`);
        L.push(`ggplot(data.frame(obs = test$${y}, pred = pred), aes(pred, obs)) +\n  geom_point() + geom_abline(linetype = 2) +\n  labs(title = "Observado vs predicho (prueba)", x = "Predicho", y = "Observado")`);
      }
    }
    return L.join("\n");
  }

  let lastCode = "";

  function renderBuilder() {
    const s = readBuilder();
    const { primary, secondary, alerts } = chooseModels(s);
    const info = modelInfo[primary];
    $("questionDraft").innerHTML = `<span class="draft-label">Borrador de pregunta</span>${esc(draftQuestion(s))}`;
    $("builderAlerts").innerHTML = alerts.map((a) => `<p class="builder-alert">${esc(a)}</p>`).join("");
    $("modelRecommendation").innerHTML =
      `<strong>Modelo sugerido: ${esc(info.name)}</strong><p>${esc(info.why({ ...s, y: s.y || "Y" }))}</p>` +
      (secondary ? `<p class="mini-note">Complemento posible: ${esc(modelInfo[secondary].name)}. Úsalo si responde algo distinto o sirve para contrastar.</p>` : "");
    $("assumptionList").innerHTML = info.assumptions.map((a) => `<li>${esc(a)}</li>`).join("");
    $("plotList").innerHTML = info.plots.map((a) => `<li>${esc(a)}</li>`).join("");
    lastCode = buildCode(s, primary);
    $("codeOutput").querySelector("code").textContent = lastCode;
    $("copyStatus").textContent = "";
  }

  root.querySelectorAll("#constructor input, #constructor select").forEach((el) => {
    el.addEventListener("input", renderBuilder);
    el.addEventListener("change", renderBuilder);
  });
  $("examplePenguins").addEventListener("click", () => loadExample("penguins"));
  $("exampleVote").addEventListener("click", () => loadExample("vote"));
  $("exampleCrime").addEventListener("click", () => loadExample("crime"));
  $("copyCode").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(lastCode);
      $("copyStatus").textContent = "Copiado.";
    } catch (e) {
      const range = document.createRange();
      range.selectNodeContents($("codeOutput"));
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      $("copyStatus").textContent = "Seleccionado: usa Ctrl+C.";
    }
  });
  renderBuilder();

  // ---------- Fichas de supuestos ----------
  const assumptionCards = {
    lm: {
      title: "Regresión lineal",
      rows: [
        ["Linealidad", "plot(modelo, which = 1)", "La nube de residuos vs ajustados no muestra curvatura.", "Si hay curva: transforma X o Y (log), agrega un término cuadrático o reconoce que el coeficiente resume mal la relación."],
        ["Homocedasticidad", "ncvTest(modelo)", "p > 0.05 y gráfica sin forma de embudo: varianza aproximadamente constante.", "Si falla: los errores estándar y p-valores no son confiables; usa log(Y) o errores robustos y dilo."],
        ["Normalidad de residuos", "plot(modelo, which = 2); shapiro.test(residuals(modelo))", "Puntos cerca de la diagonal del QQ-plot. Con n grande, desviaciones leves importan poco (TLC).", "Si hay colas pesadas o atípicos: revisa casos extremos, transforma Y y sé prudente con los intervalos."],
        ["Independencia", "Diseño de la base", "Cada fila es una unidad distinta, sin mediciones repetidas ni orden temporal fuerte.", "Si hay series de tiempo o grupos (barrios dentro de comunas), los p-valores pueden ser demasiado optimistas."],
        ["Multicolinealidad", "vif(modelo)", "VIF < 5: las X aportan información distinta.", "Si es alto: los coeficientes son inestables; elimina o combina variables redundantes."]
      ]
    },
    anova: {
      title: "ANOVA",
      rows: [
        ["Normalidad de residuos", "qqnorm(residuals(modelo)); qqline(residuals(modelo))", "Puntos cerca de la línea; con grupos grandes el ANOVA es robusto a desviaciones leves.", "Si falla con grupos pequeños: usa kruskal.test(y ~ grupo) como alternativa no paramétrica."],
        ["Homogeneidad de varianzas", "leveneTest(y ~ grupo, data = dp)", "p > 0.05: no hay evidencia de varianzas distintas.", "Si falla: usa oneway.test(y ~ grupo, var.equal = FALSE) (Welch) y repórtalo."],
        ["Independencia", "Diseño de la base", "Cada observación pertenece a un solo grupo y no se repite.", "Mediciones antes/después de la misma unidad requieren otro diseño (pareado o medidas repetidas)."],
        ["¿Qué grupos difieren?", "TukeyHSD(modelo)", "Intervalos de diferencias que no contienen 0 señalan pares distintos.", "Un ANOVA significativo solo dice que algún grupo difiere; no indica cuál."]
      ]
    },
    logit: {
      title: "Regresión logística",
      rows: [
        ["Respuesta binaria", "levels(dp$y); table(dp$y)", "Dos categorías bien definidas; sabes cuál es el 'éxito' (segundo nivel).", "Si hay más de dos: agrupa con justificación sustantiva o usa un árbol."],
        ["Balance de clases", "prop.table(table(dp$y))", "Ninguna clase es muy rara (por ejemplo, < 10%).", "Si hay desbalance: no reportes solo accuracy; reporta sensibilidad, especificidad y considera otro umbral."],
        ["Eventos suficientes", "min(table(dp$y)) / número de coeficientes", "Como referencia, unos 10 o más eventos por coeficiente.", "Si son pocos: simplifica el modelo; coeficientes enormes o errores estándar gigantes son una alarma."],
        ["Calidad de clasificación", "table(Observado, Predicho); auc(roc(...))", "AUC cercano a 1 discrimina bien; 0.5 es como lanzar una moneda.", "Un buen ajuste no implica causalidad ni buena predicción en otra población."],
        ["Independencia", "Diseño de la base", "Una fila por persona o unidad.", "Datos agrupados (personas en barrios) pueden subestimar la incertidumbre."]
      ]
    },
    chisq: {
      title: "Tablas de contingencia",
      rows: [
        ["Frecuencias esperadas", "chisq.test(tabla)$expected", "Al menos 80% de celdas con esperadas ≥ 5 y ninguna < 1.", "Si falla: reagrupa categorías con sentido o usa fisher.test (con simulate.p.value = TRUE en tablas grandes)."],
        ["Independencia de observaciones", "Diseño de la base", "Cada unidad aparece en una sola celda.", "Respuestas múltiples o personas repetidas invalidan la prueba."],
        ["Dirección de la asociación", "prop.table(tabla, 2); chisq.test(tabla)$stdres", "Residuos |r| > 2 indican qué celdas aportan a la asociación.", "El p-valor dice que hay asociación, no cuál ni de qué tamaño: descríbela con proporciones."],
        ["Tercera variable", "Tablas por estrato", "Si la asociación cambia entre estratos, la tercera variable la modifica o la confunde.", "Una asociación global puede desaparecer o invertirse por estratos (paradoja de Simpson)."]
      ]
    },
    tree: {
      title: "Árbol de decisión",
      rows: [
        ["Evaluación honesta", "predict(arbol, newdata = test, type = \"class\")", "Métricas calculadas en datos de prueba, no en los de entrenamiento.", "Evaluar en entrenamiento sobrestima el desempeño."],
        ["Sobreajuste", "printcp(arbol); prune(arbol, cp = ...)", "El error de validación cruzada (xerror) deja de bajar: ese es el tamaño razonable.", "Un árbol demasiado profundo memoriza ruido; pódalo."],
        ["Balance de clases", "prop.table(table(train$y))", "Compara la accuracy con la del modelo trivial (siempre la clase mayoritaria).", "Si la clase minoritaria tiene recall bajo, dilo explícitamente."],
        ["Estabilidad", "Cambiar set.seed y reajustar", "Las primeras divisiones se mantienen.", "Si cambian mucho, las reglas no son robustas: interpreta con cautela."]
      ]
    }
  };

  function renderAssumption(key) {
    const card = assumptionCards[key];
    $("assumptionCard").innerHTML =
      `<h3>${esc(card.title)}</h3><div class="table-wrap"><table class="model-table"><thead><tr><th>Supuesto o criterio</th><th>Cómo revisarlo en R</th><th>Lectura cuando se cumple</th><th>Si no se cumple</th></tr></thead><tbody>` +
      card.rows.map((r) => `<tr><td><b>${esc(r[0])}</b></td><td><code>${esc(r[1])}</code></td><td>${esc(r[2])}</td><td>${esc(r[3])}</td></tr>`).join("") +
      "</tbody></table></div>";
  }

  document.querySelectorAll("#assumptionTabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#assumptionTabs button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderAssumption(btn.dataset.model);
    });
  });
  renderAssumption("lm");

  // ---------- Rúbricas ----------
  const rubrics = {
    e2: [
      ["Selección y documentación de la base", 1.0], ["Lectura correcta de la base", 1.0], ["Formulación de preguntas", 2.0],
      ["Elección y justificación de modelos", 2.0], ["Implementación en R", 2.0], ["Interpretación de resultados", 2.0],
      ["Validación de supuestos", 2.0], ["Visualizaciones", 1.5], ["Discusión crítica", 1.5], ["Presentación del notebook", 1.0]
    ],
    poster: [
      ["Claridad de las preguntas", 1.5], ["Rigor metodológico", 3.0], ["Validación de supuestos", 2.0],
      ["Interpretación de resultados", 2.5], ["Calidad de visualizaciones", 2.0], ["Calidad científica del contenido", 2.0],
      ["Discusión crítica y limitaciones", 1.5], ["Diseño y comunicación visual", 2.0], ["Calidad general", 1.5]
    ]
  };

  function renderRubric(key) {
    const items = rubrics[key];
    const max = 3;
    $("rubricBars").innerHTML = items.map(([label, pts]) =>
      `<div class="rubric-row"><span>${esc(label)}</span><div class="rubric-track"><div class="rubric-fill" style="width:${(100 * pts) / max}%"></div></div><b>${pts.toFixed(1)}</b></div>`
    ).join("");
  }

  document.querySelectorAll("#rubricTabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#rubricTabs button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderRubric(btn.dataset.rubric);
    });
  });
  renderRubric("e2");
})();
