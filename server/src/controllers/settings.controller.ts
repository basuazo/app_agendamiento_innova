import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, resolveSpaceId } from '../middleware/auth.middleware';

export const getBusinessHours = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const spaceId = resolveSpaceId(req);
    if (!spaceId) {
      res.status(400).json({ error: 'Se requiere contexto de espacio' });
      return;
    }
    const hours = await prisma.businessHours.findMany({
      where: { spaceId },
      orderBy: { dayOfWeek: 'asc' },
    });
    res.json(hours);
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

    const days: { dayOfWeek: number; isOpen: boolean; openTime: string; closeTime: string }[] = req.body;

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

    const updated = await Promise.all(
      days.map((d) =>
        prisma.businessHours.upsert({
          where: { spaceId_dayOfWeek: { spaceId, dayOfWeek: d.dayOfWeek } },
          update: { isOpen: d.isOpen, openTime: d.openTime, closeTime: d.closeTime },
          create: {
            spaceId,
            dayOfWeek: d.dayOfWeek,
            isOpen: d.isOpen,
            openTime: d.openTime,
            closeTime: d.closeTime,
          },
        })
      )
    );

    res.json(updated.sort((a, b) => a.dayOfWeek - b.dayOfWeek));
  } catch {
    res.status(500).json({ error: 'Error al actualizar horarios' });
  }
};
