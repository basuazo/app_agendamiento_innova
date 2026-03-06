import { Router } from 'express';
import { getTrainings, createTraining, deleteTraining, updateExemptions } from '../controllers/training.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();

router.get('/trainings', authenticate, getTrainings);
router.post('/admin/trainings', authenticate, requireAdmin, createTraining);
router.delete('/admin/trainings/:id', authenticate, requireAdmin, deleteTraining);
router.patch('/admin/trainings/:id/exemptions', authenticate, requireAdmin, updateExemptions);

export default router;
