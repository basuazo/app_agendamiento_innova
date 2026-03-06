# CLAUDE.md — CoWork App para Reservas

Documento de referencia para Claude Code. Describe el estado actual del proyecto, convenciones, decisiones de arquitectura y trabajo acumulado.

---

## Descripcion del proyecto

App full-stack de agendamiento de maquinas textiles para un espacio de cowork. Las usuarias reservan maquinas de coser, bordadoras, plotters, planchas, etc. El sistema gestiona certificaciones por categoria de maquina, aprobacion de usuarias nuevas, y sincronizacion opcional con Google Calendar.

**Fecha de inicio:** febrero 2026
**Estado actual:** desarrollo activo, listo para produccion con features principales implementados

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

---

## Estructura de archivos

```
App para reservas/
├── CLAUDE.md                        <- este archivo
├── .env.example                     <- variables de entorno de referencia
├── .gitignore
├── package.json                     <- scripts raiz (concurrently)
├── prisma/
│   ├── schema.prisma                <- schema de BD (fuente de verdad)
│   ├── seed.ts                      <- seed LEGACY (usar el de /server/)
│   └── migrations/                  <- historial de migraciones
├── server/
│   ├── package.json                 <- scripts server + config prisma
│   ├── tsconfig.json
│   ├── prisma/
│   │   └── seed.ts                  <- seed REAL (ejecutar desde aqui)
│   └── src/
│       ├── app.ts                   <- entry point Express
│       ├── lib/
│       │   ├── prisma.ts            <- instancia Prisma singleton
│       │   └── audit.ts             <- helper logAudit()
│       ├── middleware/
│       │   ├── auth.middleware.ts   <- verifica JWT
│       │   ├── role.middleware.ts   <- adminOnly
│       │   └── upload.middleware.ts <- multer para imagenes
│       ├── controllers/             <- logica de negocio por dominio
│       │   ├── auth.controller.ts
│       │   ├── user.controller.ts
│       │   ├── resource.controller.ts
│       │   ├── booking.controller.ts
│       │   ├── certification.controller.ts
│       │   ├── training.controller.ts
│       │   ├── comment.controller.ts
│       │   └── settings.controller.ts
│       ├── routes/                  <- definicion de rutas Express
│       │   ├── auth.routes.ts
│       │   ├── user.routes.ts
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
    ├── vite.config.ts               <- outDir apunta a server/public
    ├── tailwind.config.ts
    └── src/
        ├── App.tsx                  <- router principal (lazy loading)
        ├── main.tsx                 <- entry point + ErrorBoundary
        ├── vite-env.d.ts
        ├── types/
        │   └── index.ts             <- todos los tipos TypeScript compartidos
        ├── store/                   <- Zustand stores
        │   ├── authStore.ts
        │   ├── bookingStore.ts
        │   └── resourceStore.ts
        ├── services/                <- llamadas HTTP al backend
        │   ├── api.ts               <- axios instance (timeout 15s)
        │   ├── auth.service.ts
        │   ├── user.service.ts
        │   ├── resource.service.ts
        │   ├── booking.service.ts
        │   ├── certification.service.ts
        │   ├── training.service.ts
        │   ├── comment.service.ts
        │   └── settings.service.ts
        ├── utils/
        │   ├── dateHelpers.ts       <- RESOURCE_CATEGORY_COLORS/LABELS (11 cats)
        │   └── apiError.ts          <- helper getApiError()
        ├── components/
        │   ├── shared/
        │   │   ├── Navbar.tsx
        │   │   ├── ProtectedRoute.tsx
        │   │   ├── LoadingSpinner.tsx
        │   │   ├── ErrorBoundary.tsx   <- envuelve la app en main.tsx
        │   │   └── ConfirmModal.tsx    <- modal reutilizable (variant: danger|warning|success)
        │   ├── booking/
        │   │   └── BookingModal.tsx    <- wizard multi-step de reservas
        │   ├── calendar/
        │   │   └── CalendarView.tsx    <- FullCalendar
        │   └── admin/
        │       ├── ResourceForm.tsx
        │       └── TrainingModal.tsx
        └── pages/
            ├── LoginPage.tsx
            ├── RegisterPage.tsx
            ├── CalendarPage.tsx
            ├── MyBookingsPage.tsx
            ├── MyCertificationsPage.tsx
            ├── CommunityPage.tsx
            ├── ProfilePage.tsx
            └── admin/
                ├── ResourcesPage.tsx
                ├── UsersPage.tsx
                ├── BookingsPage.tsx
                ├── CertificationsPage.tsx
                └── SettingsPage.tsx
```

---

## Comandos

```bash
# Base de datos (Docker)
docker compose up db -d        # levantar solo la BD en background
docker compose ps              # verificar estado
docker compose down            # detener contenedores

# Desde la raiz del proyecto
npm run dev            # cliente (5173) + servidor (3001) en paralelo
npm run build:prod     # build completo: cliente -> server/public, servidor -> dist/
npm run start          # inicia en produccion (requiere build previo)

# Desde /server/
npm run seed           # poblar BD con datos de prueba
cd server && npx prisma migrate dev --name <nombre>   # nueva migracion
npm run db:migrate:prod                               # migrar en produccion
npx prisma migrate reset --force --skip-seed          # reset completo (borra datos)
```

---

## Variables de entorno (server/.env)

```env
DATABASE_URL="postgresql://user:password@localhost:5432/cowork_db"
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
| `User` | Usuarias con role ADMIN/USER e isVerified |
| `Resource` | Maquinas/espacios con categoria y requiresCertification |
| `Booking` | Reservas con status, purpose, campos especiales segun categoria |
| `Certification` | Certificacion aprobada por categoria (unica por usuario+categoria) |
| `CertificationRequest` | Solicitudes de certificacion |
| `Training` | Sesiones de capacitacion con exenciones de recursos |
| `TrainingExemption` | Bloqueo de recurso durante un training |
| `Comment` | Posts de la comunidad con tags e imagen opcional |
| `AuditLog` | Registro de acciones administrativas |
| `BusinessHours` | Horario de apertura por dia de semana |

### Enums importantes

```
ResourceCategory: RECTA_CASERA | OVERLOCK_CASERA | COLLERETERA | BORDADORA |
                  IMPRESORA_SUBLIMACION | PLOTTER_CORTE | PLANCHA_SUBLIMACION |
                  INDUSTRIAL | PLANCHA_VAPOR | MESON_CORTE | ESPACIO_REUNION

BookingStatus:    PENDING | CONFIRMED | CANCELLED | REJECTED
BookingPurpose:   LEARN | PRODUCE | DESIGN | REUNION
CertReqStatus:    PENDING | SCHEDULED | APPROVED | REJECTED
CommentTag:       GENERAL | MACHINE_ISSUE | ORDER | CLEANING
CompanionRelation: CUIDADOS | AMISTAD | OTRO
AuditAction:      USER_CREATED | USER_DELETED | USER_ROLE_CHANGED | USER_VERIFIED |
                  BOOKING_APPROVED | BOOKING_REJECTED | BOOKING_CANCELLED |
                  CERT_REQUEST_APPROVED | CERT_REQUEST_REJECTED | CERTIFICATION_REVOKED
```

### Configuracion Prisma

- Schema en `/prisma/schema.prisma`
- Client generado en `server/node_modules/.prisma/client`
- `server/package.json` tiene `"prisma": { "schema": "../prisma/schema.prisma" }`
- EPERM al hacer `prisma generate` con servidor corriendo (DLL locked) — reiniciar servidor despues

---

## Rutas de la API

```
POST   /api/auth/register          <- registro (isVerified=false, sin token)
POST   /api/auth/login             <- login (bloquea si !isVerified)

GET    /api/users                  <- lista usuarios (admin)
PATCH  /api/users/:id/verify       <- verificar usuario (admin)
DELETE /api/users/:id              <- eliminar usuario (admin)

GET    /api/resources              <- lista recursos
POST   /api/resources              <- crear recurso (admin)
PUT    /api/resources/:id          <- editar recurso (admin)
DELETE /api/resources/:id          <- eliminar recurso (admin)

GET    /api/bookings               <- reservas del usuario autenticado
GET    /api/bookings/all           <- todas las reservas (admin)
POST   /api/bookings               <- crear reserva
PATCH  /api/bookings/:id/status    <- aprobar/rechazar (admin)
DELETE /api/bookings/:id           <- cancelar

GET    /api/certifications/my      <- certificaciones del usuario
POST   /api/certifications/request <- solicitar certificacion
GET    /api/certifications/requests <- solicitudes pendientes (admin)
PATCH  /api/certifications/requests/:id <- gestionar solicitud (admin)

GET/POST /api/trainings            <- sesiones de capacitacion
DELETE   /api/trainings/:id

GET/POST /api/comments             <- comunidad
DELETE   /api/comments/:id

GET/PUT  /api/settings/business-hours  <- horario de negocio (admin)

GET      /api/health               <- health check con DB
```

---

## Reglas de negocio criticas

- **Certificacion por categoria**, no por maquina individual
- Usuario sin cert en la categoria → reserva PENDING (requiere aprobacion admin)
- Admin o recursos con `requiresCertification=false` → reserva CONFIRMED directa
- **Deteccion de conflictos:** `startA < endB AND endA > startB` → 409
- Slots de 1 hora, horario configurable via BusinessHours (default 09:00-17:00)
- Google Calendar solo sincroniza reservas CONFIRMED (no PENDING)
- Maximo 10 usuarias por sesion de certificacion
- Admin puede agendar a nombre de otra usuaria (`targetUserId` en el body)
- date-fns NO instalado en server/ — usar native JS (fmtDate/fmtTime helpers)

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
- alert() y confirm() nativos reemplazados por modales

### Feature: Verificacion de usuarios
- Registro auto-servicio → `isVerified=false`, no devuelve token
- Login bloqueado si `isVerified=false` (403)
- Admin crea usuario → `isVerified=true` automaticamente
- `PATCH /users/:id/verify` para que admin verifique
- `AuditAction.USER_VERIFIED` registrado
- UsersPage: badge de pendientes, columna Estado, boton Verificar

### Feature: Admin agenda por usuaria
- BookingModal Step 0 (solo admin): "Para mi / Para otra usuaria"
- Carga lista de usuarios al abrir el modal
- `targetUserId?` en `CreateBookingDto`
- Booking controller usa `targetUserId` si admin lo envia
- Modal muestra nombre de la usuaria seleccionada en steps siguientes

### Feature: Horario de negocio configurable
- Modelo `BusinessHours` (dayOfWeek, isOpen, openTime, closeTime)
- `GET/PUT /api/settings/business-hours`
- SettingsPage en admin para configurar horario por dia

### Feature: Auditoria
- `AuditLog` model en BD
- Helper `logAudit(actorId, action, targetType, targetId, meta?)`
- Acciones registradas en operaciones criticas de admin

---

## Credenciales del seed

| Usuario | Email | Password | Role |
|---------|-------|----------|------|
| Admin | admin@cowork.cl | admin123 | ADMIN |
| Maria | maria@test.cl | password123 | USER |
| Juan | juan@test.cl | password123 | USER |
| Sofia | sofia@test.cl | password123 | USER |

Todos con `isVerified=true`. Ejecutar desde `/server/`: `npm run seed`

---

## Notas de desarrollo

- `prisma/seed.ts` en la raiz es el seed legacy — el REAL esta en `server/prisma/seed.ts`
- Al hacer `prisma generate` con el servidor corriendo, puede fallar por DLL locked (Windows). Los tipos TS se generan igual; solo reiniciar el servidor.
- El build de produccion compila el cliente y lo copia a `server/public/`, luego el Express sirve el SPA desde ahi.
- Google Calendar es completamente opcional; si no se configuran las variables de entorno, la sincronizacion simplemente no ocurre.
