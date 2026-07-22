import { Chapter } from '../models/Chapter';
import { Series } from '../models/Series';
import { User } from '../models/User';
import { EBVote } from '../models/EBVote';
import { WorkflowEvent } from '../models/WorkflowEvent';
import { notifyNewChapterToSubscribers } from './notification.service';

export interface WorkflowActor {
  _id: string;
  role: string;
  isEbHead?: boolean;
}

async function recordEvent(
  seriesId: string,
  action: string,
  fromStatus: string,
  toStatus: string,
  actor: WorkflowActor,
  reason?: string
): Promise<void> {
  await WorkflowEvent.create({
    entityType: 'Series',
    entityId: seriesId,
    action,
    fromStatus,
    toStatus,
    actorId: actor._id,
    actorRole: actor.role,
    reason,
  });
}

export async function submitSeries(seriesId: string, actor: WorkflowActor) {
  const series = await Series.findById(seriesId);
  if (!series) throw new Error('Series not found.');
  if (actor.role !== 'mangaka' || series.mangakaId.toString() !== actor._id) {
    throw new Error('Only the owning mangaka can submit this series.');
  }
  if (!['Draft', 'Rejected'].includes(series.status)) {
    throw new Error(`Series cannot be submitted from status "${series.status}".`);
  }
  if (await Chapter.countDocuments({ seriesId }) === 0) {
    throw new Error('Series must have at least one draft chapter before submission.');
  }

  const fromStatus = series.status;
  series.status = 'Pending_Editor';
  series.rejectionNotes = '';
  await series.save();
  await recordEvent(seriesId, 'submit_series', fromStatus, series.status, actor);
  return series;
}

export async function assignSeriesEditor(seriesId: string, editorId: string, actor: WorkflowActor) {
  if (actor.role !== 'editorial_board' || !actor.isEbHead) {
    throw new Error('Only the Head of the Editorial Board can assign a Tantou Editor.');
  }

  const [series, editor] = await Promise.all([
    Series.findById(seriesId),
    User.findOne({ _id: editorId, role: 'editor', isActive: true }),
  ]);
  if (!series) throw new Error('Series not found.');
  if (!editor) throw new Error('The selected user is not an active editor.');
  if (series.status !== 'Pending_Editor') {
    throw new Error('Editors can only be assigned to a submitted series awaiting editor review.');
  }

  series.editorId = editor._id;
  series.editorStatus = 'pending';
  series.editorInvitedBy = actor._id as any;
  series.editorInvitedAt = new Date();
  series.editorRespondedAt = undefined;
  await series.save();
  await recordEvent(seriesId, 'assign_editor', series.status, series.status, actor);
  return series;
}

export async function respondToSeriesAssignment(
  seriesId: string,
  action: 'accept' | 'decline',
  actor: WorkflowActor
) {
  const series = await Series.findById(seriesId);
  if (!series) throw new Error('Series not found.');
  if (actor.role !== 'editor' || series.editorId?.toString() !== actor._id) {
    throw new Error('Only the invited editor can respond to this assignment.');
  }
  if (series.status !== 'Pending_Editor' || series.editorStatus !== 'pending') {
    throw new Error('This editor invitation is no longer pending.');
  }

  series.editorRespondedAt = new Date();
  if (action === 'accept') {
    series.editorStatus = 'accepted';
  } else {
    series.editorId = undefined;
    series.editorStatus = 'none';
  }
  await series.save();
  await recordEvent(seriesId, `editor_${action}`, series.status, series.status, actor);
  return series;
}

export async function reviewSeriesByEditor(
  seriesId: string,
  decision: 'approve' | 'request_changes',
  actor: WorkflowActor,
  comments?: string
) {
  const series = await Series.findById(seriesId);
  if (!series) throw new Error('Series not found.');
  if (
    actor.role !== 'editor' ||
    series.editorId?.toString() !== actor._id ||
    series.editorStatus !== 'accepted'
  ) {
    throw new Error('Only the assigned and accepted Tantou Editor can review this series.');
  }
  if (series.status !== 'Pending_Editor') {
    throw new Error('Series is not awaiting Tantou Editor review.');
  }
  if (decision === 'request_changes' && !comments?.trim()) {
    throw new Error('Revision notes are required when requesting changes.');
  }
  if (decision === 'approve') {
    const approvedChapterCount = await Chapter.countDocuments({
      seriesId: series._id,
      status: { $in: ['Approved', 'Published'] },
    });
    if (approvedChapterCount === 0) {
      throw new Error('Approve at least one submitted chapter before forwarding the series to the Editorial Board.');
    }
  }

  const fromStatus = series.status;
  series.status = decision === 'approve' ? 'Pending_EB' : 'Draft';
  series.rejectionNotes = decision === 'approve' ? '' : comments!.trim();
  if (decision === 'approve') {
    series.ebReviewStartedAt = new Date();
    await EBVote.deleteMany({ seriesId: series._id });
  }
  await series.save();
  await recordEvent(seriesId, `editor_${decision}`, fromStatus, series.status, actor, comments);
  return series;
}

export async function finalizeSeriesByEditorialBoard(
  seriesId: string,
  decision: 'approved' | 'rejected',
  actor: WorkflowActor,
  comments?: string,
  publicationSchedule: 'weekly' | 'monthly' = 'weekly'
) {
  if (actor.role !== 'editorial_board' || !actor.isEbHead) {
    throw new Error('Only the Head of the Editorial Board can finalize a series decision.');
  }
  const series = await Series.findById(seriesId);
  if (!series) throw new Error('Series not found.');
  if (series.status !== 'Pending_EB') throw new Error('Series is not pending Editorial Board review.');
  if (decision === 'rejected' && !comments?.trim()) {
    throw new Error('Editorial Board feedback is required when requesting changes.');
  }

  const existingPublishedChapter = decision === 'approved'
    ? await Chapter.findOne({ seriesId: series._id, status: 'Published' }).sort({ chapterNumber: 1 })
    : null;
  const launchChapter = decision === 'approved' && !existingPublishedChapter
    ? await Chapter.findOne({ seriesId: series._id, status: 'Approved' }).sort({ chapterNumber: 1 })
    : null;
  if (decision === 'approved' && !existingPublishedChapter && !launchChapter) {
    throw new Error('The series cannot be published without an approved launch chapter.');
  }

  const fromStatus = series.status;
  series.status = decision === 'approved' ? 'Active' : 'Draft';
  series.publicationSchedule = decision === 'approved' ? publicationSchedule : series.publicationSchedule;
  series.rejectionNotes = decision === 'approved' ? '' : comments!.trim();
  await series.save();
  await recordEvent(seriesId, `eb_${decision}`, fromStatus, series.status, actor, comments);

  // Publishing a series must never expose an empty reader page. Publish the
  // earliest approved chapter as the launch chapter; later approved chapters
  // remain scheduled for the Tantou Editor to publish individually.
  if (launchChapter) {
    launchChapter.status = 'Published';
    launchChapter.publishedAt = new Date();
    await launchChapter.save();
    await WorkflowEvent.create({
      entityType: 'Chapter',
      entityId: launchChapter._id,
      action: 'eb_launch_publication',
      fromStatus: 'Approved',
      toStatus: 'Published',
      actorId: actor._id,
      actorRole: actor.role,
    });
    try {
      await notifyNewChapterToSubscribers(
        series._id.toString(),
        launchChapter._id.toString(),
        launchChapter.title,
        launchChapter.chapterNumber
      );
    } catch (error) {
      console.error('Failed to notify subscribers about the launch chapter:', error);
    }
  }
  return series;
}
