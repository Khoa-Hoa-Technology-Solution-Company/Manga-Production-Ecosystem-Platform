import { Request, Response } from 'express';
import { Task } from '../models/Task';
import { User } from '../models/User';
import { notifyTaskAssigned, notifyTaskSubmitted } from '../services/notification.service';

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
        // Show open tasks + my tasks
        filter.$or = [{ status: 'open' }, { assignedTo: req.user._id }];
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
      };
      if (task.assignedTo) {
        zoneUpdate.assignedTo = task.assignedTo;
      } else {
        zoneUpdate.$unset = { assignedTo: 1 };
      }
      await (await import('../models/Zone')).Zone.findByIdAndUpdate(task.zoneId, zoneUpdate);
    }

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
      });
    }

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
      const zoneUpdate: any = { status };
      if (status === 'done') {
        zoneUpdate.progress = 100;
      }
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
      const zoneUpdate: any = {
        status: task.status,
      };
      if (task.assignedTo) {
        const assigneeObj = task.assignedTo as any;
        zoneUpdate.assignedTo = assigneeObj._id ? assigneeObj._id : assigneeObj;
      } else {
        zoneUpdate.$unset = { assignedTo: 1 };
      }
      if (task.status === 'done') {
        zoneUpdate.progress = 100;
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

    res.json({ task: updatedTask, message: 'Task declined and set to open.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
