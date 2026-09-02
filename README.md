# Laboratorio Parcial 1: Distribuciones y Formas

Laboratorio HTML estático para recuperación conceptual después del primer parcial de Estadística II.

URL pública para estudiantes: <https://drojasd.github.io/material_refuerzo_estII/>

## Entregables

- `index.qmd`: fuente Quarto del laboratorio.
- `styles.css`: estilos compartidos.
- `lab.js`: interacciones de autoevaluación y visualización.
- `scripts/generate_assets.R`: genera `docs/data.js` con datos base reproducibles desde R.
- `docs/`: versión publicable en GitHub Pages.

## Render local

Quarto está instalado en Windows en `C:\Users\Lanre\AppData\Local\Programs\Quarto\bin\quarto.cmd`. Desde esta carpeta se puede ejecutar:

```bash
"C:\Users\Lanre\AppData\Local\Programs\Quarto\bin\quarto.cmd" render
```

Para regenerar los datos base:

```bash
Rscript scripts/generate_assets.R
```
