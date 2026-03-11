import { Router } from 'express';
import { getUsers, createUser, deleteUser, changeUserRole, verifyUser, updateUser, getAuditLogs } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();

router.get('/', authenticate, requireAdmin, getUsers);
router.post('/', authenticate, requireAdmin, createUser);
router.delete('/:id', authenticate, requireAdmin, deleteUser);
router.patch('/:id', authenticate, requireAdmin, updateUser);
router.patch('/:id/verify', authenticate, requireAdmin, verifyUser);
router.patch('/:id/role', authenticate, requireAdmin, changeUserRole);
router.get('/audit-logs', authenticate, requireAdmin, getAuditLogs);

export default router;
