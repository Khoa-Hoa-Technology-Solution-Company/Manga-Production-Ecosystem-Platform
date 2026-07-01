import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { Page } from '../models/Page';
import { Chapter } from '../models/Chapter';
import { Task } from '../models/Task';
import { Layer } from '../models/Layer';
import { env } from '../config/env';

export async function getByChapterId(req: Request, res: Response): Promise<void> {
  try {
    const pages = await Page.find({ chapterId: req.params.chapterId })
      .populate('layerOrder.layerId')
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

export async function updateLayerOrder(req: Request, res: Response): Promise<void> {
  try {
    const { pageId } = req.params;
    const { layerOrder } = req.body;

    if (!Array.isArray(layerOrder)) {
      res.status(400).json({ error: 'layerOrder must be an array.' });
      return;
    }

    const page = await Page.findById(pageId);
    if (!page) {
      res.status(404).json({ error: 'Page not found.' });
      return;
    }

    page.layerOrder = layerOrder.map((item: any) => ({
      taskId: item.taskId || undefined,
      layerId: item.layerId || undefined,
      position: Number(item.position),
    }));

    await page.save();
    res.json({ message: 'Layer order updated successfully.', layerOrder: page.layerOrder });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function downloadLayer(req: Request, res: Response): Promise<void> {
  try {
    const { pageId, taskId } = req.params;
    const asPng = req.query.png === 'true' || req.query.format === 'png';

    let imageUrl = '';
    let fileName = '';

    if (taskId === 'base' || taskId === 'original') {
      const page = await Page.findById(pageId);
      if (!page) {
        res.status(404).json({ error: 'Page not found.' });
        return;
      }
      imageUrl = page.originalImage;
      fileName = `page-${page.pageNumber}-base`;
    } else {
      const task = await Task.findById(taskId);
      if (task) {
        if (!task.submittedFile) {
          res.status(400).json({ error: 'No file submitted for this task yet.' });
          return;
        }
        imageUrl = task.submittedFile;
        fileName = `page-${pageId}-layer-${task.type}`;
      } else {
        const layer = await Layer.findById(taskId);
        if (!layer) {
          res.status(404).json({ error: 'Layer or Task not found.' });
          return;
        }
        imageUrl = layer.imageUrl;
        fileName = `page-${pageId}-layer-${layer.name.replace(/\s+/g, '-')}`;
      }
    }

    // Get image buffer
    const uploadsPattern = /\/uploads\/(.+)/;
    const mangaPattern = /\/manga\/(.+)/;
    let buffer: Buffer | null = null;
    let fileExtension = 'png';

    let match = imageUrl.match(uploadsPattern);
    if (match) {
      const filePath = path.join(process.cwd(), env.UPLOAD_DIR, match[1]);
      if (fs.existsSync(filePath)) {
        buffer = await fs.promises.readFile(filePath);
        fileExtension = match[1].split('.').pop() || 'png';
      }
    }

    if (!buffer) {
      match = imageUrl.match(mangaPattern);
      if (match) {
        const filePath = path.join(process.cwd(), '..', 'FE', 'public', 'manga', match[1]);
        if (fs.existsSync(filePath)) {
          buffer = await fs.promises.readFile(filePath);
          fileExtension = match[1].split('.').pop() || 'png';
        }
      }
    }

    if (!buffer) {
      let fullUrl = imageUrl;
      if (imageUrl.startsWith('/')) {
        fullUrl = `http://localhost:${env.PORT}${imageUrl}`;
      }
      const response = await fetch(fullUrl);
      if (!response.ok) {
        res.status(500).json({ error: 'Failed to retrieve layer file from storage.' });
        return;
      }
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      fileExtension = imageUrl.split('?')[0].split('.').pop() || 'png';
    }

    if (asPng) {
      const pngBuffer = await sharp(buffer)
        .png()
        .toBuffer();

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}.png"`);
      res.send(pngBuffer);
    } else {
      let mimeType = 'image/png';
      if (fileExtension.toLowerCase() === 'jpg' || fileExtension.toLowerCase() === 'jpeg') {
        mimeType = 'image/jpeg';
      } else if (fileExtension.toLowerCase() === 'webp') {
        mimeType = 'image/webp';
      } else if (fileExtension.toLowerCase() === 'gif') {
        mimeType = 'image/gif';
      }

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}.${fileExtension}"`);
      res.send(buffer);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function addLayer(req: Request, res: Response): Promise<void> {
  try {
    const { pageId } = req.params;
    const { name } = req.body;

    if (!req.file) {
      res.status(400).json({ error: 'Layer image file is required.' });
      return;
    }

    const page = await Page.findById(pageId);
    if (!page) {
      res.status(404).json({ error: 'Page not found.' });
      return;
    }

    const fileUrl = await uploadToR2(req.file, 'layers');
    const newLayerName = name || `Layer ${page.layerOrder.length + 1}`;

    const layer = await Layer.create({
      pageId,
      name: newLayerName,
      imageUrl: fileUrl,
      createdBy: req.user?._id,
    });

    const position = page.layerOrder.length;
    page.layerOrder.push({
      layerId: layer._id as any,
      position,
    });

    await page.save();

    res.status(201).json({ layer, layerOrder: page.layerOrder });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function removeLayer(req: Request, res: Response): Promise<void> {
  try {
    const { pageId, layerId } = req.params;
    const { layerType } = req.query; // 'task' or 'standalone'

    const page = await Page.findById(pageId);
    if (!page) {
      res.status(404).json({ error: 'Page not found.' });
      return;
    }

    if (layerType === 'standalone') {
      page.layerOrder = page.layerOrder.filter(
        (item) => !item.layerId || item.layerId.toString() !== layerId
      );
      await Layer.findByIdAndDelete(layerId);
    } else {
      page.layerOrder = page.layerOrder.filter(
        (item) => !item.taskId || item.taskId.toString() !== layerId
      );
    }

    // Recalculate positions
    page.layerOrder = page.layerOrder.map((item, index) => ({
      taskId: item.taskId,
      layerId: item.layerId,
      position: index,
    }));

    await page.save();

    res.json({ message: 'Layer removed successfully.', layerOrder: page.layerOrder });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
