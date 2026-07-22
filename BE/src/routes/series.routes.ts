import { Router } from 'express';
import * as ctrl from '../controllers/series.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { upload } from '../middleware/upload';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.getAll);
router.get('/editors', authorize('editorial_board'), ctrl.getEditors);
router.get('/:id', ctrl.getById);
router.post('/', authorize('mangaka'), upload.single('coverImageFile'), ctrl.create);
router.put('/:id', authorize('mangaka', 'editor'), upload.single('coverImageFile'), ctrl.updateMetadata);
router.post('/:id/submit', authorize('mangaka'), ctrl.submitForReview);
router.post('/:id/editor-assignment', authorize('editorial_board'), ctrl.assignEditor);
router.patch('/:id/editor-decision', authorize('editor'), ctrl.editorDecision);
router.put('/:id/handshake', authorize('editor'), ctrl.handleHandshake);
router.post('/:id/subscribe', ctrl.toggleSubscribe);
router.delete('/:id', authorize('mangaka'), ctrl.remove);

export default router;
