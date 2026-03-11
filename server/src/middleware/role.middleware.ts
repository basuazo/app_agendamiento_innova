import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

/** Permite acceso a ADMIN y SUPER_ADMIN */
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
    res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
    return;
  }
  next();
};

/** Permite acceso solo a SUPER_ADMIN */
export const requireSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'SUPER_ADMIN') {
    res.status(403).json({ error: 'Acceso denegado. Se requiere rol de super administrador.' });
    return;
  }
  next();
};
