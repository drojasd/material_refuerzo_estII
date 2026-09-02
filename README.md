# Material de refuerzo de Estadística II

Sitio HTML estático para recuperación conceptual y talleres interactivos de Estadística II.

URL pública para estudiantes: <https://drojasd.github.io/material_refuerzo_estII/>

## Entregables

- `index.qmd`: fuente Quarto del laboratorio.
- `taller_distribuciones/index.qmd`: taller visual de distribuciones comunes.
- `taller_estimadores/index.qmd`: taller de estimadores, TLC, intervalos y contraste.
- `styles.css`: estilos compartidos.
- `lab.js`: interacciones de autoevaluación y visualización.
- `distributions-engine.js`: registro común de distribuciones, CDF y simuladores.
- `taller_distribuciones.js` y `taller_estimadores.js`: interacciones de cada taller.
- `scripts/generate_assets.R`: genera `docs/data.js` con datos base reproducibles desde R.
- `scripts/generate_workshop_assets.R`: genera `workshop-data.js` con metadata y chequeos numéricos desde R.
- `docs/`: versión publicable en GitHub Pages.

## Rutas públicas

- Laboratorio Parcial 1: <https://drojasd.github.io/material_refuerzo_estII/>
- Taller de distribuciones: <https://drojasd.github.io/material_refuerzo_estII/taller_distribuciones/>
- Taller de estimadores: <https://drojasd.github.io/material_refuerzo_estII/taller_estimadores/>

## Render local

Quarto está instalado en Windows en `C:\Users\Lanre\AppData\Local\Programs\Quarto\bin\quarto.cmd`. Desde esta carpeta se puede ejecutar:

```bash
"C:\Users\Lanre\AppData\Local\Programs\Quarto\bin\quarto.cmd" render
```

Para regenerar los datos base:

```bash
Rscript scripts/generate_assets.R
Rscript scripts/generate_workshop_assets.R
```
