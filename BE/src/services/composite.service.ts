import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import mongoose from 'mongoose';
import { Page } from '../models/Page';
import { Task } from '../models/Task';
import { Layer } from '../models/Layer';
import { env } from '../config/env';
import { uploadToR2 } from './storage.service';

/**
 * Helper to fetch image data as a Buffer, handling local filesystem routes and remote URLs.
 */
async function getImageBuffer(imgUrl: string): Promise<Buffer> {
  if (!imgUrl) {
    throw new Error('Image URL is empty');
  }

  const uploadsPattern = /\/uploads\/(.+)/;
  const mangaPattern = /\/manga\/(.+)/;

  let match = imgUrl.match(uploadsPattern);
  if (match) {
    const filePath = path.join(process.cwd(), env.UPLOAD_DIR, match[1]);
    if (fs.existsSync(filePath)) {
      return fs.promises.readFile(filePath);
    }
  }

  match = imgUrl.match(mangaPattern);
  if (match) {
    const filePath = path.join(process.cwd(), '..', 'FE', 'public', 'manga', match[1]);
    if (fs.existsSync(filePath)) {
      return fs.promises.readFile(filePath);
    }
  }

  let fullUrl = imgUrl;
  if (imgUrl.startsWith('/')) {
    fullUrl = `http://localhost:${env.PORT}${imgUrl}`;
  }

  const response = await fetch(fullUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image from URL: ${fullUrl}. Status: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Composite selected layers on top of the base original image of a Page.
 * Layers are composited according to their z-index (order) and uploaded.
 * 
 * @param pageId ID of the Page
 * @param layerIds Array of layer/task IDs (whose files are layers to composite) in order (bottom to top)
 * @param saveToPage Whether to update the Page document in the DB
 */
export async function compositePageLayers(pageId: string, layerIds: string[], saveToPage = true): Promise<string> {
  const page = await Page.findById(pageId);
  if (!page) {
    throw new Error(`Page ${pageId} not found.`);
  }

  // Load the tasks and standalone layers
  const tasks = await Task.find({ _id: { $in: layerIds } }).populate('assignedTo', 'displayName');
  const standaloneLayers = await Layer.find({ _id: { $in: layerIds } });

  // Map them for easy lookup
  const taskMap = new Map(tasks.map(t => [t._id.toString(), t]));
  const layerMap = new Map(standaloneLayers.map(l => [l._id.toString(), l]));

  // Build the ordered list of image buffers/paths from page.layerOrder
  const orderedInputs: Array<{ file: string; type: string; id: string }> = [];

  // Match the selected layerIds against page.layerOrder to keep correct z-index
  for (const entry of page.layerOrder || []) {
    if (entry.taskId && layerIds.includes(entry.taskId.toString())) {
      const task = taskMap.get(entry.taskId.toString());
      if (task && task.submittedFile) {
        orderedInputs.push({ file: task.submittedFile, type: 'task', id: task._id.toString() });
      }
    } else if (entry.layerId && layerIds.includes(entry.layerId.toString())) {
      const layer = layerMap.get(entry.layerId.toString());
      if (layer && layer.imageUrl) {
        orderedInputs.push({ file: layer.imageUrl, type: 'standalone', id: layer._id.toString() });
      }
    }
  }

  // Append any selected layerIds that were not found in layerOrder (fallback)
  const processedIds = new Set(orderedInputs.map(item => item.id));
  for (const id of layerIds) {
    if (processedIds.has(id)) continue;
    const task = taskMap.get(id);
    if (task && task.submittedFile) {
      orderedInputs.push({ file: task.submittedFile, type: 'task', id });
    } else {
      const layer = layerMap.get(id);
      if (layer && layer.imageUrl) {
        orderedInputs.push({ file: layer.imageUrl, type: 'standalone', id });
      }
    }
  }

  console.log(`Compositing page ${pageId}: base image is ${page.originalImage}`);
  console.log(`Layers to composite: ${orderedInputs.map(item => `${item.type} (${item.file})`).join(', ')}`);

  // Fetch base image buffer
  const baseBuffer = await getImageBuffer(page.originalImage);
  const baseImage = sharp(baseBuffer);
  const metadata = await baseImage.metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  if (width === 0 || height === 0) {
    throw new Error(`Invalid dimensions for base image of page ${pageId}`);
  }

  // Load and resize each layer buffer
  const compositeInputs = [];
  for (const item of orderedInputs) {
    try {
      const layerBuffer = await getImageBuffer(item.file);
      const resizedLayer = await sharp(layerBuffer)
        .resize(width, height, { fit: 'fill' })
        .png()
        .toBuffer();

      compositeInputs.push({
        input: resizedLayer,
        top: 0,
        left: 0,
      });
    } catch (err: any) {
      console.error(`Failed to process layer ${item.id}:`, err.message);
      // Skip failed layers to let composition succeed
    }
  }

  // Perform compositing
  let compositeResult: Buffer;
  if (compositeInputs.length > 0) {
    compositeResult = await sharp(baseBuffer)
      .composite(compositeInputs)
      .png()
      .toBuffer();
  } else {
    // If no layers are selected, the composite is just the original image in PNG format
    compositeResult = await sharp(baseBuffer)
      .png()
      .toBuffer();
  }

  // Create mock Multer file for R2 upload
  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: `composite-${pageId}-${Date.now()}.png`,
    encoding: '7bit',
    mimetype: 'image/png',
    buffer: compositeResult,
    size: compositeResult.length,
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
  };

  // Upload to R2 (or fallback folder)
  const compositeUrl = await uploadToR2(mockFile, 'composites');

  if (saveToPage) {
    // Update Page in DB
    page.compositeImage = compositeUrl;
    
    // Update layerOrder: keep only the selected task layers and standalone layers, preserving their relative positions
    const newLayerOrder = [];
    let position = 0;
    
    for (const entry of page.layerOrder || []) {
      if (entry.taskId && layerIds.includes(entry.taskId.toString())) {
        newLayerOrder.push({ taskId: entry.taskId, position: position++ });
      } else if (entry.layerId && layerIds.includes(entry.layerId.toString())) {
        newLayerOrder.push({ layerId: entry.layerId, position: position++ });
      }
    }
    
    // If there were any selected layerIds not originally in layerOrder, append them
    const existingTaskIds = new Set((page.layerOrder || []).filter(e => e.taskId).map(e => e.taskId!.toString()));
    const existingLayerIds = new Set((page.layerOrder || []).filter(e => e.layerId).map(e => e.layerId!.toString()));
    
    for (const id of layerIds) {
      if (existingTaskIds.has(id) || existingLayerIds.has(id)) continue;
      
      if (taskMap.has(id)) {
        newLayerOrder.push({ taskId: new mongoose.Types.ObjectId(id) as any, position: position++ });
      } else if (layerMap.has(id)) {
        newLayerOrder.push({ layerId: new mongoose.Types.ObjectId(id) as any, position: position++ });
      }
    }

    page.layerOrder = newLayerOrder;
    await page.save();
  }

  return compositeUrl;
}
