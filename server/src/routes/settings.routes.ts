import { Router } from 'express';
import { getBusinessHours, updateBusinessHours } from '../controllers/settings.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();

router.get('/settings/business-hours', getBusinessHours);
router.put('/settings/business-hours', authenticate, requireAdmin, updateBusinessHours);

export default router;
