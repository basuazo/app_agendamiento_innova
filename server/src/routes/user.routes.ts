import { Router } from 'express';
import { getUsers, createUser, deleteUser, changeUserRole, verifyUser, updateUser, getAuditLogs } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin, requireComunitaria, requireElevated } from '../middleware/role.middleware';

const router = Router();

router.get('/', authenticate, requireElevated, getUsers);             // Todos los roles elevados pueden ver la lista (necesario para inscribir en capacitaciones)
router.post('/', authenticate, requireAdmin, createUser);             // Solo Admin
router.delete('/:id', authenticate, requireAdmin, deleteUser);        // Solo Admin
router.patch('/:id', authenticate, requireAdmin, updateUser);         // Solo Admin
router.patch('/:id/verify', authenticate, requireComunitaria, verifyUser); // Líder Comunitaria puede verificar
router.patch('/:id/role', authenticate, requireAdmin, changeUserRole); // Solo Admin
router.get('/audit-logs', authenticate, requireAdmin, getAuditLogs);  // Solo Admin

export default router;
