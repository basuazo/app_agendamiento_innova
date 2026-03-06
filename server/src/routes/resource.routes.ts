import { Router } from 'express';
import { getResources, getResourceById, createResource, updateResource, toggleResource } from '../controllers/resource.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();

router.get('/', authenticate, getResources);
router.get('/:id', authenticate, getResourceById);
router.post('/', authenticate, requireAdmin, createResource);
router.put('/:id', authenticate, requireAdmin, updateResource);
router.patch('/:id/toggle', authenticate, requireAdmin, toggleResource);

export default router;
