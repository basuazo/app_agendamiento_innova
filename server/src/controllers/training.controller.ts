import { Response } from 'express';
import { AuthRequest, resolveSpaceId } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

const ENROLLMENT_INCLUDE = {
  user: { select: { id: true, name: true, email: true, organization: true } },
};

const TRAINING_INCLUDE = {
  exemptions: {
    include: {
      resource: { select: { id: true, name: true } },
    },
  },
  enrollments: {
    include: ENROLLMENT_INCLUDE,
    orderBy: { createdAt: 'asc' as const },
  },
};

export const getTrainings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const spaceId = resolveSpaceId(req);
    const trainings = await prisma.training.findMany({
      where: spaceId ? { spaceId } : {},
      include: TRAINING_INCLUDE,
      orderBy: { startTime: 'asc' },
    });
    res.json(trainings);
  } catch {
    res.status(500).json({ error: 'Error al obtener capacitaciones' });
  }
};

export const createTraining = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, startTime: startRaw, endTime: endRaw, capacity: capacityRaw, exemptResourceIds } = req.body;

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

    const capacity = Math.max(1, Number(capacityRaw) || 10);

    const spaceId = resolveSpaceId(req);
    if (!spaceId) {
      res.status(400).json({ error: 'Se requiere contexto de espacio' });
      return;
    }

    const training = await prisma.$transaction(async (tx) => {
      const created = await tx.training.create({
        data: {
          title,
          description: description ?? null,
          startTime,
          endTime,
          capacity,
          createdBy: req.user!.id,
          spaceId,
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
  } catch {
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
  } catch {
    res.status(500).json({ error: 'Error al actualizar exenciones' });
  }
};

export const enrollTraining = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const training = await prisma.training.findUnique({
      where: { id },
      include: {
        _count: { select: { enrollments: { where: { status: 'CONFIRMED' } } } },
      },
    });
    if (!training) {
      res.status(404).json({ error: 'Capacitación no encontrada' });
      return;
    }

    const existing = await prisma.trainingEnrollment.findUnique({
      where: { trainingId_userId: { trainingId: id, userId } },
    });
    if (existing) {
      res.status(409).json({ error: 'Ya estás inscrita en esta capacitación' });
      return;
    }

    const confirmedCount = training._count.enrollments;
    const status = confirmedCount < training.capacity ? 'CONFIRMED' : 'WAITLIST';

    const enrollment = await prisma.trainingEnrollment.create({
      data: { trainingId: id, userId, status },
      include: ENROLLMENT_INCLUDE,
    });

    res.status(201).json(enrollment);
  } catch {
    res.status(500).json({ error: 'Error al inscribirse en la capacitación' });
  }
};

export const unenrollTraining = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const enrollment = await prisma.trainingEnrollment.findUnique({
      where: { trainingId_userId: { trainingId: id, userId } },
    });
    if (!enrollment) {
      res.status(404).json({ error: 'No estás inscrita en esta capacitación' });
      return;
    }

    const wasConfirmed = enrollment.status === 'CONFIRMED';

    await prisma.$transaction(async (tx) => {
      await tx.trainingEnrollment.delete({
        where: { trainingId_userId: { trainingId: id, userId } },
      });

      // Si tenía cupo confirmado, promover al primero en lista de espera
      if (wasConfirmed) {
        const firstWaiting = await tx.trainingEnrollment.findFirst({
          where: { trainingId: id, status: 'WAITLIST' },
          orderBy: { createdAt: 'asc' },
        });
        if (firstWaiting) {
          await tx.trainingEnrollment.update({
            where: { id: firstWaiting.id },
            data: { status: 'CONFIRMED' },
          });
        }
      }
    });

    res.json({ message: 'Inscripción cancelada' });
  } catch {
    res.status(500).json({ error: 'Error al cancelar inscripción' });
  }
};
