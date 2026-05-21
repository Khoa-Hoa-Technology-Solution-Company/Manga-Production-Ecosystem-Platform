import { Router } from 'express';
import * as votesCtrl from '../controllers/votes.controller';
import * as commentsCtrl from '../controllers/comments.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Votes
router.post('/:id/vote', votesCtrl.voteForChapter);
router.get('/:id/votes', votesCtrl.getVotes);

// Comments
router.get('/:id/comments', commentsCtrl.getByChapter);
router.post('/:id/comments', commentsCtrl.create);

export default router;
