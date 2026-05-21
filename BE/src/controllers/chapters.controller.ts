import { Request, Response } from 'express';
import { Chapter } from '../models/Chapter';
import { transitionChapterStatus } from '../services/workflow.service';

export async function getBySeriesId(req: Request, res: Response): Promise<void> {
  try {
    const chapters = await Chapter.find({ seriesId: req.params.seriesId })
      .populate('mangakaId', 'displayName avatar')
      .populate('editorId', 'displayName avatar')
      .sort({ chapterNumber: -1 });
    res.json({ chapters });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const { chapterNumber, title } = req.body;
    const chapter = await Chapter.create({
      seriesId: req.params.seriesId,
      chapterNumber,
      title,
      mangakaId: req.user?._id,
    });
    res.status(201).json({ chapter });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const { title, totalPages, progress, editorId } = req.body;
    const chapter = await Chapter.findByIdAndUpdate(
      req.params.id,
      { title, totalPages, progress, editorId },
      { new: true, runValidators: true }
    );
    if (!chapter) {
      res.status(404).json({ error: 'Chapter not found.' });
      return;
    }
    res.json({ chapter });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateStatus(req: Request, res: Response): Promise<void> {
  try {
    const status = String(req.body.status);
    const chapter = await transitionChapterStatus(
      String(req.params.id),
      status as any,
      req.user!._id,
      req.user!.role
    );
    res.json({ chapter, message: `Chapter status updated to "${status}".` });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}
