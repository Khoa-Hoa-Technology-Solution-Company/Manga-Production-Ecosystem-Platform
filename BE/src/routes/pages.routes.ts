import { Router } from 'express';
import * as ctrl from '../controllers/pages.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { upload } from '../middleware/upload';
import { requireChapterAccess, requirePageAccess } from '../middleware/chapterAccess';

const router = Router();

router.use(authenticate);

router.get('/chapter/:chapterId', requireChapterAccess('read'), ctrl.getByChapterId);
router.post(
  '/chapter/:chapterId',
  requireChapterAccess('edit'),
  upload.single('image'),
  ctrl.upload
);
router.patch('/:pageId/layer-order', requirePageAccess('edit'), ctrl.updateLayerOrder);
router.get('/:pageId/download-layer/:taskId', requirePageAccess('read'), ctrl.downloadLayer);
router.delete('/:id', authorize('mangaka'), ctrl.remove);

export default router;
