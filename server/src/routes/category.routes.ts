import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from '../controllers/category.controller';

const router = Router();

router.get('/', authenticate, getCategories);
router.post('/', authenticate, requireAdmin, createCategory);
router.put('/reorder', authenticate, requireAdmin, reorderCategories);
router.put('/:id', authenticate, requireAdmin, updateCategory);
router.delete('/:id', authenticate, requireAdmin, deleteCategory);

export default router;
