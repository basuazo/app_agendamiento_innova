import { Router } from 'express';
import { getUsers, createUser, deleteUser, changeUserRole, verifyUser, updateUser, getAuditLogs, exportUsers, getUserSummary } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin, requireComunitaria, requireElevated } from '../middleware/role.middleware';

const router = Router();

// Rutas estáticas ANTES de las dinámicas (:id)
router.get('/', authenticate, requireElevated, getUsers);
router.get('/export', authenticate, requireAdmin, exportUsers);
router.get('/audit-logs', authenticate, requireAdmin, getAuditLogs);
router.post('/', authenticate, requireAdmin, createUser);
router.get('/:id/summary', authenticate, requireElevated, getUserSummary);
router.delete('/:id', authenticate, requireAdmin, deleteUser);
router.patch('/:id', authenticate, requireAdmin, updateUser);
router.patch('/:id/verify', authenticate, requireComunitaria, verifyUser);
router.patch('/:id/role', authenticate, requireAdmin, changeUserRole);

export default router;
