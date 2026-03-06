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
} from '../controllers/certification.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();

// Usuario
router.get('/certifications/mine', authenticate, getMyCertifications);
router.get('/certifications/my-requests', authenticate, getMyRequests);
router.post('/certifications/request', authenticate, requestCertification);
router.delete('/certifications/my-requests/:id', authenticate, cancelMyRequest);

// Admin
router.get('/admin/certifications/requests', authenticate, requireAdmin, getAllRequests);
router.patch('/admin/certifications/schedule', authenticate, requireAdmin, scheduleSession);
router.patch('/admin/certifications/requests/:id/resolve', authenticate, requireAdmin, resolveRequest);
router.get('/admin/certifications', authenticate, requireAdmin, getAllCertifications);
router.delete('/admin/certifications/:id', authenticate, requireAdmin, revokeCertification);

export default router;
