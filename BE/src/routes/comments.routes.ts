import { Router } from 'express';
import * as ctrl from '../controllers/comments.controller';
import { authenticate } from '../middleware/auth';
import { requireCommentAccess } from '../middleware/chapterAccess';

const router = Router();

router.use(authenticate);

router.post('/:id/like', requireCommentAccess('comment'), ctrl.like);

export default router;
