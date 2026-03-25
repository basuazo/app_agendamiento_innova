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
| Capacitaciones (crear/eliminar) | ✓ | ✓ | — |
| Exportar capacitaciones a Excel | ✓ | ✓ | — |
| Inscribir/desinscribir otras usuarias | ✓ | ✓ | ✓ |
| Aprobar/rechazar reservas | ✓ | — | ✓ |
| Ver todas las reservas | ✓ | — | ✓ |
| Exportar reservas a Excel | ✓ | — | ✓ |
| Agendar por otra usuaria | ✓ | ✓ | ✓ |
| Ver lista de usuarios | ✓ | ✓ | ✓ |
| Verificar nuevos usuarios | ✓ | — | ✓ |
| Crear/editar/eliminar usuarios | ✓ | — | — |
| Configurar horarios y aforo | ✓ | — | — |

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

- **Calendario interactivo**: vista semanal con FullCalendar. Las actividades que se solapan en el tiempo se agrupan automáticamente en un evento único "N actividades" (cluster); hacer click lo despliega y permite acceder a cada actividad individualmente.
- **Reservas desde el calendario**: click en celda vacía para crear, click en una reserva para ver detalle; desde el detalle se puede editar (fecha, hora, notas) o cancelar directamente sin salir del calendario.
- **Validación de horario de negocio**: el formulario de reserva muestra el horario del espacio en tiempo real y bloquea horas fuera del rango configurado, tanto en frontend (feedback inmediato) como en backend (validación de seguridad).
- **Sistema de certificaciones**: los usuarios solicitan certificación por categoría; el admin/Líder Técnica programa sesiones grupales (máx. 10) y aprueba/rechaza individualmente. Al revocar una certificación, la solicitud asociada vuelve a estado PENDIENTE (no se elimina), permitiendo reprogramar sin que el usuario deba solicitarla de nuevo. Desde el popup de sesión de certificación en el calendario, el admin puede cancelar toda la sesión con un clic, revirtiendo todas las solicitudes PROGRAMADAS a PENDIENTE.
- **Capacitaciones**: el admin/Líder Técnica crea y edita sesiones de capacitación con cupos y horarios configurables (HH:MM). Las usuarias se inscriben desde `/my-trainings` o desde el popup de la capacitación en el calendario. Cupos llenos → lista de espera con promoción automática. Desde el popup del calendario el admin puede editar, eliminar o agendar en el mismo horario (si hay recursos libres por exenciones). La página `/admin/trainings` muestra el listado completo con las inscritas.
- **Inscripción por otras usuarias**: los roles elevados pueden inscribir y desinscribir a otras usuarias en capacitaciones desde `/admin/trainings`, usando un combobox de búsqueda por nombre o email.
- **Exportación de capacitaciones a Excel**: desde `/admin/trainings`, ADMIN y LIDER_TECNICA pueden descargar un `.xlsx` con el listado de todas las capacitaciones y sus inscripciones.
- **Sala de reuniones**: auto-selecciona el único recurso disponible. Incluye campo de N° de asistentes (validado contra el aforo de reuniones) y campo de notas contextual.
- **Comunidad**: foro interno con posts etiquetados (GENERAL, MACHINE_ISSUE, ORDER, CLEANING) e imágenes.
- **Tablas admin ordenables y responsivas**: todas las tablas admin permiten ordenar A→Z / Z→A y filtrar con búsqueda en tiempo real. En móvil hacen scroll horizontal.
- **Roles jerárquicos**: cinco roles con permisos granulares (SUPER_ADMIN, ADMIN, LIDER_TECNICA, LIDER_COMUNITARIA, USER).
- **Agendar por otra usuaria**: todos los roles elevados pueden crear reservas a nombre de cualquier usuaria del espacio.
- **Exportación de reservas a Excel**: desde la página Todas las Reservas, ADMIN y LIDER_COMUNITARIA pueden descargar un `.xlsx` con el detalle completo.
- **Aforo configurable**: cada espacio tiene dos límites editables desde Configuración — uno para máquinas y otro para la sala de reuniones.
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
│       │   ├── admin/       # UsersPage, BookingsPage, ResourcesPage, TrainingsPage, etc.
│       │   ├── superadmin/  # SpacesPage
│       │   ├── MyTrainingsPage.tsx  # inscripciones del usuario
│       │   └── MyCertificationsPage.tsx
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

- Slots de **hasta 4 horas**; horario configurable por espacio (default lun–sáb 09:00–17:00)
- **Horario de negocio**: las reservas no pueden crearse fuera del horario configurado del espacio. El formulario muestra el horario en tiempo real y el backend lo valida independientemente.
- **Certificación por categoría**, no por máquina individual. Sin cert → reserva PENDING
- Admin y recursos con `requiresCertification=false` → reserva CONFIRMED directa
- **Conflicto**: `startA < endB AND endA > startB` → error 409
- Google Calendar sincroniza solo reservas CONFIRMED
- Máximo **10 usuarias** por sesión de certificación
- Registro auto-servicio → `isVerified=false`; admin debe verificar antes de que pueda ingresar
- **Inscripción a capacitaciones**: cupos configurables por sesión. Al llenarse, las siguientes inscripciones van a lista de espera. Al cancelar una inscripción CONFIRMED, la primera en espera se promueve automáticamente a CONFIRMED
- **Inscripción por roles elevados**: ADMIN, SUPER_ADMIN, LIDER_TECNICA y LIDER_COMUNITARIA pueden inscribir y desinscribir a otras usuarias en capacitaciones
- **Edición de reservas**: el propietario de una reserva (o un rol elevado) puede editar fecha/hora/notas directamente desde el detalle en el calendario. No se puede editar si la reserva está CANCELADA o RECHAZADA
- **Revocación de certificación**: al revocar, la `CertificationRequest` se revierte a PENDING (no se elimina) para que el usuario pueda ser reprogramado sin hacer una nueva solicitud
- **Cancelar sesión de certificación**: desde el popup del calendario, el admin puede cancelar toda la sesión de golpe; todas las solicitudes SCHEDULED vuelven a PENDING
- **Agrupación de actividades en el calendario**: cuando dos o más actividades se solapan en el tiempo, se reemplazan por un único evento "N actividades" (algoritmo union-find). Al hacer click se abre un modal que lista todas las actividades con opción de acceder a cada una individualmente

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
