import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getResources = async (req: Request, res: Response): Promise<void> => {
  try {
    const includeInactive = req.query.all === 'true';
    const resources = await prisma.resource.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener recursos' });
  }
};

export const getResourceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const resource = await prisma.resource.findUnique({ where: { id: req.params.id } });
    if (!resource) {
      res.status(404).json({ error: 'Recurso no encontrado' });
      return;
    }
    res.json(resource);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener recurso' });
  }
};

export const createResource = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, category, requiresCertification, imageUrl, capacity } = req.body;
    if (!name || !category) {
      res.status(400).json({ error: 'Nombre y categoría son requeridos' });
      return;
    }
    const resource = await prisma.resource.create({
      data: {
        name, description, category,
        requiresCertification: requiresCertification !== false,
        imageUrl,
        capacity: capacity ? Number(capacity) : 1,
      },
    });
    res.status(201).json(resource);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear recurso' });
  }
};

export const updateResource = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, category, requiresCertification, imageUrl, capacity } = req.body;
    const resource = await prisma.resource.update({
      where: { id: req.params.id },
      data: {
        name, description, category, requiresCertification, imageUrl,
        ...(capacity !== undefined && { capacity: Number(capacity) }),
      },
    });
    res.json(resource);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar recurso' });
  }
};

export const toggleResource = async (req: Request, res: Response): Promise<void> => {
  try {
    const resource = await prisma.resource.findUnique({ where: { id: req.params.id } });
    if (!resource) {
      res.status(404).json({ error: 'Recurso no encontrado' });
      return;
    }
    const updated = await prisma.resource.update({
      where: { id: req.params.id },
      data: { isActive: !resource.isActive },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar estado del recurso' });
  }
};
