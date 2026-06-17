import { Router } from 'express';
import * as ctrl from '../controllers/chapters.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { requireChapterAccess } from '../middleware/chapterAccess';

const router = Router();

router.use(authenticate);


router.get('/series/:seriesId', ctrl.getBySeriesId);
router.get('/:id', ctrl.getById);
router.post('/:id/view', ctrl.incrementView);

router.post('/series/:seriesId', authorize('mangaka'), ctrl.create);
router.put('/:id', requireChapterAccess('edit'), ctrl.update);
router.delete('/:id', requireChapterAccess('edit'), ctrl.remove);
router.patch('/:id/status', requireChapterAccess('edit'), ctrl.updateStatus);
router.post('/:id/access', authorize('mangaka', 'editor'), ctrl.shareAccess);
router.delete('/:id/access/:userId', authorize('mangaka', 'editor'), ctrl.removeAccess);

export default router;
