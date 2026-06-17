import { Request, Response } from 'express';
import { Chapter } from '../models/Chapter';
import { Series } from '../models/Series';
import { User } from '../models/User';
import { transitionChapterStatus } from '../services/workflow.service';

function canManageCollaborators(userRole?: string) {
  return userRole === 'mangaka' || userRole === 'editor';
}

export async function getBySeriesId(req: Request, res: Response): Promise<void> {
  try {
    const series = await Series.findById(req.params.seriesId);
    if (!series) {
      res.status(404).json({ error: 'Series not found.' });
      return;
    }

    // Determine if user has privileged access to all chapters
    const isMangaka = series.mangakaId.toString() === req.user?._id.toString();
    const isEditor = series.editorId?.toString() === req.user?._id.toString() && series.editorStatus === 'accepted';
    const isEditorialBoard = req.user?.role === 'editorial_board';

    let filter: any = { seriesId: req.params.seriesId };

    if (!isMangaka && !isEditor && !isEditorialBoard) {
      // User is a reader, assistant, or other editor
      // They can only see:
      // 1. Published chapters
      // 2. Chapters where they are a collaborator
      filter = {
        seriesId: req.params.seriesId,
        $or: [
          { status: 'Published' },
          { 'collaborators.userId': req.user?._id }
        ]
      };
    }

    const chapters = await Chapter.find(filter)
      .populate('mangakaId', 'displayName avatar')
      .populate('editorId', 'displayName avatar')
      .populate('collaborators.userId', 'displayName avatar role')
      .sort({ chapterNumber: -1 });
    res.json({ chapters });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const { chapterNumber, title } = req.body;

    const lastChapter = await Chapter.findOne({ seriesId: req.params.seriesId })
      .sort({ chapterNumber: -1 });
    const expectedNumber = lastChapter ? lastChapter.chapterNumber + 1 : 1;

    if (chapterNumber !== undefined && Number(chapterNumber) !== expectedNumber) {
      res.status(400).json({ error: `Chapters must be created sequentially. Next chapter number must be ${expectedNumber}.` });
      return;
    }

    const finalChapterNumber = chapterNumber !== undefined ? Number(chapterNumber) : expectedNumber;

    const chapter = await Chapter.create({
      seriesId: req.params.seriesId,
      chapterNumber: finalChapterNumber,
      title,
      mangakaId: req.user?._id,
      collaborators: [
        {
          userId: req.user?._id,
          role: req.user?.role,
          canEdit: true,
          canComment: true,
          canInvite: true,
          acceptedAt: new Date(),
        },
      ],
    });
    res.status(201).json({ chapter });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const { chapterNumber, title, totalPages, progress, editorId } = req.body;
    const updateData: any = { title, totalPages, progress, editorId };

    if (chapterNumber !== undefined) {
      const existing = await Chapter.findById(req.params.id);
      if (existing && existing.chapterNumber !== Number(chapterNumber)) {
        res.status(400).json({ error: 'Chapter number cannot be modified once created.' });
        return;
      }
      updateData.chapterNumber = chapterNumber;
    }

    const chapter = await Chapter.findByIdAndUpdate(
      req.params.id,
      updateData,
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

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    const chapter = await Chapter.findOneAndDelete({ _id: req.params.id, mangakaId: req.user?._id });
    if (!chapter) {
      res.status(404).json({ error: 'Chapter not found or you do not own it.' });
      return;
    }
    res.json({ message: 'Chapter deleted.' });
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

export async function shareAccess(req: Request, res: Response): Promise<void> {
  try {
    if (!canManageCollaborators(req.user?.role)) {
      res.status(403).json({ error: 'Permission denied.' });
      return;
    }

    const { userId, role = 'assistant', canEdit = true, canComment = true, canInvite = false } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'userId is required.' });
      return;
    }
    const targetUser = await User.findById(userId).select('_id role displayName');
    if (!targetUser) {
      res.status(404).json({ error: 'Target user not found.' });
      return;
    }
    if (targetUser.role === 'mangaka' && req.user?.role !== 'mangaka') {
      res.status(403).json({ error: 'Only mangaka can grant access to other mangaka.' });
      return;
    }
    if (targetUser.role === 'mangaka' && role !== 'mangaka') {
      res.status(400).json({ error: 'Mangaka collaborators must be assigned the mangaka role.' });
      return;
    }
    const chapter = await Chapter.findById(req.params.id);
    if (!chapter) {
      res.status(404).json({ error: 'Chapter not found.' });
      return;
    }

    if (!Array.isArray(chapter.collaborators)) {
      chapter.collaborators = [] as any;
    }

    const existing = chapter.collaborators.find(c => c.userId.toString() === String(userId));
    if (existing) {
      existing.role = role;
      existing.canEdit = Boolean(canEdit);
      existing.canComment = Boolean(canComment);
      existing.canInvite = Boolean(canInvite);
      existing.acceptedAt = new Date();
    } else {
      chapter.collaborators.push({
        userId,
        role,
        canEdit: Boolean(canEdit),
        canComment: Boolean(canComment),
        canInvite: Boolean(canInvite),
        invitedBy: req.user?._id,
        invitedAt: new Date(),
        acceptedAt: new Date(),
      } as any);
    }

    await chapter.save();
    const updated = await Chapter.findById(chapter._id)
      .populate('collaborators.userId', 'displayName avatar role');

    res.json({ chapter: updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function removeAccess(req: Request, res: Response): Promise<void> {
  try {
    if (!canManageCollaborators(req.user?.role)) {
      res.status(403).json({ error: 'Permission denied.' });
      return;
    }

    const chapter = await Chapter.findById(req.params.id);
    if (!chapter) {
      res.status(404).json({ error: 'Chapter not found.' });
      return;
    }

    chapter.collaborators = chapter.collaborators.filter(c => c.userId.toString() !== String(req.params.userId)) as any;
    await chapter.save();

    const updated = await Chapter.findById(chapter._id)
      .populate('collaborators.userId', 'displayName avatar role');

    res.json({ chapter: updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const chapter = await Chapter.findById(req.params.id)
      .populate('mangakaId', 'displayName avatar')
      .populate('editorId', 'displayName avatar');
    if (!chapter) {
      res.status(404).json({ error: 'Chapter not found.' });
      return;
    }
    
    // Check boundaries for Editors (only if the chapter is NOT published)
    if (chapter.status !== 'Published') {
      const series = await Series.findById(chapter.seriesId);
      if (series && req.user?.role === 'editor' && (series.editorId?.toString() !== req.user._id.toString() || series.editorStatus !== 'accepted')) {
        res.status(403).json({ error: 'Access denied. You are not the accepted Tantou Editor for this series.' });
        return;
      }
    }

    res.json({ chapter });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function incrementView(req: Request, res: Response): Promise<void> {
  try {
    const chapter = await Chapter.findById(req.params.id);
    if (!chapter) {
      res.status(404).json({ error: 'Chapter not found.' });
      return;
    }

    if (chapter.status === 'Published') {
      await Chapter.findByIdAndUpdate(chapter._id, { $inc: { views: 1 } });
      await Series.findByIdAndUpdate(chapter.seriesId, { $inc: { readerCount: 1 } });
    }

    res.json({ message: 'View recorded successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}





