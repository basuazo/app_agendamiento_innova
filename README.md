# CoWork — App de Agendamiento de Máquinas y Espacios

Aplicación web full-stack para gestionar reservas de máquinas textiles y espacios de coworking. Soporta múltiples centros productivos (espacios), certificaciones por categoría de máquina, aprobación de usuarios nuevos y sincronización opcional con Google Calendar.

## Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + FullCalendar + Zustand
- **Backend**: Node.js + Express + TypeScript
- **Base de datos**: PostgreSQL + Prisma ORM (Neon en producción, Docker local)
- **Auth**: JWT + bcrypt
- **Hosting**: Render (Web Service)
- **Google Calendar**: API con Service Account (opcional)

---

## Requisitos previos

- Node.js v18 o superior
- Docker (recomendado para la BD) o PostgreSQL local

---

## Instalación

### 1. Configurar variables de entorno

```bash
cp .env.example server/.env
```

Editar `server/.env`:

```env
DATABASE_URL="postgresql://postgres:cowork123@localhost:5432/cowork_db"
JWT_SECRET="cambia_esto_por_algo_seguro_de_al_menos_32_caracteres"
JWT_EXPIRES_IN="7d"
PORT=3001
CLIENT_URL="http://localhost:5173"

# Google Calendar (opcional)
GOOGLE_CALENDAR_ID=""
GOOGLE_SERVICE_ACCOUNT_EMAIL=""
GOOGLE_PRIVATE_KEY=""
```

### 2. Levantar la base de datos

```bash
docker compose up db -d
```

O con PostgreSQL local: crear la DB manualmente y ajustar `DATABASE_URL`.

### 3. Instalar dependencias

```bash
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

### 4. Ejecutar migraciones

```bash
cd server
npx prisma migrate dev --name init
cd ..
```

### 5. Ejecutar el seed

```bash
cd server && npm run seed
```

Crea los usuarios de prueba (ver sección Credenciales) y datos de ejemplo.

### 6. Iniciar en desarrollo

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001/api/health

---

## Credenciales de prueba

| Rol | Email | Contraseña | Acceso |
|-----|-------|------------|--------|
| Super Admin | super@cowork.cl | super123 | Todos los espacios |
| Admin | admin@cowork.cl | admin123 | Espacio 1 |
| Usuario | maria@test.cl | password123 | Espacio 1 |
| Usuario | juan@test.cl | password123 | Espacio 1 |
| Usuario | sofia@test.cl | password123 | Espacio 1 |

---

## Roles y permisos

| Rol | Descripción |
|-----|-------------|
| `SUPER_ADMIN` | Gestiona todos los espacios. Selecciona el espacio activo en el Navbar. Sin spaceId propio. |
| `ADMIN` | Administra su espacio: usuarios, recursos, categorías, reservas, certificaciones, horarios. |
| `LIDER_TECNICA` | Gestiona certificaciones, capacitaciones y recursos. Sin acceso a usuarios, reservas ni categorías. |
| `LIDER_COMUNITARIA` | Aprueba reservas, gestiona categorías y recursos, verifica nuevos usuarios. |
| `USER` | Reserva máquinas, solicita certificaciones, accede a la comunidad. |

**Matriz de permisos resumida:**

| Acción | ADMIN | LIDER_TECNICA | LIDER_COMUNITARIA |
|--------|:-----:|:-------------:|:-----------------:|
| Gestionar recursos | ✓ | ✓ | ✓ |
| Gestionar categorías | ✓ | — | ✓ |
| Certificaciones (admin) | ✓ | ✓ | — |
| Capacitaciones | ✓ | ✓ | — |
| Aprobar/rechazar reservas | ✓ | — | ✓ |
| Ver todas las reservas | ✓ | — | ✓ |
| Exportar reservas a Excel | ✓ | — | ✓ |
| Agendar por otra usuaria | ✓ | ✓ | ✓ |
| Ver y verificar usuarios | ✓ | — | ✓ |
| Crear/editar/eliminar usuarios | ✓ | — | — |
| Configurar horarios | ✓ | — | — |

El registro de nuevos usuarios queda en estado **pendiente** hasta que un admin o Líder Comunitaria lo verifique.

---

## Arquitectura multi-espacio

Cada **Space** (centro productivo) tiene sus propias:
- **Categorías** de máquinas (dinámicas, con nombre y color personalizados)
- **Recursos** (máquinas/equipos) agrupados por categoría
- **Usuarios** (ADMIN y USER)
- **Horarios de negocio** configurables

El header `X-Space-Id` se envía automáticamente en cada request del frontend. El backend usa `resolveSpaceId(req)` para determinar el espacio activo según el rol.

---

## Features principales

- **Calendario de reservas**: vista semanal. Click en celda para reservar, click en slot ocupado para ver detalle o crear nueva reserva encima. Horario configurable por espacio (BusinessHours). Tiempo libre de hasta 4 horas por reserva.
- **Sistema de certificaciones**: los usuarios solicitan certificación por categoría; el admin/Líder Técnica programa sesiones grupales (máx. 10) y aprueba/rechaza individualmente.
- **Capacitaciones**: el admin/Líder Técnica bloquea rangos horarios de recursos para sesiones de capacitación.
- **Sala de reuniones**: auto-selecciona el único recurso disponible, sin selección de máquina, sin pregunta de acompañantes.
- **Comunidad**: foro interno con posts etiquetados (GENERAL, MACHINE_ISSUE, ORDER, CLEANING) e imágenes.
- **Tablas admin ordenables y responsivas**: todas las tablas admin permiten ordenar A→Z / Z→A y filtrar con búsqueda en tiempo real. En móvil hacen scroll horizontal.
- **Roles jerárquicos**: cinco roles con permisos granulares (SUPER_ADMIN, ADMIN, LIDER_TECNICA, LIDER_COMUNITARIA, USER).
- **Agendar por otra usuaria**: todos los roles elevados (ADMIN, SUPER_ADMIN, LIDER_TECNICA, LIDER_COMUNITARIA) pueden crear reservas a nombre de cualquier usuaria del espacio. El BookingModal muestra un paso previo de selección de usuaria cuando el actor tiene un rol elevado.
- **Exportación a Excel**: desde la página Todas las Reservas, ADMIN, SUPER_ADMIN y LIDER_COMUNITARIA pueden descargar un archivo `.xlsx` con el detalle completo de las reservas del espacio activo (fecha, horario, recurso, categoría, usuaria, propósito, ítem a producir, cantidad, asistentes, relación de acompañantes, estado y notas).
- **Google Calendar**: sincronización automática de reservas CONFIRMED (opcional).

---

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Cliente (5173) + servidor (3001) en paralelo |
| `npm run build:prod` | Build completo para producción |
| `npm run start` | Inicia en producción (requiere build previo) |
| `cd server && npm run seed` | Poblar BD con datos de prueba |
| `cd server && npx prisma migrate dev --name <nombre>` | Nueva migración |
| `cd server && npx prisma studio` | Explorador visual de BD |
| `docker compose up db -d` | Levantar solo la BD en Docker |

---

## Configurar Google Calendar (opcional)

Si no se configura, la app funciona igualmente. Las reservas solo se guardan en PostgreSQL.

1. Crear proyecto en [Google Cloud Console](https://console.cloud.google.com)
2. Habilitar **Google Calendar API**
3. Crear una **Service Account** y descargar el JSON de credenciales
4. Crear un calendario en [calendar.google.com](https://calendar.google.com) y compartirlo con el email del service account (permiso: *Realizar cambios en eventos*)
5. Copiar el ID del calendario y las credenciales del service account a `server/.env`

> El `private_key` del JSON tiene saltos de línea reales; en el `.env` deben ser `\n` literales.

---

## Estructura del proyecto

```
/
├── client/          # React + Vite frontend
│   └── src/
│       ├── pages/
│       │   ├── admin/       # UsersPage, BookingsPage, ResourcesPage, etc.
│       │   └── superadmin/  # SpacesPage
│       ├── components/shared/  # Navbar, ConfirmModal, SortableHeader, etc.
│       └── store/           # Zustand: authStore, bookingStore, resourceStore
├── server/          # Express API
│   └── src/
│       ├── controllers/
│       ├── routes/
│       ├── middleware/      # auth, role, upload
│       └── services/        # booking, googleCalendar
├── prisma/          # Schema y migraciones
└── .env.example
```

---

## Reglas de negocio

- Slots de **1 hora**; horario configurable por espacio (default lun–sáb 09:00–17:00)
- **Certificación por categoría**, no por máquina individual. Sin cert → reserva PENDING
- Admin y recursos con `requiresCertification=false` → reserva CONFIRMED directa
- **Conflicto**: `startA < endB AND endA > startB` → error 409
- Google Calendar sincroniza solo reservas CONFIRMED
- Máximo **10 usuarias** por sesión de certificación
- Registro auto-servicio → `isVerified=false`; admin debe verificar antes de que pueda ingresar

---

## Deploy en producción (Render + Neon)

### Build Command
```
npm install && cd client && npm install && cd ../server && npm install && npx prisma generate && npx prisma migrate deploy --schema=../prisma/schema.prisma && cd .. && npm run build:prod
```

### Start Command
```
npm run start
```

### Variables de entorno requeridas en Render

| Variable | Valor |
|---|---|
| `DATABASE_URL` | URL de Neon (`postgresql://...?sslmode=require`) |
| `JWT_SECRET` | cadena aleatoria larga (mín. 32 chars) |
| `JWT_EXPIRES_IN` | `7d` |
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `CLIENT_URL` | URL asignada por Render |
| `NPM_CONFIG_PRODUCTION` | `false` |

### Notas
- `client/.npmrc` y `server/.npmrc` incluyen `production=false` para que `npm install` instale devDependencies durante el build.
- Las migraciones se aplican automáticamente en cada deploy.
- El plan gratuito de Render hiberna el servicio tras 15 min de inactividad — el primer request puede tardar ~30 seg.
