import { Request, Response } from 'express';
import { Zone } from '../models/Zone';

export async function getByPageId(req: Request, res: Response): Promise<void> {
  try {
    const zones = await Zone.find({ pageId: req.params.pageId })
      .populate('assignedTo', 'displayName avatar')
      .sort({ createdAt: 1 });
    res.json({ zones });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const { name, type, color, boundingBox } = req.body;
    const zone = await Zone.create({
      pageId: req.params.pageId,
      name,
      type,
      color,
      boundingBox,
    });
    res.status(201).json({ zone });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const { name, type, color, boundingBox, assignedTo, status, progress } = req.body;
    const zone = await Zone.findByIdAndUpdate(
      req.params.id,
      { name, type, color, boundingBox, assignedTo, status, progress },
      { new: true, runValidators: true }
    ).populate('assignedTo', 'displayName avatar');

    if (!zone) {
      res.status(404).json({ error: 'Zone not found.' });
      return;
    }
    res.json({ zone });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    const zone = await Zone.findByIdAndDelete(req.params.id);
    if (!zone) {
      res.status(404).json({ error: 'Zone not found.' });
      return;
    }

    // Delete associated unfinished tasks so they are removed from Assistant's workflow
    await (await import('../models/Task')).Task.deleteMany({
      zoneId: req.params.id,
      status: { $ne: 'done' },
    });

    res.json({ message: 'Zone deleted.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
