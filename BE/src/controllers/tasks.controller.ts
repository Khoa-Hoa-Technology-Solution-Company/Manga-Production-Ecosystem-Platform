import { Request, Response } from 'express';
import { Task } from '../models/Task';
import { User } from '../models/User';
import { Chapter } from '../models/Chapter';
import { notifyTaskAssigned, notifyTaskSubmitted } from '../services/notification.service';

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
    const { status, type, assignedTo, pageId, chapterId, seriesId, limit = '20', page = '1' } = req.query;
    const filter: any = {};

    if (status) filter.status = status;
    if (type) filter.type = type;
    if (pageId) filter.pageId = pageId;
    if (chapterId) filter.chapterId = chapterId;
    if (seriesId) filter.seriesId = seriesId;

    // Role-based filtering
    if (req.user?.role === 'assistant') {
      if (assignedTo === 'me') {
        filter.assignedTo = req.user._id;
      } else {
        // Determine which series this assistant is a dedicated member of
        const { Series } = await import('../models/Series');
        const dedicatedSeries = await Series.find(
          { 'dedicatedAssistants.userId': req.user._id },
          '_id'
        );
        const dedicatedSeriesIds = dedicatedSeries.map((s: any) => s._id);

        // Show:
        // 1. All freelance open tasks
        // 2. Dedicated tasks only from series where this assistant is dedicated
        // 3. Tasks already assigned to me
        filter.$or = [
          { assignedTo: req.user._id },
          { status: 'open', assistantType: 'freelance' },
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
    // Validate that the series is Active before allowing task creation
    const seriesId = req.body.seriesId;
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

    const task = await Task.create({
      ...req.body,
      assignedBy: req.user?._id,
    });

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

    // Sync corresponding Zone if specified
    if (task.zoneId) {
      const zoneUpdate: any = {
        status: task.assignedTo ? 'assigned' : 'open',
        progress: task.assignedTo ? 20 : 0,
      };
      if (task.assignedTo) {
        zoneUpdate.assignedTo = task.assignedTo;
      } else {
        zoneUpdate.$unset = { assignedTo: 1 };
      }
      await (await import('../models/Zone')).Zone.findByIdAndUpdate(task.zoneId, zoneUpdate);
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

    task.assignedTo = req.user?._id as any;
    task.status = 'assigned';
    await task.save();

    if (task.zoneId) {
      await (await import('../models/Zone')).Zone.findByIdAndUpdate(task.zoneId, {
        assignedTo: req.user?._id,
        status: 'assigned',
        progress: 20,
      });
    }

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
    }

    task.status = 'review';
    await task.save();

    if (task.zoneId) {
      await (await import('../models/Zone')).Zone.findByIdAndUpdate(task.zoneId, {
        status: 'review',
        progress: 90,
      });
    }

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

    if (task.zoneId) {
      let progress = 0;
      if (status === 'assigned') progress = 20;
      else if (status === 'in_progress') progress = 50;
      else if (status === 'review') progress = 90;
      else if (status === 'done') progress = 100;

      const zoneUpdate: any = { status, progress };
      await (await import('../models/Zone')).Zone.findByIdAndUpdate(task.zoneId, zoneUpdate);
    }

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
      .populate('assignedTo', 'displayName avatar')
      .populate('assignedBy', 'displayName avatar');

    if (!task) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    // Synchronize Zone if task has zoneId
    if (task.zoneId) {
      let progress = 0;
      if (task.status === 'assigned') progress = 20;
      else if (task.status === 'in_progress') progress = 50;
      else if (task.status === 'review') progress = 90;
      else if (task.status === 'done') progress = 100;

      const zoneUpdate: any = {
        status: task.status,
        progress,
      };
      if (task.assignedTo) {
        const assigneeObj = task.assignedTo as any;
        zoneUpdate.assignedTo = assigneeObj._id ? assigneeObj._id : assigneeObj;
      } else {
        zoneUpdate.$unset = { assignedTo: 1 };
      }
      await (await import('../models/Zone')).Zone.findByIdAndUpdate(task.zoneId, zoneUpdate);
    }

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

    // Sync Zone status
    if (task.zoneId) {
      await (await import('../models/Zone')).Zone.findByIdAndUpdate(task.zoneId, {
        $unset: { assignedTo: 1 },
        status: 'open',
        progress: 0,
      });
    }

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
