import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getBusinessHours = async (_req: Request, res: Response): Promise<void> => {
  try {
    const hours = await prisma.businessHours.findMany({
      orderBy: { dayOfWeek: 'asc' },
    });
    res.json(hours);
  } catch {
    res.status(500).json({ error: 'Error al obtener horarios' });
  }
};

export const updateBusinessHours = async (req: Request, res: Response): Promise<void> => {
  try {
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
          where: { dayOfWeek: d.dayOfWeek },
          update: { isOpen: d.isOpen, openTime: d.openTime, closeTime: d.closeTime },
          create: {
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
