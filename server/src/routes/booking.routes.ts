import { Router } from 'express';
import {
  getAllBookings,
  getMyBookings,
  createBooking,
  cancelBooking,
  approveBooking,
  rejectBooking,
  getAdminBookings,
  checkAvailability,
  exportBookings,
} from '../controllers/booking.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();

// Rutas específicas antes de /:id para evitar conflictos de parámetros
router.get('/availability', authenticate, checkAvailability);
router.get('/export', authenticate, requireAdmin, exportBookings);

router.get('/', authenticate, getAllBookings);
router.get('/mine', authenticate, getMyBookings);
router.post('/', authenticate, createBooking);
router.patch('/:id/cancel', authenticate, cancelBooking);
router.patch('/:id/approve', authenticate, requireAdmin, approveBooking);
router.patch('/:id/reject', authenticate, requireAdmin, rejectBooking);

// Admin
router.get('/admin/all', authenticate, requireAdmin, getAdminBookings);

export default router;
