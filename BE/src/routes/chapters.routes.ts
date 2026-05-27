import { Router } from 'express';
import * as ctrl from '../controllers/chapters.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();

router.use(authenticate);

router.get('/series/:seriesId', ctrl.getBySeriesId);
router.get('/:id', ctrl.getById);
router.post('/series/:seriesId', authorize('mangaka'), ctrl.create);
router.put('/:id', authorize('mangaka', 'editor'), ctrl.update);
router.delete('/:id', authorize('mangaka'), ctrl.remove);
router.patch('/:id/status', authorize('mangaka', 'editor', 'editorial_board'), ctrl.updateStatus);
router.post('/:id/access', authorize('mangaka', 'editor'), ctrl.shareAccess);
router.delete('/:id/access/:userId', authorize('mangaka', 'editor'), ctrl.removeAccess);

export default router;
