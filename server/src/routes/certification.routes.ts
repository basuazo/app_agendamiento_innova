import { Router } from 'express';
import {
  getMyCertifications,
  getMyRequests,
  requestCertification,
  cancelMyRequest,
  getAllRequests,
  scheduleSession,
  resolveRequest,
  getAllCertifications,
  revokeCertification,
  cancelCertSession,
} from '../controllers/certification.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTecnica } from '../middleware/role.middleware';

const router = Router();

// Usuario
router.get('/certifications/mine', authenticate, getMyCertifications);
router.get('/certifications/my-requests', authenticate, getMyRequests);
router.post('/certifications/request', authenticate, requestCertification);
router.delete('/certifications/my-requests/:id', authenticate, cancelMyRequest);

// Admin / Líder Técnica
router.get('/admin/certifications/requests', authenticate, requireTecnica, getAllRequests);
router.patch('/admin/certifications/schedule', authenticate, requireTecnica, scheduleSession);
router.patch('/admin/certifications/requests/:id/resolve', authenticate, requireTecnica, resolveRequest);
router.get('/admin/certifications', authenticate, requireTecnica, getAllCertifications);
router.delete('/admin/certifications/:id', authenticate, requireTecnica, revokeCertification);
router.patch('/admin/certifications/cancel-session', authenticate, requireTecnica, cancelCertSession);

export default router;
