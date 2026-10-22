# Lexora ⚖️

Sistema de gestión jurídica orientado a estudios pequeños y medianos.

## 🚀 Descripción

Lexora es una aplicación web diseñada para gestionar expedientes judiciales, clientes, tareas y documentación de forma centralizada, permitiendo mejorar la organización y seguimiento de casos.

Este proyecto fue desarrollado como MVP para las materias de Frontend y Backend de la carrera Desarrollo de Software (IFTS N° 11), con frontend y backend conectados a una base de datos real, y continuará desarrollándose como Proyecto Final de la carrera.

---

## 🧩 Funcionalidades principales

- **Gestión de expedientes**: alta, edición, búsqueda y filtrado, con datos generales (carátula, fuero, juzgado, jurisdicción, instancia, prioridad, etc.)
- **Gestión de clientes**: personas físicas y jurídicas, con baja lógica (activo/inactivo) y vista de expedientes asociados
- **Novedades**: timeline de actuaciones procesales por expediente, con adjuntos vinculados
- **Documentos**: carga, edición y descarga de archivos por expediente, almacenados en Cloudinary, con relación opcional a una novedad
- **Tareas y agenda**: plazos y tareas asociadas a novedades, con vista de calendario y de lista, prioridad, estado y responsable
- **Log de seguridad**: registro de actividad del sistema con exportación a Excel
- **Sistema de autenticación**: login con JWT y perfil de usuario
- **Catálogos dinámicos**: todos los enums (tipos, estados, prioridades, roles) se cargan desde la base de datos, sin valores hardcodeados

---

## 🏗️ Arquitectura

### Frontend

Organizado siguiendo una arquitectura basada en features, con componentes standalone:

```text
src/
├── app/
│   ├── shared/
│   │   ├── components/   # UiModal, UiInput, UiSelect, UiTable, UiBadge,
│   │   │                 # UiPagination, UiConfirmModal, PrimaryBtn, etc.
│   │   └── layout/       # MainLayout, Sidebar, Topbar
│   └── features/
│       ├── gestion-expedientes/
│       │   ├── pages/         # expediente-list, expediente-view, expediente-edit
│       │   ├── components/    # datos-generales, novedades, documentos
│       │   └── services/
│       ├── clientes/
│       ├── agenda/
│       ├── log/
│       └── auth/
```

### Backend

```text
src/
├── config/        # conexión a SQL Server, Cloudinary
├── controllers/
├── services/
├── repositories/
├── routes/
└── middlewares/   # auth, upload de archivos
```

Patrón en capas: **routes → controller → service → repository**, separando la lógica de negocio del acceso a datos en todos los módulos (expedientes, clientes, documentos, novedades, tareas, usuarios, logs).

---

## 🛠️ Stack tecnológico

**Frontend**
- Angular (Standalone Components)
- TypeScript
- Tailwind CSS

**Backend**
- Node.js + Express
- SQL Server (mssql)
- Cloudinary (almacenamiento de documentos)
- JWT (autenticación)
- Multer (carga de archivos)

---

## ▶️ Instalación

### Backend

```bash
cd lexora-app/backend
npm install
node src/server.js
```

Configurar las variables de entorno en `.env` (conexión a SQL Server, credenciales de Cloudinary y secret de JWT). Las variables del asistente Litis y de los resúmenes con IA están explicadas en `backend/.env.example`.

### Resúmenes de documentos con IA

Los documentos que se suben se resumen solos en segundo plano cuando `RESUMEN_IA_HABILITADO=true` y hay una `ANTHROPIC_API_KEY` en el `.env`. La tabla se crea con `backend/db/scripts/001_documento_resumen.sql`.

Para resumir los documentos que ya estaban cargados (se corre una vez, o cuando haga falta):

```bash
cd lexora-app/backend
npm run backfill:resumenes -- --simular
```

`--simular` muestra cuántos documentos hay y el costo estimado sin tocar nada. Sin esa opción, los encola y los procesa (pide confirmación). Otras opciones:

| Opción | Qué hace |
|---|---|
| `--limite N` | Procesa como máximo N documentos (útil para probar con pocos). |
| `--lote N` | Documentos por tanda (por defecto 5). |
| `--pausa S` | Segundos de pausa entre tandas (por defecto 5). |
| `--solo-encolar` | Solo los encola; los procesa el servidor con el proceso en segundo plano. |
| `--reintentar-errores` | Vuelve a intentar los documentos que quedaron con error. |
| `--si` | No pide confirmación. |

Se puede cortar con Ctrl+C y volver a correr: los documentos ya encolados o resumidos no se repiten. Al final muestra cuántos se resumieron y el motivo de los que fallaron.

### Frontend

```bash
git clone https://github.com/naiaraf-dev/lexora-app.git
cd lexora-app/frontend
npm install
ng serve
```

Abrir en el navegador: `http://localhost:4200`

---

## 👥 Autores (Grupo 4)

- Naiara Feinsilber
- Facundo Berguerand
- Cecilia Fernández
- Gerónimo Olivelli