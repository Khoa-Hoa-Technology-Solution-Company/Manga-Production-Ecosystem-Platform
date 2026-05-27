import { Router } from 'express';
import * as ctrl from '../controllers/series.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { upload } from '../middleware/upload';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.getAll);
router.get('/editors', ctrl.getEditors);
router.get('/:id', ctrl.getById);
router.post('/', authorize('mangaka'), upload.single('coverImageFile'), ctrl.create);
router.put('/:id', authorize('mangaka', 'editor', 'editorial_board'), upload.single('coverImageFile'), ctrl.update);
router.delete('/:id', authorize('mangaka'), ctrl.remove);

export default router;
