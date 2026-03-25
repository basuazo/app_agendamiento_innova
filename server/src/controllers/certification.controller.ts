import { Response } from 'express';
import { AuthRequest, resolveSpaceId } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';
import { logAudit } from '../lib/audit';

const CATEGORY_SELECT = { select: { id: true, name: true, slug: true, color: true } };

const REQUEST_INCLUDE = {
  user: { select: { id: true, name: true, email: true } },
  category: CATEGORY_SELECT,
};

const CERT_INCLUDE = {
  user: { select: { id: true, name: true, email: true } },
  certifier: { select: { id: true, name: true } },
  category: CATEGORY_SELECT,
};

// ── Usuario ──────────────────────────────────────────────────────────────────

export const getMyCertifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const certs = await prisma.certification.findMany({
      where: { userId: req.user!.id },
      include: { certifier: { select: { name: true } }, category: CATEGORY_SELECT },
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
      include: { category: CATEGORY_SELECT },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch {
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
};

export const requestCertification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { categoryId } = req.body;
    if (!categoryId) {
      res.status(400).json({ error: 'categoryId es requerido' });
      return;
    }

    // Verificar si ya existe una solicitud activa o certificación
    const existing = await prisma.certificationRequest.findUnique({
      where: { userId_categoryId: { userId: req.user!.id, categoryId } },
    });
    if (existing) {
      if (existing.status === 'REJECTED' || existing.status === 'APPROVED') {
        await prisma.certificationRequest.delete({ where: { id: existing.id } });
      } else {
        res.status(409).json({ error: 'Ya tienes una solicitud activa para esta categoría' });
        return;
      }
    }

    const alreadyCertified = await prisma.certification.findUnique({
      where: { userId_categoryId: { userId: req.user!.id, categoryId } },
    });
    if (alreadyCertified) {
      res.status(409).json({ error: 'Ya estás certificada en esta categoría' });
      return;
    }

    const request = await prisma.certificationRequest.create({
      data: { userId: req.user!.id, categoryId },
      include: { category: CATEGORY_SELECT },
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
    const spaceId = resolveSpaceId(req);
    const requests = await prisma.certificationRequest.findMany({
      where: {
        ...(status ? { status: status as import('@prisma/client').CertReqStatus } : {}),
        ...(spaceId ? { user: { spaceId } } : {}),
      },
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
        where: { userId_categoryId: { userId: request.userId, categoryId: request.categoryId } },
        create: {
          userId: request.userId,
          categoryId: request.categoryId,
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
        categoryId: request.categoryId,
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
    const spaceId = resolveSpaceId(req);
    const certs = await prisma.certification.findMany({
      where: spaceId ? { user: { spaceId } } : {},
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
    // Eliminar cert y dejar la solicitud en estado PENDING para que pueda ser reprogramada
    await prisma.certification.delete({ where: { id: req.params.id } });
    await prisma.certificationRequest.upsert({
      where: { userId_categoryId: { userId: cert.userId, categoryId: cert.categoryId } },
      create: { userId: cert.userId, categoryId: cert.categoryId, status: 'PENDING' },
      update: { status: 'PENDING', scheduledDate: null, resolvedAt: null, notes: null },
    });

    await logAudit({
      actorId: req.user!.id,
      action: 'CERTIFICATION_REVOKED',
      targetType: 'Certification',
      targetId: req.params.id,
      meta: { userId: cert.userId, categoryId: cert.categoryId },
    });

    res.json({ message: 'Certificación revocada' });
  } catch {
    res.status(500).json({ error: 'Error al revocar certificación' });
  }
};

export const cancelCertSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { requestIds } = req.body as { requestIds?: string[] };
    if (!Array.isArray(requestIds) || requestIds.length === 0) {
      res.status(400).json({ error: 'requestIds es requerido' });
      return;
    }

    const result = await prisma.certificationRequest.updateMany({
      where: { id: { in: requestIds }, status: 'SCHEDULED' },
      data: { status: 'PENDING', scheduledDate: null },
    });

    res.json({ message: `${result.count} solicitud(es) devuelta(s) a estado pendiente` });
  } catch {
    res.status(500).json({ error: 'Error al cancelar la sesión de certificación' });
  }
};
