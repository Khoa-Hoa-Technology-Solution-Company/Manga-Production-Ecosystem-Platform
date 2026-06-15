import { Request, Response } from 'express';
import { Task } from '../models/Task';
import { User } from '../models/User';
import { Chapter } from '../models/Chapter';
import { notifyTaskAssigned, notifyTaskSubmitted } from '../services/notification.service';

// ── Helpers ──────────────────────────────────────────

/**
 * Cascade-update all zones that belong to a task's scope.
 * - chapter-level → all zones in all pages of the chapter
 * - page-level → all zones in that page
 */
async function cascadeZoneUpdate(
  task: { assignmentLevel: string; chapterId: any; pageId?: any },
  update: Record<string, any>
): Promise<void> {
  const { Zone } = await import('../models/Zone');
  const { Page } = await import('../models/Page');

  if (task.assignmentLevel === 'chapter') {
    const pages = await Page.find({ chapterId: task.chapterId }, '_id');
    const pageIds = pages.map((p: any) => p._id);
    if (pageIds.length > 0) {
      await Zone.updateMany({ pageId: { $in: pageIds } }, update);
    }
  } else if (task.assignmentLevel === 'page' && task.pageId) {
    await Zone.updateMany({ pageId: task.pageId }, update);
  }
}

async function syncChapterProgress(chapterId: any): Promise<void> {
  try {
    if (!chapterId) return;
    const tasks = await Task.find({ chapterId });
    if (tasks.length === 0) {
      const chapter = await Chapter.findById(chapterId);
      if (chapter) {
        let progress = 0;
        if (chapter.status === 'Published') progress = 100;
        else if (chapter.status === 'Approved') progress = 95;
        else if (chapter.status === 'Reviewing') progress = 80;
        
        if (chapter.progress !== progress) {
          chapter.progress = progress;
          await chapter.save();
        }
      }
      return;
    }

    let totalProgress = 0;
    for (const t of tasks) {
      let p = 0;
      if (t.status === 'assigned') p = 20;
      else if (t.status === 'in_progress') p = 50;
      else if (t.status === 'review') p = 90;
      else if (t.status === 'done') p = 100;
      totalProgress += p;
    }

    const averageProgress = Math.round(totalProgress / tasks.length);
    const chapter = await Chapter.findById(chapterId);
    if (chapter && chapter.progress !== averageProgress) {
      chapter.progress = averageProgress;
      await chapter.save();
    }
  } catch (err) {
    console.error('Error syncing chapter progress:', err);
  }
}


export async function getAll(req: Request, res: Response): Promise<void> {
  try {
    const { status, type, assignedTo, pageId, chapterId, seriesId, assignmentLevel, limit = '20', page = '1' } = req.query;
    const filter: any = {};

    if (status) filter.status = status;
    if (type) filter.type = type;
    if (pageId) filter.pageId = pageId;
    if (chapterId) filter.chapterId = chapterId;
    if (seriesId) filter.seriesId = seriesId;
    if (assignmentLevel) filter.assignmentLevel = assignmentLevel;

    // Role-based filtering
    if (req.user?.role === 'assistant') {
      // Only show tasks from Active (published) series, except tasks already assigned to this assistant
      const { Series } = await import('../models/Series');
      const activeSeriesIds = (await Series.find({ status: 'Active' }, '_id')).map((s: any) => s._id);

      if (assignedTo === 'me') {
        filter.assignedTo = req.user._id;
      } else {
        // Determine which series this assistant is a dedicated member of (only Active ones)
        const dedicatedSeries = await Series.find(
          { 'dedicatedAssistants.userId': req.user._id, status: 'Active' },
          '_id'
        );
        const dedicatedSeriesIds = dedicatedSeries.map((s: any) => s._id);

        // Show:
        // 1. Tasks already assigned to me (regardless of series status, so they can finish in-progress work)
        // 2. Open freelance tasks from Active series only
        // 3. Open dedicated tasks from Active series where this assistant is dedicated
        filter.$or = [
          { assignedTo: req.user._id },
          { status: 'open', assistantType: 'freelance', seriesId: { $in: activeSeriesIds } },
          ...(dedicatedSeriesIds.length > 0
            ? [{ status: 'open', assistantType: 'dedicated', seriesId: { $in: dedicatedSeriesIds } }]
            : []),
        ];
      }
    } else if (req.user?.role === 'mangaka') {
      filter.assignedBy = req.user._id;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('seriesId', 'title coverImage')
        .populate('chapterId', 'chapterNumber title')
        .populate('pageId', 'pageNumber originalImage')
        .populate('assignedTo', 'displayName avatar')
        .populate('assignedBy', 'displayName avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string)),
      Task.countDocuments(filter),
    ]);

    res.json({ tasks, total, page: parseInt(page as string) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const task = await Task.findById(req.params.id)
      .populate('seriesId', 'title coverImage')
      .populate('chapterId', 'chapterNumber title')
      .populate('pageId', 'pageNumber originalImage')
      .populate('assignedTo', 'displayName avatar skills rating')
      .populate('assignedBy', 'displayName avatar');

    if (!task) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }
    res.json({ task });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const { seriesId, chapterId, pageId, assignmentLevel = 'page' } = req.body;

    // Validate that the series is Active before allowing task creation
    if (seriesId) {
      const { Series } = await import('../models/Series');
      const series = await Series.findById(seriesId);
      if (!series) {
        res.status(404).json({ error: 'Series not found.' });
        return;
      }
      if (series.status !== 'Active') {
        res.status(400).json({ error: 'Tasks can only be created for Active (published) series. Current status: ' + series.status });
        return;
      }
    }

    // ── Assignment level conflict validation ──────────
    const activeFilter = { status: { $nin: ['done'] } };

    if (assignmentLevel === 'chapter') {
      // Check: no existing active chapter-level task for this chapter
      const existingChapterTask = await Task.findOne({
        chapterId,
        assignmentLevel: 'chapter',
        ...activeFilter,
      });
      if (existingChapterTask) {
        res.status(400).json({ error: 'This chapter already has an active chapter-level task assigned.' });
        return;
      }

      // Check: no existing active page-level tasks in this chapter
      const existingPageTasks = await Task.findOne({
        chapterId,
        assignmentLevel: 'page',
        ...activeFilter,
      });
      if (existingPageTasks) {
        res.status(400).json({ error: 'Cannot assign entire chapter — there are active page-level tasks in this chapter. Complete or remove them first.' });
        return;
      }
    } else if (assignmentLevel === 'page') {
      // Check: no existing active chapter-level task for this chapter
      const existingChapterTask = await Task.findOne({
        chapterId,
        assignmentLevel: 'chapter',
        ...activeFilter,
      });
      if (existingChapterTask) {
        res.status(400).json({ error: 'Cannot assign individual pages — the entire chapter is already assigned.' });
        return;
      }

      // Check: no existing active page-level task for this specific page
      if (pageId) {
        const existingPageTask = await Task.findOne({
          pageId,
          assignmentLevel: 'page',
          ...activeFilter,
        });
        if (existingPageTask) {
          res.status(400).json({ error: 'This page already has an active task assigned.' });
          return;
        }
      }
    }

    // Build task data — no zoneId
    const taskData: any = {
      ...req.body,
      assignedBy: req.user?._id,
      assignmentLevel,
    };
    // Chapter-level tasks don't have a pageId
    if (assignmentLevel === 'chapter') {
      delete taskData.pageId;
    }
    // Remove zoneId if accidentally passed
    delete taskData.zoneId;

    const task = await Task.create(taskData);

    // ── Cascade zone updates ─────────────────────────
    if (task.assignedTo) {
      await cascadeZoneUpdate(task, {
        assignedTo: task.assignedTo,
        status: 'assigned',
        progress: 20,
      });
    }

    // Notify assigned assistant if specified
    if (req.body.assignedTo) {
      const series = await (await import('../models/Series')).Series.findById(req.body.seriesId);
      await notifyTaskAssigned(
        req.body.assignedTo,
        req.body.title,
        series?.title || 'Unknown Series',
        task._id.toString()
      );
    }

    await syncChapterProgress(task.chapterId);

    res.status(201).json({ task });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function acceptTask(req: Request, res: Response): Promise<void> {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) { res.status(404).json({ error: 'Task not found.' }); return; }
    if (task.status !== 'open') { res.status(400).json({ error: 'Task is not available.' }); return; }

    // Verify the task's series is Active before allowing acceptance
    const { Series } = await import('../models/Series');
    const series = await Series.findById(task.seriesId);
    if (!series || series.status !== 'Active') {
      res.status(400).json({ error: 'Tasks can only be accepted from Active (published) series.' });
      return;
    }

    task.assignedTo = req.user?._id as any;
    task.status = 'assigned';
    await task.save();

    // Cascade update zones
    await cascadeZoneUpdate(task, {
      assignedTo: req.user?._id,
      status: 'assigned',
      progress: 20,
    });

    await syncChapterProgress(task.chapterId);

    res.json({ task, message: 'Task accepted.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function submitTask(req: Request, res: Response): Promise<void> {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) { res.status(404).json({ error: 'Task not found.' }); return; }

    if (task.assignedTo?.toString() !== req.user?._id) {
      res.status(403).json({ error: 'Only the assigned assistant can submit.' });
      return;
    }

    // Handle file upload
    if (req.file) {
      const { uploadToR2 } = await import('../services/storage.service');
      const fileUrl = await uploadToR2(req.file, 'tasks');
      task.submittedFile = fileUrl;

      const { Page } = await import('../models/Page');
      if (task.assignmentLevel === 'chapter') {
        const targetPageId = req.body.pageId || req.query.pageId;
        if (targetPageId) {
          await Page.findByIdAndUpdate(targetPageId, { processedImage: fileUrl });
        }
      } else if (task.pageId) {
        await Page.findByIdAndUpdate(task.pageId, { processedImage: fileUrl });
      }
    }

    task.status = 'review';
    await task.save();

    // Cascade update zones to review status
    await cascadeZoneUpdate(task, {
      status: 'review',
      progress: 90,
    });

    // Notify mangaka
    const assistant = await User.findById(req.user?._id);
    await notifyTaskSubmitted(
      task.assignedBy.toString(),
      assistant?.displayName || 'Assistant',
      task.title,
      task._id.toString()
    );

    await syncChapterProgress(task.chapterId);

    res.json({ task, message: 'Task submitted for review.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateStatus(req: Request, res: Response): Promise<void> {
  try {
    const { status } = req.body;
    const oldTask = await Task.findById(req.params.id);
    if (!oldTask) { res.status(404).json({ error: 'Task not found.' }); return; }

    const userId = req.user?._id;
    const isCreator = oldTask.assignedBy.toString() === userId;
    const isAssignee = oldTask.assignedTo?.toString() === userId;

    if (!isCreator && !isAssignee) {
      res.status(403).json({ error: 'You are not authorized to update this task status.' });
      return;
    }

    if (isAssignee && !isCreator) {
      if (!['in_progress', 'review'].includes(status)) {
        res.status(400).json({ error: 'Assistants can only change task status to in_progress or review.' });
        return;
      }
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    if (!task) { res.status(404).json({ error: 'Task not found.' }); return; }

    // If task is done, update assistant earnings
    if (status === 'done' && task.assignedTo) {
      await User.findByIdAndUpdate(task.assignedTo, {
        $inc: { totalEarnings: task.wage },
      });
    }

    // Cascade zone status update
    let zoneProgress = 0;
    if (status === 'assigned') zoneProgress = 20;
    else if (status === 'in_progress') zoneProgress = 50;
    else if (status === 'review') zoneProgress = 90;
    else if (status === 'done') zoneProgress = 100;

    await cascadeZoneUpdate(task, { status, progress: zoneProgress });

    // Trigger revision notification if status goes from 'review' to 'in_progress'
    if (oldTask.status === 'review' && status === 'in_progress' && task.assignedTo) {
      const { notifyTaskRevision } = await import('../services/notification.service');
      await notifyTaskRevision(
        task.assignedTo.toString(),
        task.title,
        task.reviewNotes || '',
        task._id.toString()
      );
    }

    await syncChapterProgress(task.chapterId);

    res.json({ task });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const updateData: any = {};
    const allowed = ['title', 'description', 'type', 'wage', 'deadline', 'reviewNotes', 'assignedTo', 'status'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    }

    const oldTask = await Task.findById(req.params.id);
    if (!oldTask) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    const task = await Task.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('seriesId', 'title coverImage')
      .populate('chapterId', 'chapterNumber title')
      .populate('pageId', 'pageNumber originalImage')
      .populate('assignedTo', 'displayName avatar')
      .populate('assignedBy', 'displayName avatar');

    if (!task) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    // Cascade zone updates based on task status/assignee
    let progress = 0;
    if (task.status === 'assigned') progress = 20;
    else if (task.status === 'in_progress') progress = 50;
    else if (task.status === 'review') progress = 90;
    else if (task.status === 'done') progress = 100;

    const zoneUpdate: any = { status: task.status, progress };
    if (task.assignedTo) {
      const assigneeObj = task.assignedTo as any;
      zoneUpdate.assignedTo = assigneeObj._id ? assigneeObj._id : assigneeObj;
    } else {
      zoneUpdate.$unset = { assignedTo: 1 };
    }
    await cascadeZoneUpdate(task, zoneUpdate);

    // Trigger notification if assignee was set or changed
    if (req.body.assignedTo) {
      const series = await (await import('../models/Series')).Series.findById(task.seriesId);
      const { notifyTaskAssigned } = await import('../services/notification.service');
      await notifyTaskAssigned(
        req.body.assignedTo,
        task.title,
        series?.title || 'Unknown Series',
        task._id.toString()
      );
    }

    // Trigger revision notification if status goes from 'review' to 'in_progress' OR (status is 'in_progress' and reviewNotes is modified/provided)
    const isStatusRevision = oldTask.status === 'review' && task.status === 'in_progress';
    const isNotesUpdatedForRevision = task.status === 'in_progress' && req.body.reviewNotes !== undefined && req.body.reviewNotes !== oldTask.reviewNotes;
    
    if ((isStatusRevision || isNotesUpdatedForRevision) && task.assignedTo) {
      const assigneeObj = task.assignedTo as any;
      const assistantId = assigneeObj._id ? assigneeObj._id.toString() : assigneeObj.toString();
      
      const { notifyTaskRevision } = await import('../services/notification.service');
      await notifyTaskRevision(
        assistantId,
        task.title,
        task.reviewNotes || '',
        task._id.toString()
      );
    }

    await syncChapterProgress(task.chapterId);

    res.json({ task });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function declineTask(req: Request, res: Response): Promise<void> {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) { res.status(404).json({ error: 'Task not found.' }); return; }
    
    if (task.assignedTo?.toString() !== req.user?._id) {
      res.status(403).json({ error: 'Only the assigned assistant can decline.' });
      return;
    }
    
    if (task.status !== 'assigned') {
      res.status(400).json({ error: 'Only designated tasks can be declined.' });
      return;
    }

    const previousAssignee = task.assignedTo;

    // Reset task assignment using $unset so MongoDB deletes the field completely
    const updatedTask = await Task.findByIdAndUpdate(
      task._id,
      {
        $unset: { assignedTo: 1 },
        status: 'open',
      },
      { new: true }
    );

    // Cascade reset all zones
    await cascadeZoneUpdate(task, {
      $unset: { assignedTo: 1 },
      status: 'open',
      progress: 0,
    });

    // Notify Mangaka
    const assistant = await User.findById(previousAssignee);
    const { notifyTaskDeclined } = await import('../services/notification.service');
    await notifyTaskDeclined(
      task.assignedBy.toString(),
      assistant?.displayName || 'Assistant',
      task.title,
      task._id.toString()
    );

    await syncChapterProgress(task.chapterId);

    res.json({ task: updatedTask, message: 'Task declined and set to open.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function cancelTask(req: Request, res: Response): Promise<void> {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    if (task.assignedBy.toString() !== req.user?._id) {
      res.status(403).json({ error: 'Only the creator of the task can cancel it.' });
      return;
    }

    if (['in_progress', 'review', 'done'].includes(task.status)) {
      res.status(400).json({ error: 'Cannot cancel a task that is in progress, under review, or done.' });
      return;
    }

    const assistantId = task.assignedTo;
    const taskTitle = task.title;
    const taskId = task._id;
    const seriesId = task.seriesId;
    const chapterId = task.chapterId;
    const oldStatus = task.status;

    // 1. Cascade reset all zones associated with the task
    await cascadeZoneUpdate(task, {
      $unset: { assignedTo: 1 },
      status: 'open',
      progress: 0,
    });

    // 2. Hard delete the task
    await Task.findByIdAndDelete(taskId);

    // 3. If task was in 'assigned' status and had an assistant, notify them
    if (oldStatus === 'assigned' && assistantId) {
      const { Series } = await import('../models/Series');
      const series = await Series.findById(seriesId);
      const { notifyTaskCancelled } = await import('../services/notification.service');
      await notifyTaskCancelled(
        assistantId.toString(),
        taskTitle,
        series?.title || 'Unknown Series',
        taskId.toString()
      );
    }

    // 4. Sync chapter progress
    await syncChapterProgress(chapterId);

    res.json({ message: 'Task cancelled successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

