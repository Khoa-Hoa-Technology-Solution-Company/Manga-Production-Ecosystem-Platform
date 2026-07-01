import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { Page } from '../models/Page';
import { Task } from '../models/Task';
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
 * @param taskIds Array of task IDs (whose submitted files are layers to composite) in order (bottom to top)
 * @param saveToPage Whether to update the Page document in the DB
 */
export async function compositePageLayers(pageId: string, taskIds: string[], saveToPage = true): Promise<string> {
  const page = await Page.findById(pageId);
  if (!page) {
    throw new Error(`Page ${pageId} not found.`);
  }

  // Load the tasks to fetch the layer images
  const tasks = await Task.find({ _id: { $in: taskIds } })
    .populate('assignedTo', 'displayName');

  // Map task IDs to tasks to maintain the specified order
  const taskMap = new Map(tasks.map(t => [t._id.toString(), t]));
  const orderedTasks = taskIds
    .map(id => taskMap.get(id))
    .filter((t): t is typeof tasks[0] => !!t && !!t.submittedFile);

  console.log(`Compositing page ${pageId}: base image is ${page.originalImage}`);
  console.log(`Layers to composite: ${orderedTasks.map(t => `${t.title} (${t.submittedFile})`).join(', ')}`);

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
  for (const task of orderedTasks) {
    try {
      const layerBuffer = await getImageBuffer(task.submittedFile!);
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
      console.error(`Failed to process layer for task ${task._id}:`, err.message);
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
    
    // Update layer order fields if requested
    const newLayerOrder = taskIds.map((taskId, index) => ({
      taskId: new Object(taskId) as any,
      position: index,
    }));
    page.layerOrder = newLayerOrder;

    await page.save();
  }

  return compositeUrl;
}
