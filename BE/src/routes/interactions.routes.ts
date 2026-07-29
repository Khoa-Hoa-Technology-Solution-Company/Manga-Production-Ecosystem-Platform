import { Router } from 'express';
import * as votesCtrl from '../controllers/votes.controller';
import * as commentsCtrl from '../controllers/comments.controller';
import { authenticate } from '../middleware/auth';
import { requireChapterAccess } from '../middleware/chapterAccess';

const router = Router();

router.use(authenticate);

// Votes
router.post('/:id/vote', requireChapterAccess('comment'), votesCtrl.voteForChapter);
router.get('/:id/votes', requireChapterAccess('read'), votesCtrl.getVotes);

// Comments
router.get('/:id/comments', requireChapterAccess('read'), commentsCtrl.getByChapter);
router.post('/:id/comments', requireChapterAccess('comment'), commentsCtrl.create);

export default router;
