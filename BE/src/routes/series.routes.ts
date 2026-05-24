import { Router } from 'express';
import * as ctrl from '../controllers/series.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', authorize('mangaka'), ctrl.create);
router.put('/:id', authorize('mangaka', 'editor'), ctrl.update);
router.delete('/:id', authorize('mangaka'), ctrl.remove);

export default router;
