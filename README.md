Implementación de Aplicación Nativa Android para Gestión Operacional Bitecma

Migración integral del sistema de gestión AMERB a plataforma móvil nativa utilizando Kotlin, Jetpack Compose y Material3. La arquitectura se basa en un modelo de datos reactivo con soporte para operaciones híbridas (Online/Offline) y sincronización con el servidor central mediante Retrofit.

Key Implementations

- Core Architecture & State Management
  - Implementación de DataManager para la centralización de listados maestros (Botes, Especies) y persistencia de operaciones locales.
  - Gestión de estado global mediante AppState para el monitoreo reactivo del estado de conexión (Online/Offline) en toda la UI.
  - Navegación declarativa mediante Compose Navigation con paso de argumentos tipados.
    
- Authentication & Security
  - Sistema de autenticación híbrido con validación prioritaria vía API REST y fallback automático a base de datos local cifrada.
  - Implementación de validaciones de dominio corporativo y gestión de perfiles de usuario (Admin/Operador).
    
- Operational Modules
  - Botes & Especies : Filtros avanzados por región, búsqueda indexada por RPA/Matrícula y visualización de metadatos técnicos.
  - Operaciones : Gestión de flujos de trabajo en terreno, incluyendo modales de ingreso de datos con validaciones por expresiones regulares (Regex) para integridad de fechas y sectores.
  - EVADIR : Interfaz de previsualización de capturas estructurada para exportación a plataformas externas (SERNAPESCA).
    
- Dashboard & Analytics
  - Visualización de métricas críticas (Muestras L-P, Densidad) mediante componentes de UI personalizados.
  - Gráficos de composición por especie con indicadores de progreso dinámicos y escalamiento de colores según densidad.
    
Connectivity & Networking
- Integración de cliente Retrofit con interceptores de loggeo para auditoría de tráfico.
- Configuración de android:usesCleartextTraffic y políticas de seguridad de red para comunicación cifrada con el servidor Cpanel.
  
Build Configuration & Dependencies
- SDK : CompileSdk 35 (Android 15), MinSdk 24.
- Compose : Versión BoM 2024.04.01 para resolución de conflictos de animación Material3.
- Gradle : Plugin 8.2.0 con supresión de advertencias para SDK experimental.
- Kotlin : Versión 1.9.23 con compilador 1.5.11.
