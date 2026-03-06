import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { logAudit } from '../lib/audit';
import { AuthRequest } from '../middleware/auth.middleware';

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const skip = (page - 1) * limit;

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, isVerified: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count(),
    ]);

    res.json({ data: users, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'El email ya está registrado' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: role ?? 'USER', isVerified: true },
      select: { id: true, name: true, email: true, role: true, isVerified: true, createdAt: true },
    });

    await logAudit({
      actorId: req.user!.id,
      action: 'USER_CREATED',
      targetType: 'User',
      targetId: user.id,
      meta: { name: user.name, email: user.email, role: user.role },
    });

    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Evitar que el admin se elimine a sí mismo
    if (id === req.user?.id) {
      res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    // Cancelar reservas activas del usuario antes de eliminar
    await prisma.booking.updateMany({
      where: { userId: id, status: 'CONFIRMED' },
      data: { status: 'CANCELLED' },
    });

    await prisma.user.delete({ where: { id } });

    await logAudit({
      actorId: req.user!.id,
      action: 'USER_DELETED',
      targetType: 'User',
      targetId: id,
      meta: { name: user.name, email: user.email },
    });

    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
};

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const skip = (page - 1) * limit;

    const [logs, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        include: { actor: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count(),
    ]);

    res.json({ data: logs, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener logs de auditoría' });
  }
};

export const verifyUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    if (target.isVerified) {
      res.status(400).json({ error: 'El usuario ya está verificado' });
      return;
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isVerified: true },
      select: { id: true, name: true, email: true, role: true, isVerified: true, createdAt: true },
    });

    await logAudit({
      actorId: req.user!.id,
      action: 'USER_VERIFIED',
      targetType: 'User',
      targetId: id,
      meta: { name: user.name, email: user.email },
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error al verificar usuario' });
  }
};

export const changeUserRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role } = req.body;
    if (!['ADMIN', 'USER'].includes(role)) {
      res.status(400).json({ error: 'Rol inválido. Use ADMIN o USER' });
      return;
    }

    const before = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { name: true, role: true },
    });

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, name: true, email: true, role: true, isVerified: true, createdAt: true },
    });

    await logAudit({
      actorId: req.user!.id,
      action: 'USER_ROLE_CHANGED',
      targetType: 'User',
      targetId: user.id,
      meta: { name: user.name, previousRole: before?.role, newRole: role },
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar rol' });
  }
};
