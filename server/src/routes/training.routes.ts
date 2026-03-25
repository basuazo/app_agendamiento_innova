import { Router } from 'express';
import { getTrainings, createTraining, updateTraining, deleteTraining, updateExemptions, enrollTraining, unenrollTraining, exportTrainings } from '../controllers/training.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTecnica } from '../middleware/role.middleware';

const router = Router();

router.get('/trainings', authenticate, getTrainings);
router.post('/trainings/:id/enroll', authenticate, enrollTraining);
router.delete('/trainings/:id/enroll', authenticate, unenrollTraining);

router.get('/admin/trainings/export', authenticate, requireTecnica, exportTrainings);
router.post('/admin/trainings', authenticate, requireTecnica, createTraining);
router.patch('/admin/trainings/:id', authenticate, requireTecnica, updateTraining);
router.delete('/admin/trainings/:id', authenticate, requireTecnica, deleteTraining);
router.patch('/admin/trainings/:id/exemptions', authenticate, requireTecnica, updateExemptions);

export default router;
