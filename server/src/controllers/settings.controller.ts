import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, resolveSpaceId } from '../middleware/auth.middleware';

function slugifySpaceName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // eliminar tildes
    .replace(/[^a-z0-9]/g, '');      // eliminar espacios y caracteres especiales
}

export const getBusinessHours = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const spaceId = resolveSpaceId(req);
    if (!spaceId) {
      res.status(400).json({ error: 'Se requiere contexto de espacio' });
      return;
    }
    const [hours, space] = await Promise.all([
      prisma.businessHours.findMany({ where: { spaceId }, orderBy: { dayOfWeek: 'asc' } }),
      prisma.space.findUnique({ where: { id: spaceId }, select: { maxCapacity: true, maxCapacityReunion: true } }),
    ]);
    res.json({
      days: hours,
      maxCapacity: space?.maxCapacity ?? 12,
      maxCapacityReunion: space?.maxCapacityReunion ?? 12,
    });
  } catch {
    res.status(500).json({ error: 'Error al obtener horarios' });
  }
};

export const updateBusinessHours = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const spaceId = resolveSpaceId(req);
    if (!spaceId) {
      res.status(400).json({ error: 'Se requiere contexto de espacio' });
      return;
    }

    const { days, maxCapacity, maxCapacityReunion } = req.body as {
      days: { dayOfWeek: number; isOpen: boolean; openTime: string; closeTime: string }[];
      maxCapacity?: number;
      maxCapacityReunion?: number;
    };

    if (!Array.isArray(days) || days.length !== 7) {
      res.status(400).json({ error: 'Se requieren exactamente 7 días' });
      return;
    }

    for (const d of days) {
      if (
        typeof d.dayOfWeek !== 'number' ||
        d.dayOfWeek < 0 || d.dayOfWeek > 6 ||
        typeof d.isOpen !== 'boolean' ||
        !d.openTime || !d.closeTime
      ) {
        res.status(400).json({ error: 'Datos inválidos en uno o más días' });
        return;
      }
    }

    const spaceUpdate: { maxCapacity?: number; maxCapacityReunion?: number } = {};
    if (typeof maxCapacity === 'number' && maxCapacity >= 1) spaceUpdate.maxCapacity = maxCapacity;
    if (typeof maxCapacityReunion === 'number' && maxCapacityReunion >= 1) spaceUpdate.maxCapacityReunion = maxCapacityReunion;

    const [updatedDays, space] = await Promise.all([
      Promise.all(
        days.map((d) =>
          prisma.businessHours.upsert({
            where: { spaceId_dayOfWeek: { spaceId, dayOfWeek: d.dayOfWeek } },
            update: { isOpen: d.isOpen, openTime: d.openTime, closeTime: d.closeTime },
            create: { spaceId, dayOfWeek: d.dayOfWeek, isOpen: d.isOpen, openTime: d.openTime, closeTime: d.closeTime },
          })
        )
      ),
      Object.keys(spaceUpdate).length > 0
        ? prisma.space.update({ where: { id: spaceId }, data: spaceUpdate, select: { maxCapacity: true, maxCapacityReunion: true } })
        : prisma.space.findUnique({ where: { id: spaceId }, select: { maxCapacity: true, maxCapacityReunion: true } }),
    ]);

    res.json({
      days: updatedDays.sort((a, b) => a.dayOfWeek - b.dayOfWeek),
      maxCapacity: space?.maxCapacity ?? 12,
      maxCapacityReunion: space?.maxCapacityReunion ?? 12,
    });
  } catch {
    res.status(500).json({ error: 'Error al actualizar horarios' });
  }
};

export const getCustomization = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const spaceId = resolveSpaceId(req);
    if (!spaceId) { res.status(400).json({ error: 'Se requiere contexto de espacio' }); return; }
    const space = await prisma.space.findUnique({
      where: { id: spaceId },
      select: { name: true, primaryColor: true },
    });
    const slug = space ? slugifySpaceName(space.name) : null;
    const logoUrl = slug ? `/logo-${slug}.png` : null;
    res.json({ logoUrl, primaryColor: space?.primaryColor ?? null });
  } catch {
    res.status(500).json({ error: 'Error al obtener personalización' });
  }
};

export const updateCustomizationColors = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const spaceId = resolveSpaceId(req);
    if (!spaceId) { res.status(400).json({ error: 'Se requiere contexto de espacio' }); return; }
    const { primaryColor } = req.body as { primaryColor?: string | null };
    if (primaryColor && !/^#[0-9a-fA-F]{6}$/.test(primaryColor)) {
      res.status(400).json({ error: 'Color inválido (debe ser #RRGGBB)' }); return;
    }
    const space = await prisma.space.update({
      where: { id: spaceId },
      data: { primaryColor: primaryColor ?? null },
      select: { name: true, primaryColor: true },
    });
    const slug = slugifySpaceName(space.name);
    const logoUrl = `/logo-${slug}.png`;
    res.json({ logoUrl, primaryColor: space.primaryColor ?? null });
  } catch {
    res.status(500).json({ error: 'Error al actualizar color' });
  }
};
