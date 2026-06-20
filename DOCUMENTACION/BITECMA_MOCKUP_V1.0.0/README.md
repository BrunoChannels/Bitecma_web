# BITECMA_MOCKUP_V1.0 — Documentación técnica

Este mockup es una versión “estática + lógica en memoria” (sin backend) construida en HTML/CSS/JS vanilla. Su objetivo es simular el flujo completo del sistema (login, navegación, operaciones, EVADIR, etc.) manteniendo una base de datos local en memoria para poder realizar acciones CRUD dentro del navegador.

## 1) Cómo se ejecuta

- Abrir el archivo [index.html](file:///c:/Users/bruno/Documents/Trabajo/BITECMA/MockUp/Proyecto%20Estructura%20HTML/BITECMA_MOCKUP_V1.0/index.html) en el navegador (Edge/Chrome).
- No requiere servidor, ni instalación de dependencias.

Notas:
- La “BD” es un objeto en memoria; al recargar la página se pierden cambios.
- El visualizador “Abrir en pestaña” usa `window.open()` y renderiza tablas en una nueva ventana.

## 2) Qué se hizo (resumen)

1. Se tomó el HTML monolítico (todo en un solo archivo) y se separó en una estructura clásica:
   - `index.html` como punto de entrada.
   - `styles/` para CSS.
   - `pages/` para las páginas.
   - `components/` para piezas reutilizables + bootstrap de la app.
2. Se mantuvo la BD local (en memoria) y la lógica funcional (modales, toasts, filtros, creación de operaciones/botes, ingreso L-P, densidad, EVADIR, vista en pestaña).
3. Se reemplazaron íconos tipo emoji por íconos SVG simples (estilo oficina) en topbar/sidebar.
4. Se eliminó el botón “Informes” del sidebar (la página sigue existiendo en el DOM; simplemente ya no se navega desde el menú).

## 3) Estructura de carpetas

Ruta base: `BITECMA_MOCKUP_V1.0/`

- [index.html]
  - Carga fuentes, CSS y scripts.
  - Orden de carga: primero `pages/*` (definen funciones `pageX()`), luego `components/*`.

- `styles/`
  - [main.css]
  - Contiene **todo el estilo** que antes estaba dentro del `<style>` del HTML monolítico.

- `pages/` (solo markup de páginas)
  - Cada archivo exporta 1 función que retorna el HTML de la página:
    - [dashboard.js]
    - [ops.js]
    - [evadir.js]
    - [historico.js]
    - [informe.js]
    - [especies.js]
    - [sectores.js]
    - [orgs.js]

  Importante:
  - En `pages/` no hay lógica de negocio, sólo HTML (string templates).
  - Los `onclick="..."` llaman funciones globales definidas por `components/app.js`.

- `components/` (componentes/reutilizables + lógica)
  - [templates.js]
    - `svgIcon(name)`: íconos SVG (topbar/sidebar).
    - `tplLogin()`: HTML del login.
    - `tplApp()`: HTML de la app (topbar + sidebar + contenedor main) y ensamble de páginas:
      - Inserta `pageDashboard()`, `pageOps()`, `pageEvadir()`, etc.
    - El botón “Informes” del sidebar fue removido aquí.
  - [app.js]
    - Bootstrap: renderiza en `#root` el login y la app (`tplLogin() + tplApp()`).
    - Define la BD local en memoria (`DB`) y catálogos (`ESPECIES`, `SECTORES`, `ORGS`).
    - Define las funciones globales que usan las páginas (navegación, modales, CRUD, generación EVADIR, etc.).

## 4) Flujo funcional (alto nivel)

### 4.1 Login

- Pantalla login (`tplLogin()`).
- `enterApp()` oculta login y muestra la app, renderiza dashboard (barras), maestro de especies y continuidad histórica.

### 4.2 Navegación

- Sidebar llama `goPage('id')`.
- `goPage(id)`:
  - Activa/desactiva `.page.active`.
  - Marca `.nav.on`.
  - Actualiza breadcrumb del topbar.
  - Si se entra a Operaciones (`id === 'ops'`), inicializa filtros y renderiza la lista.

### 4.3 Operaciones

La operación contiene:
- Datos de cabecera (región, sector, org, seg, fechas).
- Botes: cada bote contiene 2 “ramas” de datos:
  - **Peso-Longitud** por bote/zona (muestras por especie).
  - **Densidad** por unidad (transecto o cuadrante).

Acciones principales:
- “Nueva operación” -> `openNuevaOp()` / `crearOp()`.
- “Agregar bote” -> `openNuevoBote()` / `crearBote()`.
- En un bote:
  - Seleccionar especies L-P -> `openSelEspeciesLP()` / `confirmarEspeciesLP()`.
  - Ingresar muestras L-P -> `openIngresarMuestras()` / `addLP()` / `borrarLP()` / `finalizarLP()`.
  - Agregar transecto/cuadrante -> `openNuevoTransecto()` / `crearTransecto()`.
  - Agregar especies a densidad -> `openAddEspTx()` / `confirmarEspTx()`.
  - Editar conteos y cubierta -> `updateCount()` / `updateCubierta()`.

### 4.4 Generación EVADIR

- “Generar EVADIR” -> `openGenEvadir()` -> seleccionar operación -> `openEvadirPreview(opId)`.
- `openEvadirPreview`:
  - Construye tabla DENSIDAD (incluye transectos y cuadrantes, densidad calculada como `N / área`).
  - Construye tablas L-P por especie y bote.
  - Permite abrir “Densidad” en otra pestaña con `openInTab('densidad_<opId>')`.

### 4.5 Histórico

- Tabla continuidad se rellena en `renderContinuity()` y puede abrirse con `openInTab('historico')`.

## 5) Base de datos local (en memoria)

La BD está en [app.js] como:

- `DB.operaciones[]`
  - `id`, `region`, `sector`, `tipoOrg`, `org`, `numSeg`, `fechaInicio`, `fechaFin`
  - `botes[]`
    - `id`, `nombre`, `buzo`, `zona`
    - `lpMuestras`: diccionario `{ [idEspecie]: Array<{ l:number, p?:number }> }`
    - `transectos`: array de unidades `{ num, tipo, area, fecha, x, y, lon, lat, sustrato, cubierta, counts }`
      - `tipo`: `"transecto"` o `"cuadrante"`
      - `counts`: diccionario `{ [idEspecie]: number }`

Exposición para debugging:
- `window.__DB__ = DB`
- `window.__ESPECIES__ = ESPECIES`

## 6) Cambios solicitados (última modificación)

- Sidebar: se eliminó el botón de “Informes” en [templates.js]
