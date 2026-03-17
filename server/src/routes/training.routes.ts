import { Router } from 'express';
import { getTrainings, createTraining, deleteTraining, updateExemptions, enrollTraining, unenrollTraining } from '../controllers/training.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTecnica } from '../middleware/role.middleware';

const router = Router();

router.get('/trainings', authenticate, getTrainings);
router.post('/trainings/:id/enroll', authenticate, enrollTraining);
router.delete('/trainings/:id/enroll', authenticate, unenrollTraining);

router.post('/admin/trainings', authenticate, requireTecnica, createTraining);
router.delete('/admin/trainings/:id', authenticate, requireTecnica, deleteTraining);
router.patch('/admin/trainings/:id/exemptions', authenticate, requireTecnica, updateExemptions);

export default router;
