import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';
import { logAudit } from '../lib/audit';

const REQUEST_INCLUDE = {
  user: { select: { id: true, name: true, email: true } },
};

const CERT_INCLUDE = {
  user: { select: { id: true, name: true, email: true } },
  certifier: { select: { id: true, name: true } },
};

// ── Usuario ──────────────────────────────────────────────────────────────────

export const getMyCertifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const certs = await prisma.certification.findMany({
      where: { userId: req.user!.id },
      include: { certifier: { select: { name: true } } },
      orderBy: { certifiedAt: 'desc' },
    });
    res.json(certs);
  } catch {
    res.status(500).json({ error: 'Error al obtener certificaciones' });
  }
};

export const getMyRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const requests = await prisma.certificationRequest.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch {
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
};

export const requestCertification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { resourceCategory } = req.body;
    if (!resourceCategory) {
      res.status(400).json({ error: 'resourceCategory es requerido' });
      return;
    }

    // Verificar si ya existe una solicitud activa o certificación
    const existing = await prisma.certificationRequest.findUnique({
      where: { userId_resourceCategory: { userId: req.user!.id, resourceCategory } },
    });
    if (existing) {
      if (existing.status === 'REJECTED' || existing.status === 'APPROVED') {
        // REJECTED: solicitud denegada → puede volver a solicitar
        // APPROVED: certificación revocada por admin, la solicitud quedó huérfana → limpiar
        await prisma.certificationRequest.delete({ where: { id: existing.id } });
      } else {
        res.status(409).json({ error: 'Ya tienes una solicitud activa para esta categoría' });
        return;
      }
    }

    const alreadyCertified = await prisma.certification.findUnique({
      where: { userId_resourceCategory: { userId: req.user!.id, resourceCategory } },
    });
    if (alreadyCertified) {
      res.status(409).json({ error: 'Ya estás certificada en esta categoría' });
      return;
    }

    const request = await prisma.certificationRequest.create({
      data: { userId: req.user!.id, resourceCategory },
    });
    res.status(201).json(request);
  } catch {
    res.status(500).json({ error: 'Error al crear solicitud de certificación' });
  }
};

export const cancelMyRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const request = await prisma.certificationRequest.findUnique({
      where: { id: req.params.id },
    });
    if (!request) {
      res.status(404).json({ error: 'Solicitud no encontrada' });
      return;
    }
    if (request.userId !== req.user!.id) {
      res.status(403).json({ error: 'No tienes permiso para cancelar esta solicitud' });
      return;
    }
    if (request.status !== 'PENDING') {
      res.status(400).json({ error: 'Solo se pueden cancelar solicitudes pendientes' });
      return;
    }
    await prisma.certificationRequest.delete({ where: { id: req.params.id } });
    res.json({ message: 'Solicitud cancelada' });
  } catch {
    res.status(500).json({ error: 'Error al cancelar solicitud' });
  }
};

// ── Admin ─────────────────────────────────────────────────────────────────────

export const getAllRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const requests = await prisma.certificationRequest.findMany({
      where: status ? { status: status as import('@prisma/client').CertReqStatus } : undefined,
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch {
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
};

export const scheduleSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { requestIds, scheduledDate } = req.body as { requestIds: string[]; scheduledDate: string };
    if (!requestIds?.length || !scheduledDate) {
      res.status(400).json({ error: 'requestIds y scheduledDate son requeridos' });
      return;
    }
    if (requestIds.length > 10) {
      res.status(400).json({ error: 'Máximo 10 usuarias por sesión' });
      return;
    }

    await prisma.certificationRequest.updateMany({
      where: { id: { in: requestIds } },
      data: { status: 'SCHEDULED', scheduledDate: new Date(scheduledDate) },
    });

    const updated = await prisma.certificationRequest.findMany({
      where: { id: { in: requestIds } },
      include: REQUEST_INCLUDE,
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Error al programar sesión' });
  }
};

export const resolveRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, notes } = req.body as { status: 'APPROVED' | 'REJECTED'; notes?: string };
    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      res.status(400).json({ error: 'status debe ser APPROVED o REJECTED' });
      return;
    }

    const request = await prisma.certificationRequest.findUnique({
      where: { id: req.params.id },
    });
    if (!request) {
      res.status(404).json({ error: 'Solicitud no encontrada' });
      return;
    }

    if (status === 'APPROVED') {
      await prisma.certification.upsert({
        where: { userId_resourceCategory: { userId: request.userId, resourceCategory: request.resourceCategory } },
        create: {
          userId: request.userId,
          resourceCategory: request.resourceCategory,
          certifiedById: req.user!.id,
          notes,
        },
        update: {
          certifiedById: req.user!.id,
          certifiedAt: new Date(),
          notes,
        },
      });
    }

    const updated = await prisma.certificationRequest.update({
      where: { id: req.params.id },
      data: { status, notes, resolvedAt: new Date() },
      include: REQUEST_INCLUDE,
    });

    await logAudit({
      actorId: req.user!.id,
      action: status === 'APPROVED' ? 'CERT_REQUEST_APPROVED' : 'CERT_REQUEST_REJECTED',
      targetType: 'CertificationRequest',
      targetId: req.params.id,
      meta: {
        userId: request.userId,
        resourceCategory: request.resourceCategory,
        notes: notes ?? null,
      },
    });

    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Error al resolver solicitud' });
  }
};

export const getAllCertifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const certs = await prisma.certification.findMany({
      include: CERT_INCLUDE,
      orderBy: { certifiedAt: 'desc' },
    });
    res.json(certs);
  } catch {
    res.status(500).json({ error: 'Error al obtener certificaciones' });
  }
};

export const revokeCertification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cert = await prisma.certification.findUnique({ where: { id: req.params.id } });
    if (!cert) {
      res.status(404).json({ error: 'Certificación no encontrada' });
      return;
    }
    // Eliminar cert + solicitud resuelta para que el usuario pueda volver a solicitar
    await prisma.$transaction([
      prisma.certification.delete({ where: { id: req.params.id } }),
      prisma.certificationRequest.deleteMany({
        where: { userId: cert.userId, resourceCategory: cert.resourceCategory },
      }),
    ]);

    await logAudit({
      actorId: req.user!.id,
      action: 'CERTIFICATION_REVOKED',
      targetType: 'Certification',
      targetId: req.params.id,
      meta: { userId: cert.userId, resourceCategory: cert.resourceCategory },
    });

    res.json({ message: 'Certificación revocada' });
  } catch {
    res.status(500).json({ error: 'Error al revocar certificación' });
  }
};
