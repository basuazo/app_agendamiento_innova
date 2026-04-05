-- Migración: eliminar valor LIDER_TECNICA del enum Role
-- PostgreSQL no permite DROP VALUE en enums directamente.
-- Se recrea el tipo con los valores restantes.

-- 1. Reasignar usuarios con rol LIDER_TECNICA a LIDER_COMUNITARIA
UPDATE "User" SET "role" = 'LIDER_COMUNITARIA' WHERE "role" = 'LIDER_TECNICA';

-- 2. Recrear el enum sin LIDER_TECNICA
ALTER TYPE "Role" RENAME TO "Role_old";

CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'LIDER_COMUNITARIA', 'USER');

-- 3. Migrar la columna
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING "role"::text::"Role";

-- 4. Eliminar el enum viejo
DROP TYPE "Role_old";
