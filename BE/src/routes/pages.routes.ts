import { Router } from 'express';
import * as ctrl from '../controllers/pages.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { upload } from '../middleware/upload';
import { requireChapterAccess } from '../middleware/chapterAccess';

const router = Router();

router.use(authenticate);

router.get('/chapter/:chapterId', requireChapterAccess('read'), ctrl.getByChapterId);
router.post(
  '/chapter/:chapterId',
  requireChapterAccess('edit'),
  upload.single('image'),
  ctrl.upload
);
router.delete('/:id', authorize('mangaka'), ctrl.remove);

export default router;
