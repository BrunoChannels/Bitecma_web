# 🌊 BITECMA WEB
### Plataforma de Gestión de Evaluaciones de Recursos Bentónicos

> Sistema digital para la gestión integral de operaciones de muestreo submarino, reemplazando el flujo manual en Excel por una plataforma centralizada, trazable y accesible desde cualquier dispositivo. Accesible desde la página web www.amerb.bitecma.cl.

Actualmente se puede ingresar como Visualizador a la página web con el siguiente usuario:

| Usuario | Contraseña |
|---------|-------------|
| visualizador@visualizador.cl | 12345678 |

|Documentación de API vía Swagger:|
|----------------------|
|https://bitecma.cl/api/docs/|

---

## ¿Para quién es esta plataforma?

BITECMA WEB está diseñada para el equipo técnico de **BITECMA Ltda.**, empresa consultora chilena especializada en biología marina y evaluación de stock bentónico. Sus usuarios principales son:

| Rol | Descripción |
|-----|-------------|
| **Administrador** | Gestión total del sistema: usuarios, maestros, respaldos y auditoría |
| **Usuarior** | Registro y análisis de operaciones, densidad, biometría L-P y EVADIR |
| **Visualizador** | Acceso de solo lectura para revisión de informes y datos históricos |

---

## ¿Qué problema resuelve?

Antes de BITECMA WEB, el equipo técnico gestionaba las evaluaciones directas (EVADIRs) mediante planillas Excel dispersas en múltiples dispositivos, lo que generaba:

- ❌ Pérdida y duplicación de datos entre campañas
- ❌ Imposibilidad de acceso simultáneo al historial
- ❌ Errores manuales en cálculos de densidad y peso-longitud
- ❌ Ausencia de trazabilidad para SERNAPESCA y SUBPESCA

BITECMA WEB centraliza todo el flujo en una sola plataforma digital.

---

## Funcionalidades principales

### 🖥️ Plataforma Web (oficina y análisis)
- **Autenticación con roles** — Acceso controlado por perfil (Admin, Consultor, Operador, Invitado)
- **Dashboard con KPIs** — Resumen de operaciones activas, especies y cuotas
- **Gestión de Operaciones** — Registro completo de campañas: cabecera, botes, transectos, cuadrantes
- **Módulo de Densidad** — Conteo de individuos por especie (ind/m²) por unidad de muestreo
- **Biometría L-P** — Registro de datos longitud-peso con cálculo automático W = a·Lᵇ
- **Generación de EVADIR** — Exportación de evaluaciones directas en formato Excel (`.xlsx`) listo para SERNAPESCA
- **Carga masiva** — Importación de planillas Excel históricas al sistema
- **Gestión de Maestros** — CRUD de especies, caletas, sectores AMERB, OPAs y botes
- **Auditoría** — Trazabilidad de cada registro ingresado al sistema
- **Respaldo SQL** — Descarga del backup de base de datos directamente desde el panel Admin

---

## Tech Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 18 + Vite 5 + Bootstrap 5 |
| Backend | PHP 8 (router `index.php`) | (Documentación: https://bitecma.cl/api/docs/)
| Base de Datos | MySQL 5.7.44 (InnoDB) |
| Autenticación | JWT + CORS + SSL/HTTPS |
| Exportación Excel | `xlsx-js-style` |
| Hosting | cPanel Shared Hosting |
| Control de Versiones | Git + GitHub |

---

## Cómo usar la plataforma web

### 1. Iniciar sesión

Accede a la URL del sistema e ingresa con tu correo y contraseña institucional. El sistema cargará tu perfil y habilitará las secciones según tu rol.

### 2. Registrar una operación

1. Ve al módulo **Operaciones** en el menú lateral
2. Haz clic en **Nueva Operación**
3. Completa los datos de cabecera: región, caleta, sector AMERB, OPA y fecha
4. Agrega los botes y buzos asociados a la campaña
5. Por cada bote, registra los transectos y cuadrantes muestreados

### 3. Ingresar datos de densidad

Dentro de una operación activa:
1. Selecciona la unidad de muestreo (transecto / cuadrante)
2. Ingresa el conteo de individuos por especie
3. El sistema calcula automáticamente la densidad en ind/m²

### 4. Registrar biometría L-P

1. Accede al módulo **Biometría** de la operación
2. Ingresa talla (cm) y peso (g) por individuo muestreado
3. El sistema aplica la relación W = a·Lᵇ por especie

### 5. Generar y descargar EVADIR

1. Con la operación cerrada, ve a **Informes**
2. Haz clic en **Descargar EVADIR (.xlsx)**
3. El archivo descargado está listo para adjuntar a SERNAPESCA

### 6. Descargar respaldo de base de datos *(solo Admin)*

1. Ve a **Configuración del Sistema**
2. Haz clic en **Generar y Descargar Respaldo SQL**
3. El sistema genera y descarga automáticamente el archivo `bitecmac_web_backup_[fecha].sql`

> ⚠️ El sistema notifica al Administrador si han pasado más de 7 días desde el último respaldo.

## Derechos de Autor y Licencia

**© 2026 [BITECMA Ltda]. Todos los derechos reservados.**

El código fuente, diseño, arquitectura y documentación del proyecto "Bitecma Web Sistema de Gestión Amerb" son de carácter propietario y código cerrado. 

Queda estrictamente prohibida la copia, reproducción, modificación, distribución, publicación, exhibición o transmisión de cualquier parte de este software, ya sea con fines comerciales o no comerciales, sin la autorización previa, expresa y por escrito del titular de los derechos de autor. 

El acceso a este repositorio no otorga ningún derecho o licencia implícita sobre la propiedad intelectual del proyecto.

