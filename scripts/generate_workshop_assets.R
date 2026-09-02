families <- list(
  list(id = "bernoulli", label = "Bernoulli", kind = "discreta", support = "{0, 1}", use = "Evento binario"),
  list(id = "binomial", label = "Binomial", kind = "discreta", support = "0, ..., n", use = "Conteo de exitos en n ensayos"),
  list(id = "poisson", label = "Poisson", kind = "discreta", support = "0, 1, 2, ...", use = "Conteos por intervalo"),
  list(id = "uniform_discrete", label = "Uniforme discreta", kind = "discreta", support = "1, ..., k", use = "Resultados equiprobables"),
  list(id = "geometric", label = "Geometrica", kind = "discreta", support = "1, 2, ...", use = "Intentos hasta el primer exito"),
  list(id = "uniform", label = "Uniforme continua", kind = "continua", support = "[a, b]", use = "Incertidumbre plana"),
  list(id = "normal", label = "Normal", kind = "continua", support = "R", use = "Errores simetricos y promedios"),
  list(id = "exponential", label = "Exponencial", kind = "continua", support = "[0, infinito)", use = "Tiempos de espera"),
  list(id = "gamma", label = "Gamma", kind = "continua", support = "[0, infinito)", use = "Duraciones positivas acumuladas"),
  list(id = "beta", label = "Beta", kind = "continua", support = "[0, 1]", use = "Proporciones"),
  list(id = "student_t", label = "t de Student", kind = "continua", support = "R", use = "Medias con sigma desconocida"),
  list(id = "weibull", label = "Weibull", kind = "continua", support = "[0, infinito)", use = "Tiempo hasta falla o riesgo")
)

checks <- list(
  binomial_sum = sum(dbinom(0:20, size = 20, prob = 0.45)),
  poisson_sum_0_40 = sum(dpois(0:40, lambda = 4)),
  normal_cdf_left = pnorm(-8),
  normal_cdf_right = pnorm(8),
  beta_integral = integrate(function(x) dbeta(x, 2, 5), lower = 0, upper = 1)$value,
  t_critical_95_df_24 = qt(0.975, df = 24)
)

to_json <- function(x) {
  if (is.list(x) && is.null(names(x))) {
    paste0("[", paste(vapply(x, to_json, character(1)), collapse = ","), "]")
  } else if (is.list(x)) {
    paste0("{", paste(sprintf('"%s":%s', names(x), vapply(x, to_json, character(1))), collapse = ","), "}")
  } else if (is.character(x)) {
    paste0('"', gsub('"', '\\"', x), '"')
  } else if (is.numeric(x)) {
    ifelse(is.finite(x), sprintf("%.12g", x), "null")
  } else {
    ifelse(isTRUE(x), "true", "false")
  }
}

payload <- list(
  generated_by = "scripts/generate_workshop_assets.R",
  seed_note = "Static reference metadata and numerical checks generated with base R.",
  families = families,
  checks = checks
)

content <- paste0("window.STAT2_WORKSHOP_DATA = ", to_json(payload), ";\n")
writeLines(content, "workshop-data.js", useBytes = TRUE)
if (dir.exists("docs")) writeLines(content, file.path("docs", "workshop-data.js"), useBytes = TRUE)
