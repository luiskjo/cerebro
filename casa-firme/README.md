# Casa Firme

Evaluación post-sismo de viviendas y generación de planes de reparación, para brigadas mixtas de
voluntarios en campo e ingenieros y arquitectos revisando en remoto.

Pensado para viviendas de uno y dos pisos en **mampostería (ladrillo o bloque)**, **bahareque
(tradicional y encementado)**, **tapia/adobe** y combinaciones de estas, con cubiertas de guadua o
madera y teja de barro — la tipología dominante en los municipios pequeños alrededor de Cali.

> **Proyecto independiente.** No comparte código, dependencias ni configuración con el resto de este
> repositorio. Todo lo suyo vive dentro de `casa-firme/` y se puede mover a su propio repositorio con
> un `git mv` sin tocar nada más.

## El flujo

1. **Voluntario en campo** recorre la vivienda con una lista de chequeo guiada. Cada pregunta trae un
   dibujo de qué mirar y cómo medirlo, sin jerga. Funciona sin señal.
2. **La app calcula un semáforo preliminar** de habitabilidad (verde / amarillo / rojo) y un grado de
   daño por componente, siguiendo el esquema del ATC-20 y los grados de daño de la EMS-98.
3. **Un ingeniero o arquitecto revisa** el reporte y las fotos desde donde esté. Confirma o cambia la
   clasificación, elige del catálogo qué reparaciones entran, agrega recomendaciones y firma.
4. **La app genera el plan de acción**: obras ordenadas en tres etapas (seguridad → reparación →
   mejora), cada una con instrucciones paso a paso, advertencias de seguridad, dibujos, materiales y
   cantidades calculadas a partir de las medidas tomadas en campo.
5. **Lista de compras consolidada** para toda la vivienda, con desperdicio incluido y casillas para ir
   marcando.

## Decisiones de diseño

- **Sin servidor y sin conexión.** Todo vive en el dispositivo (`localStorage` para los datos,
  `IndexedDB` para las fotos, comprimidas al guardarlas). La sincronización es un archivo `.json` que
  se exporta y se importa. En la zona no hay señal confiable y no hay presupuesto de infraestructura.
  La app se instala como PWA y precachea todo con un service worker: **basta con abrirla una vez con
  señal para que después funcione completa sin datos**, incluida la navegación entre pantallas.
- **Interfaz en español, sin jerga técnica.** El usuario objetivo no sabe de construcción. "Grieta de
  1 a 5 mm" se explica como "entra la uña o el canto de una moneda".
- **Dibujos vectoriales dentro del código.** Nada de imágenes externas: los dibujos son SVG en React,
  pesan poco, se ven bien en cualquier pantalla, se amplían con un toque y funcionan sin conexión.
- **El sistema propone, el profesional decide.** La app nunca declara una vivienda habitable por su
  cuenta ni genera obra ejecutable sin firma. La clasificación automática existe para **priorizar**,
  no para decidir.
- **Conservador por diseño.** Cualquier condición de peligro grave (una sola) manda la vivienda a
  rojo. El grado de daño máximo se reserva para lo observado directamente, nunca se alcanza por
  acumulación de hallazgos menores.

## Correr el proyecto

```bash
cd casa-firme
npm install
npm run dev        # desarrollo
npm run build      # producción (sale a dist/, con rutas relativas)
npm test           # pruebas de las reglas y de las cantidades
npm run check      # typecheck
```

Es una aplicación estática: `dist/` se puede publicar en cualquier hosting o servir desde una carpeta.
Usa rutas de hash, así que no necesita configuración de servidor.

### Despliegue en Vercel

El proyecto vive en un subdirectorio del repositorio, así que en Vercel hay que apuntar el
**Root Directory** a `casa-firme`. Lo demás lo detecta solo (framework Vite, `npm run build`,
salida en `dist`); `vercel.json` fija las cabeceras de caché — el service worker **no** se cachea,
los assets con hash sí, para siempre.

Desde la terminal, con un token de acceso:

```bash
cd casa-firme
npx vercel deploy --prod --yes --token "$VERCEL_TOKEN"
```

Para instalarla en el teléfono: abrir la URL en el navegador y elegir «Agregar a pantalla de inicio».
Después de esa primera visita con señal, funciona sin datos.

## Mapa del código

```
src/
  domain/
    checklist.ts      Las preguntas: secciones, opciones, severidades, cuándo se muestra cada una
    reglas.ts         De respuestas a grado de daño por componente y semáforo de habitabilidad
    reparaciones.ts   Catálogo de técnicas: cuándo aplica cada una, pasos, seguridad, materiales
    plan.ts           Arma el plan por etapas y consolida la lista de compras
    *.test.ts         Pruebas de las dos cosas que no pueden estar mal: la calificación y las cantidades
  components/
    diagramas/        Los dibujos, en SVG
    CampoPregunta.tsx Renderiza cualquier pregunta según su tipo
  pages/              Inicio · Nueva vivienda · Evaluación · Reporte · Revisión · Plan · Ayuda · Datos
  lib/
    tipos.ts          Modelo de datos
    almacenamiento.ts Persistencia local, fotos, exportar/importar
    estado.tsx        Contexto de la aplicación
```

Para agregar una pregunta, editar `checklist.ts`. Para agregar una técnica de reparación, editar
`reparaciones.ts`. Ninguna de las dos cosas requiere tocar la interfaz.

## Fundamento técnico

Ver [`docs/INVESTIGACION.md`](docs/INVESTIGACION.md): sistemas constructivos de la región, patrones de
daño, metodología de evaluación post-sismo, técnicas de reparación, los coeficientes de cantidades que
usa la app y las fuentes primarias que faltan por contrastar.

## Límites

- Es una herramienta de **evaluación rápida de habitabilidad**. No es una evaluación estructural
  detallada ni un diseño de refuerzo.
- Las cantidades de material son estimaciones para presupuestar y comprar. Se verifican en obra.
- No reemplaza el formato oficial del municipio ni el criterio profesional en sitio.
- Los datos incluyen información personal de familias afectadas. Ver la advertencia en la pantalla de
  Datos.
