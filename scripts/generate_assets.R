args <- commandArgs(FALSE)
file_arg <- args[grepl("^--file=", args)]
if (length(file_arg) > 0) {
  script_path <- normalizePath(sub("^--file=", "", file_arg[[1]]), mustWork = TRUE)
  script_dir <- dirname(script_path)
} else {
  script_dir <- getwd()
}

project_dir <- normalizePath(file.path(script_dir, ".."), mustWork = TRUE)
out_dir <- normalizePath(file.path(project_dir, "docs"), mustWork = FALSE)
if (!dir.exists(out_dir)) {
  dir.create(out_dir, recursive = TRUE)
}

x <- seq(-4, 4, length.out = 161)
v_shape <- abs(x)
v_density <- v_shape / sum(v_shape)

normal_x <- seq(5, 45, length.out = 161)
normal_y <- dnorm(normal_x, mean = 25, sd = 4)

discrete <- c(0.10, 0.15, 0.20, 0.05, 0.15, 0.10, 0.15, 0.10)

fmt_vec <- function(values) {
  paste(sprintf("%.6f", values), collapse = ", ")
}

data_js <- paste0(
  "document.documentElement.setAttribute('data-r-assets', 'R 4.5.1');\n",
  "window.LAB_R_DATA = {\n",
  "  generatedBy: 'R 4.5.1',\n",
  "  defaultDiscrete: [", fmt_vec(discrete), "],\n",
  "  vShape: {\n",
  "    x: [", fmt_vec(x), "],\n",
  "    raw: [", fmt_vec(v_shape), "],\n",
  "    normalized: [", fmt_vec(v_density), "]\n",
  "  },\n",
  "  normalReference: {\n",
  "    x: [", fmt_vec(normal_x), "],\n",
  "    y: [", fmt_vec(normal_y), "]\n",
  "  }\n",
  "};\n"
)

writeLines(data_js, file.path(project_dir, "data.js"), useBytes = TRUE)
writeLines(data_js, file.path(out_dir, "data.js"), useBytes = TRUE)
