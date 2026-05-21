import { Chapter, ChapterStatus } from '../models/Chapter';

/**
 * Valid workflow transitions for chapters.
 * Draft → Reviewing → Approved → Published
 */
const VALID_TRANSITIONS: Record<ChapterStatus, ChapterStatus[]> = {
  Draft: ['Reviewing'],
  Reviewing: ['Draft', 'Approved'],   // can reject back to Draft
  Approved: ['Published', 'Reviewing'], // can revert to Reviewing
  Published: [],                       // final state
};

export async function transitionChapterStatus(
  chapterId: string,
  newStatus: ChapterStatus,
  userId: string,
  userRole: string
): Promise<typeof Chapter.prototype> {
  const chapter = await Chapter.findById(chapterId);
  if (!chapter) throw new Error('Chapter not found.');

  const currentStatus = chapter.status;
  const allowed = VALID_TRANSITIONS[currentStatus];

  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Cannot transition from "${currentStatus}" to "${newStatus}". Allowed: [${allowed.join(', ')}]`
    );
  }

  // Role-based transition rules
  if (newStatus === 'Reviewing' && currentStatus === 'Draft') {
    // Only mangaka can submit for review
    if (userRole !== 'mangaka') throw new Error('Only mangaka can submit chapters for review.');
  }

  if (newStatus === 'Approved' || (newStatus === 'Draft' && currentStatus === 'Reviewing')) {
    // Only editor can approve or reject
    if (userRole !== 'editor' && userRole !== 'editorial_board') {
      throw new Error('Only editors can approve or reject chapters.');
    }
  }

  if (newStatus === 'Published') {
    // Only editorial board can publish
    if (userRole !== 'editorial_board') {
      throw new Error('Only editorial board can publish chapters.');
    }
    chapter.publishedAt = new Date();
  }

  chapter.status = newStatus;
  await chapter.save();

  return chapter;
}
