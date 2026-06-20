import { Request, Response } from 'express';
import { uploadToR2 } from '../services/storage.service';

export async function uploadFile(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded.' });
      return;
    }

    const folder = req.body.folder || 'proposals';
    const fileUrl = await uploadToR2(req.file, folder);

    res.status(201).json({
      url: fileUrl,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
