# CoWork — App de Agendamiento de Espacios y Máquinas

Aplicación web para gestionar reservas de máquinas y espacios de trabajo compartidos.

## Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + FullCalendar + Zustand
- **Backend**: Node.js + Express + TypeScript
- **Base de datos**: PostgreSQL + Prisma ORM
- **Auth**: JWT + bcrypt
- **Google Calendar**: API con Service Account

---

## Requisitos previos

- Node.js v18 o superior
- PostgreSQL corriendo localmente (o Docker)

---

## Instalación

### 1. Clonar y entrar al proyecto

```bash
cd "App para reservas"
```

### 2. Configurar variables de entorno

```bash
cp .env.example server/.env
```

Editar `server/.env` con tus valores:

```env
DATABASE_URL="postgresql://postgres:tu_password@localhost:5432/cowork_db"
JWT_SECRET="cambia_esto_por_algo_seguro_de_al_menos_32_caracteres"
JWT_EXPIRES_IN="7d"
PORT=3001
CLIENT_URL="http://localhost:5173"

# Google Calendar (opcional — ver sección abajo)
GOOGLE_CALENDAR_ID=""
GOOGLE_SERVICE_ACCOUNT_EMAIL=""
GOOGLE_PRIVATE_KEY=""
```

### 3. Instalar dependencias

```bash
# Dependencias raíz
npm install

# Dependencias del servidor
cd server && npm install && cd ..

# Dependencias del cliente
cd client && npm install && cd ..
```

O en un solo paso:

```bash
npm run install:all
```

### 4. Crear la base de datos

```bash
# Crear la base de datos en PostgreSQL
psql -U postgres -c "CREATE DATABASE cowork_db;"
```

### 5. Ejecutar migraciones

```bash
cd server
npx prisma migrate dev --name init
cd ..
```

> El schema path (`../prisma/schema.prisma`) ya está configurado en `server/package.json`.

### 6. Ejecutar el seed

```bash
npm run seed
```

Esto crea:
- **1 admin**: `admin@cowork.cl` / `admin123`
- **3 usuarios**: `maria@test.cl`, `juan@test.cl`, `sofia@test.cl` / `password123`
- **5 recursos**: Mesa de Corte Láser, Escritorio Creativo, Computador CAD, Impresora 3D, Sala de Reuniones
- **6 reservas de prueba** en la semana actual

### 7. Ejecutar en desarrollo

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001/api/health

---

## Configurar Google Calendar (opcional)

Si no configuras Google Calendar, la app funciona igualmente. Las reservas solo se guardan en PostgreSQL.

### Pasos para activar la integración:

#### 1. Crear proyecto en Google Cloud

1. Ir a [console.cloud.google.com](https://console.cloud.google.com)
2. Crear nuevo proyecto o seleccionar uno existente
3. Ir a **APIs y servicios → Biblioteca**
4. Buscar y habilitar **Google Calendar API**

#### 2. Crear Service Account

1. Ir a **APIs y servicios → Credenciales → Crear credenciales → Cuenta de servicio**
2. Nombre: `cowork-app`
3. Rol: ninguno (solo necesita acceso al calendario)
4. Una vez creada, ir a la cuenta → pestaña **Claves** → **Agregar clave → JSON**
5. Descargar el archivo JSON

#### 3. Crear Google Calendar compartido

1. Abrir [calendar.google.com](https://calendar.google.com)
2. Crear nuevo calendario: **Otros calendarios → + Crear calendario**
3. Nombre: `CoWork — Reservas`
4. En **Configuración del calendario → Compartir con personas específicas**:
   - Agregar el email del service account (del archivo JSON)
   - Permiso: **Realizar cambios en eventos**
5. En **Integrar calendario**, copiar el **ID del calendario** (formato: `xxx@group.calendar.google.com`)

#### 4. Configurar variables de entorno

En `server/.env`:

```env
GOOGLE_CALENDAR_ID="el-id-del-calendario@group.calendar.google.com"
GOOGLE_SERVICE_ACCOUNT_EMAIL="cowork-app@tu-proyecto.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nCONTENIDO_DE_LA_CLAVE\n-----END PRIVATE KEY-----\n"
```

> El `private_key` del archivo JSON tiene saltos de línea reales; en el `.env` deben ser `\n` literales.

---

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia cliente y servidor en paralelo |
| `npm run dev:server` | Solo el servidor (puerto 3001) |
| `npm run dev:client` | Solo el cliente (puerto 5173) |
| `npm run seed` | Poblar la base de datos con datos de prueba |
| `npm run db:migrate` | Ejecutar migraciones de Prisma |
| `npm run db:studio` | Abrir Prisma Studio (explorador visual de BD) |

---

## Estructura del proyecto

```
/
├── client/          # React + Vite frontend
├── server/          # Express API
├── prisma/          # Schema y seed
├── .env.example     # Variables de entorno documentadas
└── README.md
```

---

## API Reference

### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` | Registro de usuario |
| POST | `/api/auth/login` | Login → JWT |
| GET | `/api/auth/me` | Usuario autenticado |

### Recursos
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/resources` | User | Lista recursos activos |
| POST | `/api/resources` | Admin | Crear recurso |
| PUT | `/api/resources/:id` | Admin | Editar recurso |
| PATCH | `/api/resources/:id/toggle` | Admin | Activar/desactivar |

### Reservas
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/bookings` | User | Todas las confirmadas |
| GET | `/api/bookings/mine` | User | Mis reservas |
| POST | `/api/bookings` | User | Crear reserva |
| PATCH | `/api/bookings/:id/cancel` | User | Cancelar reserva |
| GET | `/api/bookings/admin/all` | Admin | Todas con detalles |

---

## Reglas de negocio

- Bloques horarios de **1 hora**, de **09:00 a 17:00** (8 slots por día)
- No se puede reservar en el **pasado**
- **Conflicto de reservas**: error 409 si el recurso ya está ocupado en ese horario
- Propósito **PRODUCE** requiere indicar qué se producirá y cuántas unidades
- Recursos **desactivados** no aparecen disponibles para reservar
- Usuarios cancelan solo sus propias reservas; admins pueden cancelar cualquiera
