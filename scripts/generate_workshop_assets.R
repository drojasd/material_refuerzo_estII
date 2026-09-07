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
  t_critical_95_df_24 = qt(0.975, df = 24),
  one_prop_case_z = (0.65 - 0.60) / sqrt(0.60 * 0.40 / 200),
  one_prop_case_p_right = 1 - pnorm((0.65 - 0.60) / sqrt(0.60 * 0.40 / 200)),
  one_mean_case_t = (54 - 50) / (8 / sqrt(15)),
  one_mean_case_p_two = 2 * (1 - pt(abs((54 - 50) / (8 / sqrt(15))), df = 14)),
  chi_independence_case_stat = unname(suppressWarnings(chisq.test(matrix(c(34, 46, 58, 42, 54, 16), nrow = 3, byrow = TRUE), correct = FALSE)$statistic)),
  f_two_variances_case = max(9^2, 5.5^2) / min(9^2, 5.5^2)
)

hypothesis_tests <- list(
  list(id = "one_prop_z", label = "Z para una proporción", use = "Una proporción contra p0", reference = "Normal estándar"),
  list(id = "one_mean_t", label = "t de una muestra", use = "Media con sigma desconocida", reference = "t de Student"),
  list(id = "one_mean_z", label = "Z para una media", use = "Media con sigma conocida", reference = "Normal estándar"),
  list(id = "one_variance_chi", label = "Chi-cuadrado para varianza", use = "Varianza o desviación bajo normalidad", reference = "Chi-cuadrado"),
  list(id = "two_variances_f", label = "F para dos varianzas", use = "Comparar dispersión de dos grupos independientes", reference = "F"),
  list(id = "two_mean_welch", label = "t de Welch", use = "Diferencia de medias independientes", reference = "t aproximada"),
  list(id = "paired_t", label = "t pareada", use = "Antes/después o pares emparejados", reference = "t de Student"),
  list(id = "two_prop_z", label = "Z para dos proporciones", use = "Diferencia de porcentajes", reference = "Normal estándar"),
  list(id = "chi_independence", label = "Chi-cuadrado de independencia", use = "Asociación entre categorías", reference = "Chi-cuadrado"),
  list(id = "ks", label = "Kolmogorov-Smirnov", use = "Comparar ECDF con CDF teórica", reference = "Distribución KS")
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
  hypothesis_tests = hypothesis_tests,
  checks = checks
)

content <- paste0("window.STAT2_WORKSHOP_DATA = ", to_json(payload), ";\n")
writeLines(content, "workshop-data.js", useBytes = TRUE)
if (dir.exists("docs")) writeLines(content, file.path("docs", "workshop-data.js"), useBytes = TRUE)
