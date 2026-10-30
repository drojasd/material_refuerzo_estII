"""Genera plantilla_entrega2.ipynb (notebook R para Google Colab).

Uso:  python scripts/build_plantilla_entrega2.py
Con --r-script RUTA también escribe todas las celdas de código en un .R para probarlas con Rscript.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
cells = []


def md(text):
    cells.append({"cell_type": "markdown", "metadata": {}, "source": text.strip("\n").splitlines(keepends=True)})


def code(text):
    cells.append({"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [],
                  "source": text.strip("\n").splitlines(keepends=True)})


md("""
# [Título: la relación que estudias, en una línea]

**Integrantes:** Nombre 1, Nombre 2
**Curso:** Estadística II · Entrega 2

> **Cómo usar esta plantilla.** Funciona de entrada con la base de pingüinos Palmer para que veas cada paso corriendo. Para tu trabajo:
> 1. Cambia la URL o el archivo en la celda de **configuración**.
> 2. Cambia los nombres de la variable respuesta y de las explicativas de cada pregunta.
> 3. Reemplaza cada bloque marcado con ✏️ por tu propio texto. No dejes texto de la plantilla en la entrega.
> 4. Antes de entregar: *Entorno de ejecución → Reiniciar y ejecutar todo*, y verifica que no haya errores.
>
> Guía de apoyo: https://drojasd.github.io/material_refuerzo_estII/taller_preguntas/
""")

md("""
## 1. Introducción

✏️ **Tema del estudio:** ¿qué fenómeno estudias y por qué importa (3-5 líneas)?

✏️ **Fuente de los datos:** quién los produjo, cuándo, cómo se recolectaron y enlace o referencia.

✏️ **Relevancia de la base:** ¿por qué esta base permite estudiar el tema?

✏️ **Preguntas de investigación:**
1. Pregunta 1: ...
2. Pregunta 2: ...
""")

code("""
# Paquetes. En Colab, si alguno falta, quita el comentario de la línea siguiente y ejecútala una vez.
# install.packages(c("ggplot2", "dplyr", "car", "pROC", "rpart", "rpart.plot"))

library(ggplot2)
library(dplyr)
library(car)
library(pROC)
library(rpart)
library(rpart.plot)
""")

md("""
### Configuración

Aquí se define todo lo que cambia de una base a otra. El resto del notebook usa estos nombres.
""")

code("""
# ---- Lectura de la base (desde archivo subido a Colab o URL directa; nunca pegar datos) ----
ruta_datos <- "https://raw.githubusercontent.com/allisonhorst/palmerpenguins/master/inst/extdata/penguins.csv"
# ruta_datos <- "mi_base.csv"   # si subiste el archivo a Colab

# ---- Variables categóricas de la base (se convertirán a factor) ----
vars_categoricas <- c("species", "island", "sex", "year")

# ---- Pregunta 1: variable respuesta NUMÉRICA ----
y1 <- "body_mass_g"
x1 <- c("flipper_length_mm", "bill_length_mm", "sex")

# ---- Pregunta 2: variable respuesta BINARIA (dos categorías) ----
y2 <- "sex"
x2 <- c("body_mass_g", "bill_depth_mm", "species")
""")

md("""
## 2. Lectura y descripción de la base de datos
""")

code("""
# Lectura de la base mediante código
datos <- read.csv(ruta_datos)

# Número de filas (observaciones) y columnas (variables)
dim(datos)

# Primeras filas y estructura (tipo de cada variable)
head(datos)
str(datos)
""")

code("""
# Convertir variables categóricas a factor
for (v in vars_categoricas) {
  datos[[v]] <- as.factor(datos[[v]])
}

# Resumen de cada variable
summary(datos)

# Datos faltantes por variable
colSums(is.na(datos))
""")

md("""
✏️ **Descripción de variables.** Completa la tabla con las variables que usarás:

| Variable | Descripción | Tipo | Unidad |
|---|---|---|---|
| `body_mass_g` | Masa corporal | Numérica | gramos |
| `flipper_length_mm` | Longitud de la aleta | Numérica | mm |
| `sex` | Sexo del individuo | Categórica (2 niveles) | - |
| ... | ... | ... | ... |

✏️ **Tratamiento de faltantes.** ¿Cuántos hay? ¿Qué decidiste (eliminar filas incompletas, otra estrategia) y por qué? ¿Podría esa decisión sesgar los resultados?
""")

md("""
## 3. Pregunta de investigación 1

✏️ **Pregunta:** ¿Cómo se relacionan ... con ... en ...?

✏️ **Variable respuesta:** nombre, tipo (numérica) y unidad.

✏️ **Variables explicativas:** nombre y tipo de cada una, y por qué podrían relacionarse con la respuesta.

✏️ **Justificación del modelo.** Ejemplo: *"La variable respuesta es numérica y las explicativas combinan variables numéricas y categóricas; queremos estimar cuánto cambia el promedio de la respuesta con cada explicativa manteniendo las demás constantes. Por eso usamos regresión lineal múltiple."* Si tus explicativas son todas categóricas y quieres comparar promedios entre grupos, usa ANOVA (celda opcional más abajo).
""")

code("""
# Filas completas en las variables de la pregunta 1
d1 <- na.omit(datos[, c(y1, x1)])
nrow(d1)   # debe ser >= 50

# Fórmula: y1 ~ x1[1] + x1[2] + ...
formula1 <- reformulate(x1, response = y1)
formula1
""")

code("""
# Gráfica 1: respuesta vs la primera explicativa numérica
x_num1 <- x1[sapply(d1[x1], is.numeric)][1]
x_cat1 <- x1[sapply(d1[x1], is.factor)][1]

ggplot(d1, aes(x = .data[[x_num1]], y = .data[[y1]])) +
  geom_point(alpha = 0.6) +
  geom_smooth(method = "lm", formula = y ~ x, se = TRUE) +
  labs(title = paste(y1, "según", x_num1), x = x_num1, y = y1)
""")

md("""
✏️ **Interpretación de la gráfica 1:** ¿qué forma tiene la relación? ¿es aproximadamente lineal? ¿hay valores atípicos?
""")

code("""
# Gráfica 2: respuesta por la primera explicativa categórica
ggplot(d1, aes(x = .data[[x_cat1]], y = .data[[y1]])) +
  geom_boxplot() +
  labs(title = paste(y1, "por", x_cat1), x = x_cat1, y = y1)
""")

md("""
✏️ **Interpretación de la gráfica 2:** ¿difieren los centros? ¿y la dispersión entre grupos?
""")

code("""
# Ajuste del modelo de regresión lineal
modelo1 <- lm(formula1, data = d1)
summary(modelo1)

# Intervalos de confianza del 95% para los coeficientes
confint(modelo1)
""")

md("""
✏️ **Resultados principales.** Para cada coeficiente: dirección, magnitud en unidades de la respuesta, "manteniendo las demás variables constantes", y si es estadísticamente distinto de cero. Para las categóricas, la comparación es frente a la categoría base. Reporta también el R² ajustado: ¿qué proporción de la variabilidad explica el modelo?
""")

md("""
### Validación de supuestos (pregunta 1)

Para cada supuesto escribe: **qué exige el modelo → qué muestra la evidencia → si se cumple → cómo afecta las conclusiones**.
""")

code("""
# Linealidad y homocedasticidad: residuos vs valores ajustados
plot(modelo1, which = 1)

# Normalidad de residuos: QQ-plot
plot(modelo1, which = 2)

# Prueba de normalidad (Shapiro-Wilk admite hasta 5000 datos)
shapiro.test(residuals(modelo1))

# Prueba de varianza constante (H0: varianza constante)
ncvTest(modelo1)

# Multicolinealidad: valores mayores que 5 merecen atención
vif(modelo1)

# Observaciones influyentes: distancia de Cook
plot(modelo1, which = 4)
""")

md("""
✏️ **Discusión de supuestos.**
- *Linealidad:* ...
- *Homocedasticidad:* ...
- *Normalidad de residuos:* ...
- *Independencia:* ¿cómo se recolectaron los datos? ¿hay unidades repetidas o dependencia temporal?
- *Multicolinealidad e influyentes:* ...

✏️ **Conclusión de la pregunta 1:** responde la pregunta en 3-5 líneas, sin lenguaje causal si el diseño es observacional.
""")

code("""
# (Opcional) ANOVA: si la pregunta compara el promedio de y1 entre grupos categóricos
x_cats1 <- x1[sapply(d1[x1], is.factor)]
modelo_anova <- aov(reformulate(x_cats1, response = y1), data = d1)
summary(modelo_anova)

# Supuestos del ANOVA
qqnorm(residuals(modelo_anova)); qqline(residuals(modelo_anova))
leveneTest(reformulate(x_cats1[1], response = y1), data = d1)

# Qué grupos difieren (si el ANOVA es significativo)
TukeyHSD(modelo_anova, x_cats1[1])
""")

md("""
## 4. Pregunta de investigación 2

✏️ **Pregunta:** ¿Qué variables ayudan a explicar ...?

✏️ **Variable respuesta:** nombre, tipo (binaria) y cuál categoría es el "evento".

✏️ **Variables explicativas:** nombre, tipo y argumento.

✏️ **Justificación del modelo.** Ejemplo: *"La variable respuesta solo toma dos valores, por lo que modelamos la probabilidad del evento con regresión logística; una regresión lineal podría predecir probabilidades menores que 0 o mayores que 1. Como complemento, un árbol de decisión ofrece reglas interpretables con entradas numéricas y categóricas."*
""")

code("""
# Filas completas en las variables de la pregunta 2
d2 <- na.omit(datos[, c(y2, x2)])
d2[[y2]] <- droplevels(as.factor(d2[[y2]]))
nrow(d2)

# Balance de clases y categoría modelada (glm modela el SEGUNDO nivel)
table(d2[[y2]])
prop.table(table(d2[[y2]]))
levels(d2[[y2]])

formula2 <- reformulate(x2, response = y2)
formula2
""")

code("""
# Gráfica 1: explicativa numérica según la respuesta
x_num2 <- x2[sapply(d2[x2], is.numeric)][1]
x_cat2 <- x2[sapply(d2[x2], is.factor)][1]

ggplot(d2, aes(x = .data[[y2]], y = .data[[x_num2]])) +
  geom_boxplot() +
  labs(title = paste(x_num2, "según", y2), x = y2, y = x_num2)
""")

code("""
# Gráfica 2: proporción de cada categoría de la respuesta por una explicativa categórica
ggplot(d2, aes(x = .data[[x_cat2]], fill = .data[[y2]])) +
  geom_bar(position = "fill") +
  labs(title = paste("Proporción de", y2, "por", x_cat2), x = x_cat2, y = "Proporción", fill = y2)
""")

md("""
✏️ **Interpretación de las gráficas.**
""")

code("""
# Ajuste de la regresión logística
modelo2 <- glm(formula2, data = d2, family = binomial)
summary(modelo2)

# Odds ratios con intervalos de confianza del 95%
exp(cbind(OR = coef(modelo2), confint.default(modelo2)))
""")

md("""
✏️ **Resultados principales.** Interpreta cada odds ratio: OR > 1 aumenta los odds del evento, OR < 1 los reduce, controlando por las demás variables. Recuerda que los odds no son probabilidades.
""")

code("""
# Calidad de clasificación con umbral 0.5
d2$prob <- predict(modelo2, type = "response")
d2$pred <- factor(ifelse(d2$prob >= 0.5, levels(d2[[y2]])[2], levels(d2[[y2]])[1]),
                  levels = levels(d2[[y2]]))

confusion2 <- table(Observado = d2[[y2]], Predicho = d2$pred)
confusion2

accuracy      <- sum(diag(confusion2)) / sum(confusion2)
sensibilidad  <- confusion2[2, 2] / sum(confusion2[2, ])
especificidad <- confusion2[1, 1] / sum(confusion2[1, ])
c(accuracy = accuracy, sensibilidad = sensibilidad, especificidad = especificidad)

# Curva ROC y área bajo la curva
roc2 <- roc(d2[[y2]], d2$prob, quiet = TRUE)
plot(roc2, main = "Curva ROC - regresión logística")
auc(roc2)
""")

code("""
# Complemento: árbol de decisión con partición entrenamiento / prueba
set.seed(123)
idx   <- sample(seq_len(nrow(d2)), size = round(0.7 * nrow(d2)))
train <- d2[idx, c(y2, x2)]
test  <- d2[-idx, c(y2, x2)]

arbol <- rpart(formula2, data = train, method = "class")
rpart.plot(arbol)

# Evaluación en datos de prueba
pred_arbol <- predict(arbol, newdata = test, type = "class")
confusion_arbol <- table(Observado = test[[y2]], Predicho = pred_arbol)
confusion_arbol
sum(diag(confusion_arbol)) / sum(confusion_arbol)   # accuracy en prueba
diag(confusion_arbol) / rowSums(confusion_arbol)     # recall por clase

# Complejidad: ¿conviene podar?
printcp(arbol)
""")

md("""
### Validación de supuestos y calidad del modelo (pregunta 2)

✏️ Discute:
- *Respuesta binaria y balance de clases:* ...
- *Independencia de las observaciones:* ...
- *Eventos suficientes por coeficiente:* ...
- *Calidad de clasificación:* matriz de confusión, sensibilidad, especificidad y AUC. ¿El modelo supera al modelo trivial que siempre predice la clase mayoritaria?
- *Árbol:* desempeño en datos de prueba, posible sobreajuste, reglas principales.

✏️ **Conclusión de la pregunta 2.**
""")

code("""
# (Opcional) Tabla de contingencia: si respuesta y explicativas son categóricas
tabla <- table(d2[[y2]], d2[[x_cat2]])
tabla
prop.table(tabla, margin = 2)

prueba <- chisq.test(tabla)
prueba
prueba$expected   # supuesto: frecuencias esperadas >= 5 en la mayoría de celdas
""")

md("""
## 5. Discusión general

✏️ **Qué aprendimos de los datos.**

✏️ **Conclusiones razonables.**

✏️ **Conclusiones que NO se pueden hacer** (por ejemplo, causalidad con datos observacionales, generalizar a otra población, inferencias individuales con datos agregados).

✏️ **Posibles sesgos:** selección, medición, variables omitidas, datos faltantes.

✏️ **Limitaciones del diseño o de la base.**

✏️ **Mejoras para futuros análisis.**

---
**Referencia de los datos:** ✏️ cita completa y enlace.
""")

nb = {
    "nbformat": 4,
    "nbformat_minor": 0,
    "metadata": {
        "colab": {"provenance": []},
        "kernelspec": {"name": "ir", "display_name": "R", "language": "R"},
        "language_info": {"name": "R"},
    },
    "cells": cells,
}

out = ROOT / "plantilla_entrega2.ipynb"
out.write_text(json.dumps(nb, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"Escrito {out} ({len(cells)} celdas)")

if "--r-script" in sys.argv:
    target = Path(sys.argv[sys.argv.index("--r-script") + 1])
    body = "\n\n".join("".join(c["source"]) for c in cells if c["cell_type"] == "code")
    target.write_text(body + "\n", encoding="utf-8")
    print(f"Escrito {target}")
