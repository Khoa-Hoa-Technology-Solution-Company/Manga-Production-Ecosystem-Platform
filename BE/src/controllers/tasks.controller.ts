import { Request, Response } from 'express';
import { Task } from '../models/Task';

export async function getAll(req: Request, res: Response): Promise<void> {
  try {
    const { status, type, assignedTo, limit = '20', page = '1' } = req.query;
    const filter: any = {};

    if (status) filter.status = status;
    if (type) filter.type = type;

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

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const task = await Task.create({
      ...req.body,
      assignedBy: req.user?._id,
    });
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

    res.json({ task, message: 'Task accepted.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateStatus(req: Request, res: Response): Promise<void> {
  try {
    const { status } = req.body;
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    if (!task) { res.status(404).json({ error: 'Task not found.' }); return; }
    res.json({ task });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
