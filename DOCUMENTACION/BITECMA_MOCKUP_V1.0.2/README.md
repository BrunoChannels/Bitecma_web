# BITECMA MOCKUP v1.0 — Evolución desde HTML monolítico a estructura modular

ÍNDICE DE CAMBIOS — De HTML monolítico a estructura modular

Resumen
- Se migró desde un HTML monolítico hacia una estructura modular con componentes y páginas separadas.
- La pantalla de Login ahora vive en pages/login.js y se carga como inicio desde index.html.
- Se mantuvo el layout principal y utilidades en components, y los estilos en styles.

## Objetivo
- Separar responsabilidades: pantalla de login como página propia, layout/plantillas en `components`, y páginas funcionales en `pages`.
- Facilitar mantenibilidad y escalabilidad del mockup.

## Cambios clave
- `pages/login.js`
  - Nueva ubicación de la pantalla de inicio de sesión.
  - Define la función global `tplLogin()` que construye el HTML de `#scr-login`.

- `components/svgIcon.js`
  - Íconos SVG centralizados en `svgIcon(name)`.

- `components/toast.js`
  - Lógica de notificaciones `toast(msg, type)` separada.

- `components/modal.js`
  - Lógica de modales `openMo/closeMo/closeMoOut/openNotif` separada.

- `components/topbar.js`
  - Plantilla `tplTopbar()` del encabezado.

- `components/sidebar.js`
  - Plantilla `tplSidebar()` del menú lateral.

- `components/contenedorPaginas.js`
  - Plantilla `tplPageContainer()` que agrupa las páginas en `.main`.

- `components/templates.js`
  - Se removió la antigua definición de `tplLogin()`.
  - `tplApp()` ahora compone `tplTopbar()`, `tplSidebar()` y `tplPageContainer()`, e incluye `toast` y `modal`.

- `components/app.js`
  - Bootstrap en `#root`: inserta `tplLogin()` + `tplApp()` al cargar.
  - `enterApp()` y `logout()` alternan visibilidad entre `#scr-login` y `#scr-app`.
  - `goPage()` gestiona activación de páginas y breadcrumbs.

- `index.html`
  - Incluye `pages/login.js` antes de `components/templates.js` y `components/app.js` para garantizar que `tplLogin()` esté disponible al iniciar.

- `styles/main.css`
  - Mantiene los estilos del login (`#scr-login`, `.lcard`, `.btn-login`, etc.) y del layout principal.

## Estructura actual
```
BITECMA_MOCKUP_V1.0/
├─ index.html
├─ styles/
│  └─ main.css
├─ components/
│  ├─ svgIcon.js
│  ├─ toast.js
│  ├─ modal.js
│  ├─ topbar.js
│  ├─ sidebar.js
│  ├─ contenedorPaginas.js
│  ├─ templates.js
│  └─ app.js
└─ pages/
   ├─ login.js       # tplLogin — pantalla de inicio
   ├─ dashboard.js
   ├─ ops.js
   ├─ evadir.js
   ├─ historico.js
   ├─ informe.js
   ├─ especies.js
   ├─ sectores.js
   └─ orgs.js
```

## Flujo de inicio
1. `index.html` carga scripts en orden: páginas (`pages/*.js`) → `components/svgIcon.js` → `components/toast.js` → `components/modal.js` → `components/topbar.js` → `components/sidebar.js` → `components/contenedorPaginas.js` → `components/templates.js` → `components/app.js`.
2. En `app.js`, se monta `tplLogin() + tplApp()` dentro de `#root`.
3. `#scr-login` inicia con clase `active`, por lo que la pantalla de login se muestra como inicio.
4. Al pulsar “Ingresar”, `enterApp()` oculta el login y muestra la app (`#scr-app`). Con “Cerrar sesión”, `logout()` devuelve al login.

## Uso
- Abrir `index.html` en un navegador moderno.
- Interactuar con la pantalla de login y navegar por las páginas disponibles desde la barra lateral/topbar.

## Notas
- Los cambios se enfocan en reorganización y no en lógica de negocio.
- Esta estructura facilita convertir el mockup a un framework si se requiere más adelante.
