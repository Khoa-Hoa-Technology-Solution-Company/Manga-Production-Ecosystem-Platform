import { Router } from 'express';
import * as ctrl from '../controllers/pages.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { upload } from '../middleware/upload';

const router = Router();

router.use(authenticate);

router.get('/chapter/:chapterId', ctrl.getByChapterId);
router.post(
  '/chapter/:chapterId',
  authorize('mangaka'),
  upload.single('image'),
  ctrl.upload
);
router.delete('/:id', authorize('mangaka'), ctrl.remove);

export default router;
