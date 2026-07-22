import { Request, Response } from 'express';
import { Series } from '../models/Series';
import { User } from '../models/User';
import { createNotification } from '../services/notification.service';

/**
 * GET /api/series/:id/dedicated-assistants
 * Get all dedicated assistants for a series
 */
export async function getDedicatedAssistants(req: Request, res: Response): Promise<void> {
  try {
    const series = await Series.findById(req.params.id)
      .populate('dedicatedAssistants.userId', 'displayName avatar email skills rating');

    if (!series) {
      res.status(404).json({ error: 'Series not found.' });
      return;
    }

    // Only mangaka owner or the editor can view
    const userRole = req.user?.role;
    const isOwner = series.mangakaId.toString() === req.user?._id.toString();
    const isEditor = userRole === 'editor' && series.editorId?.toString() === req.user?._id.toString();

    if (!isOwner && !isEditor && userRole !== 'editorial_board') {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    res.json({ dedicatedAssistants: series.dedicatedAssistants || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/series/:id/dedicated-assistants
 * Add a dedicated assistant to a series (Mangaka only)
 */
export async function addDedicatedAssistant(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'userId is required.' });
      return;
    }

    const series = await Series.findById(req.params.id);
    if (!series) {
      res.status(404).json({ error: 'Series not found.' });
      return;
    }

    // Only the owning mangaka can add dedicated assistants
    if (series.mangakaId.toString() !== req.user?._id.toString()) {
      res.status(403).json({ error: 'Only the owning mangaka can manage dedicated assistants.' });
      return;
    }

    // Series must be Active to add dedicated assistants
    if (series.status !== 'Active') {
      res.status(400).json({ error: 'Series must be Active (published) before adding dedicated assistants.' });
      return;
    }

    // Verify user exists and is an assistant
    const assistant = await User.findById(userId);
    if (!assistant || assistant.role !== 'assistant') {
      res.status(400).json({ error: 'User not found or is not an assistant.' });
      return;
    }

    // Check if already added
    const alreadyAdded = series.dedicatedAssistants?.some(
      (da) => da.userId.toString() === userId
    );
    if (alreadyAdded) {
      res.status(400).json({ error: 'This assistant is already a dedicated member of this series.' });
      return;
    }

    // Add dedicated assistant
    series.dedicatedAssistants = series.dedicatedAssistants || [];
    series.dedicatedAssistants.push({ userId, addedAt: new Date() } as any);
    await series.save();

    // Notify the assistant
    try {
      const mangakaName = req.user?.displayName || 'Mangaka';
      await createNotification({
        userId,
        type: 'system',
        title: 'Dedicated Assistant Assignment',
        message: `Mangaka ${mangakaName} has added you as a dedicated assistant for series "${series.title}".`,
        relatedId: series._id.toString(),
        relatedType: 'Series',
        target: 'assistant_series',
      });
    } catch (err) {
      console.error('Failed to notify dedicated assistant:', err);
    }

    // Re-fetch with populated data
    const updated = await Series.findById(req.params.id)
      .populate('dedicatedAssistants.userId', 'displayName avatar email skills rating');

    res.json({ dedicatedAssistants: updated?.dedicatedAssistants || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * DELETE /api/series/:id/dedicated-assistants/:userId
 * Remove a dedicated assistant from a series (Mangaka only)
 */
export async function removeDedicatedAssistant(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.params.userId as string;
    const series = await Series.findById(req.params.id);

    if (!series) {
      res.status(404).json({ error: 'Series not found.' });
      return;
    }

    // Only the owning mangaka can remove
    if (series.mangakaId.toString() !== req.user?._id.toString()) {
      res.status(403).json({ error: 'Only the owning mangaka can manage dedicated assistants.' });
      return;
    }

    const before = series.dedicatedAssistants?.length || 0;
    series.dedicatedAssistants = (series.dedicatedAssistants || []).filter(
      (da) => da.userId.toString() !== userId
    );

    if (series.dedicatedAssistants.length === before) {
      res.status(404).json({ error: 'Dedicated assistant not found in this series.' });
      return;
    }

    await series.save();

    // Notify the removed assistant
    try {
      const mangakaName = req.user?.displayName || 'Mangaka';
      await createNotification({
        userId,
        type: 'system',
        title: 'Dedicated Assistant Removed',
        message: `You have been removed as a dedicated assistant from series "${series.title}" by ${mangakaName}.`,
        relatedId: series._id.toString(),
        relatedType: 'Series',
        target: 'assistant_series',
      });
    } catch (err) {
      console.error('Failed to notify removed assistant:', err);
    }

    res.json({ message: 'Dedicated assistant removed.', dedicatedAssistants: series.dedicatedAssistants });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
