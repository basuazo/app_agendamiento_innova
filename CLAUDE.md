# CLAUDE.md — CoWork App para Reservas

Documento de referencia para Claude Code. Describe el estado actual del proyecto, convenciones, decisiones de arquitectura y trabajo acumulado.

---

## Descripcion del proyecto

App full-stack de agendamiento de maquinas textiles para centros productivos de cowork. Las usuarias reservan maquinas de coser, bordadoras, plotters, planchas, etc. El sistema gestiona multiples espacios (centros productivos), categorias de maquinas dinamicas por espacio, certificaciones por categoria, aprobacion de usuarias nuevas, y sincronizacion opcional con Google Calendar.

**Fecha de inicio:** febrero 2026
**Estado actual:** desplegado en produccion — Render (backend + SPA) + Neon (PostgreSQL)

---

## Stack tecnologico

| Capa | Tecnologia |
|------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Estilos | Tailwind CSS |
| Calendario | FullCalendar |
| Estado global | Zustand |
| Backend | Node.js + Express + TypeScript |
| Base de datos | PostgreSQL |
| ORM | Prisma (schema en `/prisma/`, client en `server/node_modules/.prisma/client`) |
| Autenticacion | JWT + bcrypt |
| Logger | pino + pino-http |
| Seguridad | helmet + express-rate-limit |
| Google Calendar | googleapis (Service Account, sincronizacion opcional) |
| Hosting | Render (Web Service, plan gratuito) |
| BD en la nube | Neon (PostgreSQL serverless, plan gratuito) |

---

## Estructura de archivos

```
App para reservas/
├── CLAUDE.md                        <- este archivo
├── .env.example                     <- variables de entorno de referencia
├── .gitignore
├── package.json                     <- scripts raiz (concurrently)
├── render.yaml                      <- (opcional) config declarativa de Render
├── prisma/
│   ├── schema.prisma                <- schema de BD (fuente de verdad)
│   ├── seed.ts                      <- seed LEGACY (usar el de /server/)
│   └── migrations/                  <- historial de migraciones
├── server/
│   ├── package.json                 <- scripts server + config prisma
│   ├── tsconfig.json
│   ├── .npmrc                       <- production=false (para instalar devDeps en Render)
│   ├── prisma/
│   │   └── seed.ts                  <- seed REAL (ejecutar desde aqui)
│   └── src/
│       ├── app.ts                   <- entry point Express
│       ├── lib/
│       │   ├── prisma.ts            <- instancia Prisma singleton
│       │   └── audit.ts             <- helper logAudit()
│       ├── middleware/
│       │   ├── auth.middleware.ts   <- verifica JWT + resolveSpaceId()
│       │   ├── role.middleware.ts   <- requireAdmin / requireSuperAdmin
│       │   └── upload.middleware.ts <- multer para imagenes
│       ├── controllers/             <- logica de negocio por dominio
│       │   ├── auth.controller.ts
│       │   ├── user.controller.ts
│       │   ├── space.controller.ts  <- NUEVO: gestion de espacios
│       │   ├── resource.controller.ts
│       │   ├── booking.controller.ts
│       │   ├── certification.controller.ts
│       │   ├── training.controller.ts
│       │   ├── comment.controller.ts
│       │   └── settings.controller.ts
│       ├── routes/                  <- definicion de rutas Express
│       │   ├── auth.routes.ts
│       │   ├── user.routes.ts
│       │   ├── space.routes.ts      <- NUEVO
│       │   ├── resource.routes.ts
│       │   ├── booking.routes.ts
│       │   ├── certification.routes.ts
│       │   ├── training.routes.ts
│       │   ├── comment.routes.ts
│       │   └── settings.routes.ts
│       └── services/
│           ├── booking.service.ts
│           └── googleCalendar.service.ts
└── client/
    ├── package.json
    ├── tsconfig.json
    ├── .npmrc                       <- production=false (para instalar devDeps en Render)
    ├── vite.config.ts               <- outDir apunta a server/public
    ├── tailwind.config.ts
    └── src/
        ├── App.tsx                  <- router principal (lazy loading)
        ├── main.tsx                 <- entry point + ErrorBoundary
        ├── vite-env.d.ts
        ├── types/
        │   └── index.ts             <- todos los tipos TypeScript compartidos
        ├── store/                   <- Zustand stores
        │   ├── authStore.ts         <- incluye currentSpaceId y setCurrentSpace
        │   ├── bookingStore.ts
        │   └── resourceStore.ts
        ├── services/                <- llamadas HTTP al backend
        │   ├── api.ts               <- axios instance (timeout 15s, header X-Space-Id)
        │   ├── auth.service.ts
        │   ├── user.service.ts
        │   ├── space.service.ts     <- NUEVO: getAll, create, update, delete
        │   ├── resource.service.ts
        │   ├── booking.service.ts
        │   ├── certification.service.ts
        │   ├── training.service.ts
        │   ├── comment.service.ts
        │   └── settings.service.ts
        ├── utils/
        │   ├── dateHelpers.ts       <- PURPOSE_LABELS, formatDateTime (SIN mapas de categorias)
        │   └── apiError.ts          <- helper getApiError()
        ├── components/
        │   ├── shared/
        │   │   ├── Navbar.tsx          <- selector de espacio para SUPER_ADMIN
        │   │   ├── ProtectedRoute.tsx
        │   │   ├── LoadingSpinner.tsx
        │   │   ├── ErrorBoundary.tsx   <- envuelve la app en main.tsx
        │   │   ├── ConfirmModal.tsx    <- modal reutilizable (variant: danger|warning|success)
        │   │   └── SortableHeader.tsx  <- <th> sortable reutilizable + toggleSort + compareVals
        │   ├── booking/
        │   │   └── BookingModal.tsx    <- wizard multi-step de reservas
        │   ├── calendar/
        │   │   └── CalendarView.tsx    <- FullCalendar
        │   └── admin/
        │       ├── ResourceForm.tsx
        │       └── TrainingModal.tsx
        └── pages/
            ├── LoginPage.tsx
            ├── RegisterPage.tsx        <- selector de espacio al registrarse
            ├── CalendarPage.tsx
            ├── MyBookingsPage.tsx
            ├── MyCertificationsPage.tsx
            ├── CommunityPage.tsx
            ├── ProfilePage.tsx
            ├── admin/
            │   ├── ResourcesPage.tsx
            │   ├── UsersPage.tsx
            │   ├── BookingsPage.tsx
            │   ├── CertificationsPage.tsx
            │   ├── CategoriesPage.tsx  <- NUEVO: gestion de categorias dinamicas
            │   └── SettingsPage.tsx
            └── superadmin/
                └── SpacesPage.tsx      <- NUEVO: gestion de centros productivos
```

---

## Comandos

```bash
# Base de datos local (Docker — solo desarrollo)
docker compose up db -d        # levantar solo la BD en background
docker compose ps              # verificar estado
docker compose down            # detener contenedores

# Desde la raiz del proyecto
npm run dev            # cliente (5173) + servidor (3001) en paralelo
npm run build:prod     # build completo: cliente -> server/public, servidor -> dist/
npm run start          # inicia en produccion (requiere build previo)

# Desde /server/ (o desde la raiz con npm run seed)
npm run seed           # poblar BD con datos de prueba
                       # NOTA: usa dotenv con override:true → siempre lee server/.env
                       # si DATABASE_URL esta en el sistema como var de entorno, se sobreescribe
cd server && npx prisma migrate dev --name <nombre>   # nueva migracion (local)
npm run db:migrate:prod                               # migrar en produccion (Neon)
npx prisma migrate reset --force --skip-seed          # reset completo (borra datos)
```

### Deploy en produccion (Render + Neon)

**Build Command en Render:**
```
npm install && cd client && npm install && cd ../server && npm install && npx prisma generate && npx prisma migrate deploy --schema=../prisma/schema.prisma && cd .. && npm run build:prod
```

**Start Command en Render:**
```
npm run start
```

**Variables de entorno requeridas en Render:**

| Variable | Valor |
|---|---|
| `DATABASE_URL` | URL de Neon con `?sslmode=require` |
| `JWT_SECRET` | cadena aleatoria larga (min 32 chars) |
| `JWT_EXPIRES_IN` | `7d` |
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `CLIENT_URL` | URL del servicio en Render |
| `NPM_CONFIG_PRODUCTION` | `false` |

**Migraciones:** se corren automaticamente en cada deploy via `prisma migrate deploy`.
**Seed en produccion:** correr localmente apuntando a Neon via `server/.env`, o desde Render Shell.

---

## Variables de entorno (server/.env)

```env
# Local (Docker)
DATABASE_URL="postgresql://postgres:cowork123@localhost:5432/cowork_db"

# Produccion (Neon) — formato obligatorio con sslmode=require
# DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"

JWT_SECRET="min_32_caracteres_cambiar_en_produccion"
JWT_EXPIRES_IN="7d"
PORT=3001
CLIENT_URL="http://localhost:5173"

# Google Calendar (opcional)
GOOGLE_CALENDAR_ID="..."
GOOGLE_SERVICE_ACCOUNT_EMAIL="..."
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

---

## Schema de base de datos

### Modelos principales

| Modelo | Descripcion |
|--------|------------|
| `Space` | Centro productivo. Agrupa usuarios, categorias, recursos, trainings, comentarios y horarios |
| `Category` | Categoria de maquina dinamica, pertenece a un Space (reemplaza enum ResourceCategory) |
| `User` | Usuarias con role SUPER_ADMIN/ADMIN/LIDER_TECNICA/LIDER_COMUNITARIA/USER, isVerified, y spaceId (null para SUPER_ADMIN) |
| `Resource` | Maquinas/equipos con categoryId, spaceId y requiresCertification |
| `Booking` | Reservas con status, purpose, campos especiales segun categoria |
| `Certification` | Certificacion aprobada por categoria (unica por usuario+categoria) |
| `CertificationRequest` | Solicitudes de certificacion |
| `Training` | Sesiones de capacitacion con exenciones de recursos |
| `TrainingExemption` | Bloqueo de recurso durante un training |
| `Comment` | Posts de la comunidad con tags e imagen opcional |
| `AuditLog` | Registro de acciones administrativas |
| `BusinessHours` | Horario de apertura por dia de semana, por espacio |

### Enums

```
Role:             SUPER_ADMIN | ADMIN | LIDER_TECNICA | LIDER_COMUNITARIA | USER

BookingStatus:    PENDING | CONFIRMED | CANCELLED | REJECTED
BookingPurpose:   LEARN | PRODUCE | DESIGN | REUNION
CertReqStatus:    PENDING | SCHEDULED | APPROVED | REJECTED
CommentTag:       GENERAL | MACHINE_ISSUE | ORDER | CLEANING
CompanionRelation: CUIDADOS | AMISTAD | OTRO

AuditAction:      USER_CREATED | USER_DELETED | USER_ROLE_CHANGED | USER_VERIFIED |
                  BOOKING_APPROVED | BOOKING_REJECTED | BOOKING_CANCELLED |
                  CERT_REQUEST_APPROVED | CERT_REQUEST_REJECTED | CERTIFICATION_REVOKED |
                  SPACE_CREATED | SPACE_UPDATED | SPACE_DELETED
```

**IMPORTANTE:** El enum `ResourceCategory` fue eliminado. Las categorias son ahora dinamicas en el modelo `Category`. El campo `slug` en Category conserva el valor original (ej. `RECTA_CASERA`) para logica interna.

### Configuracion Prisma

- Schema en `/prisma/schema.prisma`
- Client generado en `server/node_modules/.prisma/client`
- `server/package.json` tiene `"prisma": { "schema": "../prisma/schema.prisma" }`
- EPERM al hacer `prisma generate` con servidor corriendo (DLL locked) — reiniciar servidor despues

---

## Arquitectura multi-espacio

### Concepto
`Space` → `Category` → `Resource`. Cada espacio tiene sus propias categorias y recursos. Los usuarios (excepto SUPER_ADMIN) pertenecen a un unico espacio.

### Roles
- `SUPER_ADMIN`: acceso a todos los espacios. No tiene spaceId propio. Selecciona el espacio activo en el Navbar.
- `ADMIN`: administra su espacio. Tiene spaceId.
- `LIDER_TECNICA`: gestiona certificaciones, capacitaciones y recursos. Tiene spaceId.
- `LIDER_COMUNITARIA`: aprueba reservas, gestiona categorias y recursos, verifica usuarios. Tiene spaceId.
- `USER`: usuaria del espacio al que pertenece.

**Matriz de permisos de roles elevados:**

| Endpoint / accion | ADMIN | LIDER_TECNICA | LIDER_COMUNITARIA |
|---|:---:|:---:|:---:|
| Recursos (CRUD) | ✓ | ✓ | ✓ |
| Categorias (CRUD) | ✓ | — | ✓ |
| Certificaciones (admin) | ✓ | ✓ | — |
| Capacitaciones (crear/borrar) | ✓ | ✓ | — |
| Reservas (aprobar/rechazar/ver todas) | ✓ | — | ✓ |
| Usuarios (ver lista + verificar) | ✓ | — | ✓ |
| Usuarios (crear/editar/borrar/rol) | ✓ | — | — |
| Horarios de negocio | ✓ | — | — |
| Agendar por otra usuaria (targetUserId) | ✓ | ✓ | ✓ |

**Middlewares en `role.middleware.ts`:**
- `requireAdmin` → ADMIN + SUPER_ADMIN
- `requireTecnica` → ADMIN + SUPER_ADMIN + LIDER_TECNICA
- `requireComunitaria` → ADMIN + SUPER_ADMIN + LIDER_COMUNITARIA
- `requireElevated` → todos los roles no-USER
- `requireAnyOf(...roles)` → factory generica

### Header X-Space-Id
El frontend envia el header `X-Space-Id` automaticamente en cada request (via interceptor de axios). El backend usa `resolveSpaceId(req)` en `auth.middleware.ts` para determinar el espacio:
- SUPER_ADMIN: usa el valor del header `X-Space-Id`
- Todos los demas roles: usan su propio `req.user.spaceId`

### Frontend: currentSpaceId
- Guardado en `authStore.currentSpaceId` y `localStorage`
- Al loguear como SUPER_ADMIN, el Navbar auto-selecciona el primer espacio disponible
- El selector del Navbar (solo SUPER_ADMIN) muestra espacios individuales (sin opcion "todos")
- Todos los `useEffect` de carga de datos dependen de `currentSpaceId` para refrescar al cambiar espacio

---

## Rutas de la API

```
POST   /api/auth/register          <- registro (isVerified=false, sin token)
POST   /api/auth/login             <- login (bloquea si !isVerified)

GET    /api/spaces                 <- lista espacios (cualquier auth)
POST   /api/spaces                 <- crear espacio (superadmin)
PUT    /api/spaces/:id             <- editar espacio (superadmin)
DELETE /api/spaces/:id             <- eliminar espacio (superadmin)

GET    /api/users                  <- lista usuarios (admin + lider_comunitaria)
POST   /api/users                  <- crear usuario (admin)
PATCH  /api/users/:id              <- editar usuario, acepta password y spaceId (admin)
PATCH  /api/users/:id/verify       <- verificar usuario (admin + lider_comunitaria)
PATCH  /api/users/:id/role         <- cambiar rol (admin)
DELETE /api/users/:id              <- eliminar usuario (admin)

GET    /api/categories             <- categorias del espacio activo
POST   /api/categories             <- crear categoria (admin + lider_comunitaria)
PUT    /api/categories/:id         <- editar categoria (admin + lider_comunitaria)
DELETE /api/categories/:id         <- eliminar categoria (admin + lider_comunitaria)

GET    /api/resources              <- recursos del espacio activo
POST   /api/resources              <- crear recurso (todos los roles elevados)
PUT    /api/resources/:id          <- editar recurso (todos los roles elevados)
DELETE /api/resources/:id          <- eliminar recurso (todos los roles elevados)

GET    /api/bookings               <- reservas del usuario autenticado
GET    /api/bookings/admin/all     <- todas las reservas (admin + lider_comunitaria)
POST   /api/bookings               <- crear reserva (cualquier auth; targetUserId solo roles elevados)
PATCH  /api/bookings/:id/approve   <- aprobar (admin + lider_comunitaria)
PATCH  /api/bookings/:id/reject    <- rechazar (admin + lider_comunitaria)
PATCH  /api/bookings/:id/cancel    <- cancelar

GET    /api/certifications/mine      <- certificaciones del usuario
GET    /api/certifications/my-requests <- solicitudes propias
POST   /api/certifications/request  <- solicitar certificacion
GET    /api/admin/certifications/requests <- solicitudes pendientes (admin + lider_tecnica)
PATCH  /api/admin/certifications/schedule <- programar sesion (admin + lider_tecnica)
PATCH  /api/admin/certifications/requests/:id/resolve <- resolver (admin + lider_tecnica)
GET    /api/admin/certifications    <- todas las certs (admin + lider_tecnica)
DELETE /api/admin/certifications/:id <- revocar (admin + lider_tecnica)

GET      /api/trainings            <- sesiones de capacitacion (cualquier auth)
POST     /api/admin/trainings      <- crear capacitacion (admin + lider_tecnica)
DELETE   /api/admin/trainings/:id  <- eliminar capacitacion (admin + lider_tecnica)

GET/POST /api/comments             <- comunidad
DELETE   /api/comments/:id

GET/PUT  /api/settings/business-hours  <- horario de negocio (admin)

GET      /api/health               <- health check con DB
```

---

## Reglas de negocio criticas

- **Certificacion por categoria**, no por maquina individual
- Usuario sin cert en la categoria → reserva PENDING (requiere aprobacion admin)
- Roles elevados o recursos con `requiresCertification=false` → reserva CONFIRMED directa
- **Deteccion de conflictos:** `startA < endB AND endA > startB` → 409
- Horario flexible hasta 4 horas por reserva; configurable via BusinessHours (default 09:00-17:00, por espacio)
- Google Calendar solo sincroniza reservas CONFIRMED (no PENDING)
- Maximo 10 usuarias por sesion de certificacion
- Roles elevados pueden agendar a nombre de otra usuaria (`targetUserId` en el body)
- `ESPACIO_REUNION` (slug): auto-selecciona el recurso, oculta selector de maquina y pregunta de acompanante
- date-fns NO instalado en server/ — usar native JS (fmtDate/fmtTime helpers)
- No usar mapas estaticos de colores/labels en frontend — usar `r.category?.color` y `r.category?.name`

---

## Features implementados

### Produccion-ready (auditoria de seguridad aplicada)
- Helmet (headers HTTP seguros)
- Rate limiting en auth: 10 intentos / 15 min
- Graceful shutdown (SIGTERM/SIGINT)
- Pino logger estructurado (pretty en dev, JSON en prod)
- Body limit 1mb
- Health check con ping a DB
- Error handler global (mensaje generico en prod)
- SPA fallback para react-router en prod
- Prisma con logging segun NODE_ENV
- Indexes en BD: Booking (userId, resourceId, status, startTime+endTime), CertificationRequest (userId, status)
- Lazy loading de todas las paginas (React.lazy + Suspense)
- ErrorBoundary global en main.tsx
- Timeout 15s en axios
- `getApiError()` helper para mensajes de error consistentes
- `ConfirmModal` reutilizable con variantes danger / warning / success

### Feature: Multi-espacio (rama feature/multi-espacio)
- Modelo `Space` agrupa categorias, recursos, usuarios, trainings, comentarios y horarios
- Modelo `Category` dinamico reemplaza enum `ResourceCategory`
- Role `SUPER_ADMIN` puede ver y gestionar todos los espacios
- `resolveSpaceId(req)` determina el espacio en cada request del backend
- Header `X-Space-Id` enviado automaticamente por axios interceptor
- Navbar con selector de espacio para SUPER_ADMIN (auto-selecciona el primero al loguear)
- `SpacesPage` para crear/editar/activar/desactivar centros productivos (superadmin)
- `CategoriesPage` para gestionar categorias por espacio (admin)

### Feature: Verificacion de usuarios
- Registro auto-servicio → `isVerified=false`, no devuelve token
- Login bloqueado si `isVerified=false` (403)
- Admin crea usuario → `isVerified=true` automaticamente
- `PATCH /users/:id/verify` para que admin verifique
- `AuditAction.USER_VERIFIED` registrado
- UsersPage: badge de pendientes, columna Estado, boton Verificar

### Feature: Edicion de usuario ampliada
- Admin y superadmin pueden cambiar la contrasena al editar un usuario (campo password opcional)
- Solo SUPER_ADMIN puede reasignar el espacio de un usuario (`spaceId`)
- Backend hashea la nueva contrasena con bcrypt

### Feature: Admin agenda por usuaria
- BookingModal Step 0 (solo admin): "Para mi / Para otra usuaria"
- Carga lista de usuarios al abrir el modal
- `targetUserId?` en `CreateBookingDto`
- Booking controller usa `targetUserId` si admin lo envia
- Modal muestra nombre de la usuaria seleccionada en steps siguientes

### Feature: Horario de negocio configurable
- Modelo `BusinessHours` (spaceId, dayOfWeek, isOpen, openTime, closeTime)
- `GET/PUT /api/settings/business-hours`
- SettingsPage en admin para configurar horario por dia
- Al crear un espacio nuevo se generan BusinessHours por defecto (lun-sab 09:00-17:00)

### Feature: Auditoria
- `AuditLog` model en BD
- Helper `logAudit(actorId, action, targetType, targetId, meta?)`
- Acciones registradas en operaciones criticas de admin y superadmin (incluye SPACE_*)

### Feature: Calendario mejorado
- `CalendarView.tsx` usa `dateClick` y `eventClick`; un evento FullCalendar por reserva real (no agrupado)
- `slotDuration: "00:30:00"` — franjas de 30 min
- Click en celda con reservas → `slotModal` muestra lista con opcion de ver detalle o agregar nueva reserva
- Detalle de reserva → boton "← Volver" restaura el slotModal (`returnSlot` en estado de detalle)
- Click en celda vacía → abre BookingModal (o actionChoice si rol elevado)
- `hoursLoaded` state en CalendarPage: CalendarView no monta hasta que businessHours se cargue
- `isAdmin = ['ADMIN','SUPER_ADMIN','LIDER_TECNICA','LIDER_COMUNITARIA'].includes(role)` en CalendarPage
- Tiempo flexible de reserva: inputs `startTime`/`endTime` tipo `time`, maximo 4 horas
- Validacion en backend: `endTime > startTime`, duracion <= 4h
- CSS inyectado via `<style>` para mostrar `+` en hover de celdas vacías

### Feature: Roles granulares (LIDER_TECNICA / LIDER_COMUNITARIA)
- Dos nuevos roles con permisos diferenciados (ver matriz en seccion Arquitectura multi-espacio)
- `requireAnyOf(...roles)` factory en `role.middleware.ts`; middlewares especificos: `requireTecnica`, `requireComunitaria`, `requireElevated`
- Navbar muestra items de menu Admin filtrados segun el rol del usuario logueado
- UsersPage: badge de color por rol (indigo=SUPER_ADMIN, purple=ADMIN, blue=LIDER_TECNICA, teal=LIDER_COMUNITARIA), selector de rol en formulario incluye nuevos roles, boton de toggle rapido de rol eliminado
- Migracion: `20260311193438_add_lider_roles`

### Feature: Tablas admin responsivas (scroll horizontal en movil)
- Todas las tablas admin usan `overflow-x-auto` + `min-w-full` (no `w-full`)
- `min-w-full` permite que la tabla exceda el ancho del contenedor → activa el scroll horizontal
- CategoriesPage: se agrego el wrapper `overflow-x-auto` que faltaba

### Feature: Tablas admin ordenables y filtrables
- `SortableHeader` component en `client/src/components/shared/SortableHeader.tsx`
  - Exporta: `SortState` tipo, `toggleSort(current, key)` función, `compareVals(a, b, dir)` función
  - Icono: ↕ cuando sin orden, ↑ ascendente, ↓ descendente (resaltado en brand-500)
- Buscador de texto en todas las páginas admin: filtra en tiempo real mientras se escribe
- Orden A→Z / Z→A al hacer click en el encabezado de cualquier columna
- Páginas actualizadas: UsersPage, BookingsPage, CertificationsPage (3 tabs), ResourcesPage, CategoriesPage
- En CertificationsPage: el sort se resetea al cambiar de tab; el search persiste entre tabs

---

## Credenciales del seed

| Usuario | Email | Password | Role | Espacio |
|---------|-------|----------|------|---------|
| Super Admin | super@cowork.cl | super123 | SUPER_ADMIN | — |
| Admin | admin@cowork.cl | admin123 | ADMIN | Espacio 1 |
| Maria | maria@test.cl | password123 | USER | Espacio 1 |
| Juan | juan@test.cl | password123 | USER | Espacio 1 |
| Sofia | sofia@test.cl | password123 | USER | Espacio 1 |

Todos con `isVerified=true`. Ejecutar desde `/server/`: `npm run seed`

---

## Notas de desarrollo

- `prisma/seed.ts` en la raiz es el seed legacy — el REAL esta en `server/prisma/seed.ts`
- Al hacer `prisma generate` con el servidor corriendo, puede fallar por DLL locked (Windows). Los tipos TS se generan igual; solo reiniciar el servidor.
- El build de produccion compila el cliente y lo copia a `server/public/`, luego el Express sirve el SPA desde ahi.
- Google Calendar es completamente opcional; si no se configuran las variables de entorno, la sincronizacion simplemente no ocurre.
- **Categorias dinamicas:** nunca usar mapas estaticos (`RESOURCE_CATEGORY_COLORS`, `RESOURCE_CATEGORY_LABELS`) en el frontend — fueron eliminados. Usar siempre `resource.category?.color` y `resource.category?.name`.
- **PostgreSQL UPDATE:** no usar alias de la tabla objetivo ni JOIN al actualizar con FROM — usar sintaxis `FROM tabla1, tabla2 WHERE condicion`.
- **Prisma unique indexes:** se crean como `CREATE UNIQUE INDEX`, no como `ADD CONSTRAINT`. Para eliminarlos en SQL usar `DROP INDEX`, no `ALTER TABLE DROP CONSTRAINT`.
- **GET /api/settings/business-hours requiere `authenticate`:** sin el middleware `req.user` es undefined → `resolveSpaceId` devuelve null → 400. Siempre agregar `authenticate` a rutas de settings aunque sean solo lectura.
- **GET /api/spaces es publico:** la pagina de registro (no autenticada) necesita cargar la lista de espacios. Si se requiere auth en esa ruta, el interceptor 401 de axios redirige al login impidiendo el registro.
- **SortableHeader:** importar desde `../../components/shared/SortableHeader` — exporta `SortState`, `toggleSort`, `compareVals` y el componente default. Usar `compareVals` con `localeCompare` con opciones `{ sensitivity: 'base', numeric: true }` — funciona para strings, ISO dates y numeros.
- **Render + devDependencies:** Render setea `NODE_ENV=production`, lo que hace que `npm install` salte devDeps. Fix: `client/.npmrc` y `server/.npmrc` con `production=false`, mas la var de entorno `NPM_CONFIG_PRODUCTION=false` en Render.
- **Seed con dotenv override:** `server/prisma/seed.ts` carga dotenv con `override: true` apuntando a `server/.env`. Si `DATABASE_URL` existe como var de entorno del sistema (ej. apuntando a localhost), se sobreescribe con el valor del `.env`. El script ya no usa `-r dotenv/config`.
- **Neon connection string:** requiere `?sslmode=require` (y opcionalmente `&channel_binding=require`). Sin esto Prisma no conecta en produccion.
