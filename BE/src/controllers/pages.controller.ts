import { Request, Response } from 'express';
import { Page } from '../models/Page';
import { Chapter } from '../models/Chapter';

export async function getByChapterId(req: Request, res: Response): Promise<void> {
  try {
    const pages = await Page.find({ chapterId: req.params.chapterId })
      .sort({ pageNumber: 1 });
    res.json({ pages });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

import { uploadToR2 } from '../services/storage.service';

export async function upload(req: Request, res: Response): Promise<void> {
  try {
    const { chapterId } = req.params;
    const { pageNumber, width, height } = req.body;

    if (!req.file) {
      res.status(400).json({ error: 'Image file is required.' });
      return;
    }

    // Upload to Cloudflare R2
    const fileUrl = await uploadToR2(req.file, 'pages');

    const page = await Page.create({
      chapterId,
      pageNumber: parseInt(pageNumber),
      originalImage: fileUrl,
      width: parseInt(width) || 0,
      height: parseInt(height) || 0,
    });

    // Update chapter total pages count
    const totalPages = await Page.countDocuments({ chapterId });
    await Chapter.findByIdAndUpdate(chapterId, { totalPages });

    res.status(201).json({ page });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    const page = await Page.findByIdAndDelete(req.params.id);
    if (!page) {
      res.status(404).json({ error: 'Page not found.' });
      return;
    }
    // Update chapter total pages count
    const totalPages = await Page.countDocuments({ chapterId: page.chapterId });
    await Chapter.findByIdAndUpdate(page.chapterId, { totalPages });

    res.json({ message: 'Page deleted.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
