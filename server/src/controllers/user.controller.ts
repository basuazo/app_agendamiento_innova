import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { logAudit } from '../lib/audit';
import { AuthRequest, resolveSpaceId } from '../middleware/auth.middleware';

export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const skip = (page - 1) * limit;

    const spaceId = resolveSpaceId(req);
    const spaceFilter = spaceId ? { spaceId } : {};
    const baseWhere = { ...spaceFilter, deletedAt: null };

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where: baseWhere,
        select: { id: true, name: true, email: true, organization: true, role: true, isVerified: true, spaceId: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where: baseWhere }),
    ]);

    res.json({ data: users, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, spaceId: bodySpaceId, organization } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
      return;
    }

    // SUPER_ADMIN puede crear en cualquier espacio (desde body), ADMIN crea en su propio espacio
    const spaceId = req.user!.role === 'SUPER_ADMIN' ? bodySpaceId : req.user!.spaceId;
    if (!spaceId) {
      res.status(400).json({ error: 'Se requiere un espacio para crear el usuario' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'El email ya está registrado' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, organization: organization?.trim() || null, role: role ?? 'USER', isVerified: true, spaceId },
      select: { id: true, name: true, email: true, organization: true, role: true, isVerified: true, spaceId: true, createdAt: true },
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

    // Cancelar reservas activas antes de marcar como eliminado
    await prisma.booking.updateMany({
      where: { userId: id, status: { in: ['PENDING', 'CONFIRMED'] } },
      data: { status: 'CANCELLED' },
    });

    await prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });

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

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, password, spaceId, organization } = req.body;

    if (!name && !email && !password && spaceId === undefined && organization === undefined) {
      res.status(400).json({ error: 'Debe proporcionar al menos un campo a actualizar' });
      return;
    }

    // Solo SUPER_ADMIN puede reasignar espacio
    if (spaceId !== undefined && req.user?.role !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Solo el Super Admin puede reasignar espacios' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    if (email && email !== existing.email) {
      const taken = await prisma.user.findUnique({ where: { email } });
      if (taken) {
        res.status(409).json({ error: 'El email ya está registrado por otro usuario' });
        return;
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (organization !== undefined) updateData.organization = organization?.trim() || null;
    if (spaceId !== undefined) updateData.spaceId = spaceId || null;
    if (password) {
      if (password.length < 6) {
        res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        return;
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, organization: true, role: true, isVerified: true, spaceId: true, createdAt: true },
    });

    res.json(user);
  } catch {
    res.status(500).json({ error: 'Error al actualizar usuario' });
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
      select: { id: true, name: true, email: true, organization: true, role: true, isVerified: true, spaceId: true, createdAt: true },
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
    if (!['ADMIN', 'USER', 'LIDER_TECNICA', 'LIDER_COMUNITARIA'].includes(role)) {
      res.status(400).json({ error: 'Rol inválido.' });
      return;
    }

    const before = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { name: true, role: true },
    });

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, name: true, email: true, organization: true, role: true, isVerified: true, spaceId: true, createdAt: true },
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
