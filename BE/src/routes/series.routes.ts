import { Router } from 'express';
import * as ctrl from '../controllers/series.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { upload } from '../middleware/upload';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', authorize('mangaka'), upload.single('coverImage'), ctrl.create);
router.post('/:id/submit', authorize('mangaka'), ctrl.submit);
router.patch('/:id/review', authorize('editor', 'editorial_board'), ctrl.review);
router.put('/:id', authorize('mangaka', 'editor'), ctrl.update);
router.delete('/:id', authorize('mangaka'), ctrl.remove);

export default router;
