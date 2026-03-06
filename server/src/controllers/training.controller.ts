import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

const TRAINING_INCLUDE = {
  exemptions: {
    include: {
      resource: { select: { id: true, name: true } },
    },
  },
};

export const getTrainings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const trainings = await prisma.training.findMany({
      include: TRAINING_INCLUDE,
      orderBy: { startTime: 'asc' },
    });
    res.json(trainings);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener capacitaciones' });
  }
};

export const createTraining = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, startTime: startRaw, endTime: endRaw, exemptResourceIds } = req.body;

    if (!title || !startRaw || !endRaw) {
      res.status(400).json({ error: 'Título, hora de inicio y hora de fin son requeridos' });
      return;
    }

    const startTime = new Date(startRaw);
    const endTime = new Date(endRaw);

    if (startTime >= endTime) {
      res.status(400).json({ error: 'La hora de inicio debe ser anterior a la hora de fin' });
      return;
    }

    const training = await prisma.$transaction(async (tx) => {
      const created = await tx.training.create({
        data: {
          title,
          description: description ?? null,
          startTime,
          endTime,
          createdBy: req.user!.id,
        },
      });

      if (Array.isArray(exemptResourceIds) && exemptResourceIds.length > 0) {
        await tx.trainingExemption.createMany({
          data: exemptResourceIds.map((resourceId: string) => ({
            trainingId: created.id,
            resourceId,
          })),
          skipDuplicates: true,
        });
      }

      return tx.training.findUnique({
        where: { id: created.id },
        include: TRAINING_INCLUDE,
      });
    });

    res.status(201).json(training);
  } catch (error) {
    console.error('Error al crear capacitación:', error);
    res.status(500).json({ error: 'Error al crear la capacitación' });
  }
};

export const deleteTraining = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const training = await prisma.training.findUnique({ where: { id: req.params.id } });
    if (!training) {
      res.status(404).json({ error: 'Capacitación no encontrada' });
      return;
    }

    await prisma.training.delete({ where: { id: req.params.id } });
    res.json({ message: 'Capacitación eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar la capacitación' });
  }
};

export const updateExemptions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { exemptResourceIds } = req.body;

    if (!Array.isArray(exemptResourceIds)) {
      res.status(400).json({ error: 'exemptResourceIds debe ser un array' });
      return;
    }

    const training = await prisma.training.findUnique({ where: { id: req.params.id } });
    if (!training) {
      res.status(404).json({ error: 'Capacitación no encontrada' });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.trainingExemption.deleteMany({ where: { trainingId: req.params.id } });

      if (exemptResourceIds.length > 0) {
        await tx.trainingExemption.createMany({
          data: exemptResourceIds.map((resourceId: string) => ({
            trainingId: req.params.id,
            resourceId,
          })),
          skipDuplicates: true,
        });
      }

      return tx.training.findUnique({
        where: { id: req.params.id },
        include: TRAINING_INCLUDE,
      });
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar exenciones' });
  }
};
