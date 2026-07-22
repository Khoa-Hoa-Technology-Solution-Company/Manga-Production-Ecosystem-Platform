import { Request, Response, NextFunction } from 'express';
import { Chapter } from '../models/Chapter';
import { Page } from '../models/Page';
import { Task } from '../models/Task';
import { Series } from '../models/Series';

function hasAccess(chapter: any, userId: string | undefined, userRole: string, mode: 'read' | 'edit' | 'comment' | 'invite' = 'read') {
  if (!chapter || !userId) return false;
  if (String(chapter.mangakaId?._id || chapter.mangakaId) === userId) return true;

  const collaborator = Array.isArray(chapter.collaborators)
    ? chapter.collaborators.find((c: any) => String(c.userId?._id || c.userId) === userId)
    : null;

  if (!collaborator) return false;
  if (mode === 'edit') return Boolean(collaborator.canEdit);
  if (mode === 'comment') return Boolean(collaborator.canComment || collaborator.canEdit);
  if (mode === 'invite') return Boolean(collaborator.canInvite);
  return true;
}

export function requireChapterAccess(mode: 'read' | 'edit' | 'comment' | 'invite' = 'read') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      let chapterId = req.params.chapterId || req.params.id || req.body.chapterId || req.query.chapterId;

      // If this is a task route with an ID, resolve the chapterId from the Task document
      if (req.baseUrl.includes('/tasks') && req.params.id) {
        const task = await Task.findById(req.params.id);
        if (task) {
          chapterId = String(task.chapterId);
        }
      }

      if (!chapterId) {
        res.status(400).json({ error: 'chapterId is required.' });
        return;
      }

      const chapter = await Chapter.findById(chapterId).select('seriesId mangakaId collaborators status');
      if (!chapter) {
        res.status(404).json({ error: 'Chapter not found.' });
        return;
      }
      const series = await Series.findById(chapter.seriesId).select('status editorId editorStatus');
      if (!series) {
        res.status(404).json({ error: 'Parent series not found.' });
        return;
      }

      const userId = req.user?._id;
      const userRole = req.user?.role || 'reader';
      
      let can = hasAccess(chapter, userId, userRole, mode);

      // Grant read/comment access to assistant if they are assigned to any task in this chapter
      if (!can && userId && userRole === 'assistant' && (mode === 'read' || mode === 'comment')) {
        const hasTask = await Task.exists({ chapterId, assignedTo: userId });
        if (hasTask) {
          can = true;
        }
      }

      // Grant read/comment access to anyone if the chapter is published
      if (!can && chapter.status === 'Published' && (mode === 'read' || mode === 'comment')) {
        can = true;
      }
      
      // Grant automatic access to accepted Tantou Editor or Editorial Board
      if (!can && userId) {
        const isTantouEditor = userRole === 'editor' &&
                               series.editorId?.toString() === String(userId) &&
                               series.editorStatus === 'accepted';
                                 
        const isEditorialBoard = userRole === 'editorial_board';
          
        if (isTantouEditor) {
          // Tantou Editor has full read, comment, and edit rights
          can = true;
        } else if (isEditorialBoard) {
          // Editorial Board has full access for editorial reviews and actions
          can = true;
        }
      }

      if (mode === 'edit' && chapter.status !== 'Draft' && (userRole === 'mangaka' || userRole === 'assistant')) {
        res.status(403).json({ error: 'Chapter is locked (under review or published).' });
        return;
      }
      if (mode === 'edit' && (userRole === 'mangaka' || userRole === 'assistant')) {
        const canProduceChapter = ['Draft', 'Active'].includes(series.status)
          || (series.status === 'Pending_Editor' && series.editorStatus === 'accepted');
        if (!canProduceChapter) {
          res.status(403).json({ error: 'Chapter production is locked until editor assignment is accepted, or while Editorial Board review is active.' });
          return;
        }
      }

      if (!can) {
        res.status(403).json({ error: 'You do not have access to this chapter.' });
        return;
      }

      req.chapterAccess = {
        chapterId: String(chapterId),
        role: userRole,
        canEdit: (userRole === 'editor' || userRole === 'editorial_board') 
          ? true 
          : (chapter.status !== 'Draft' && (userRole === 'mangaka' || userRole === 'assistant') ? false : hasAccess(chapter, userId, userRole, 'edit')),
        canComment: (userRole === 'editor' || userRole === 'editorial_board') ? true : hasAccess(chapter, userId, userRole, 'comment'),
        canInvite: (userRole === 'editor' || userRole === 'editorial_board') ? false : hasAccess(chapter, userId, userRole, 'invite'),
      };

      next();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}

export function requirePageAccess(mode: 'read' | 'edit' = 'read') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pageId = req.params.pageId;
      if (!pageId) {
        res.status(400).json({ error: 'pageId is required.' });
        return;
      }

      const page = await Page.findById(pageId).select('chapterId');
      if (!page) {
        res.status(404).json({ error: 'Page not found.' });
        return;
      }

      req.params.chapterId = String(page.chapterId);
      return requireChapterAccess(mode)(req, res, next);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}

export function requireZoneAccess(mode: 'read' | 'edit' = 'read') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const zoneId = req.params.id;
      if (!zoneId) {
        res.status(400).json({ error: 'zoneId is required.' });
        return;
      }

      const zone = await import('../models/Zone').then(m => m.Zone.findById(zoneId).select('pageId'));
      if (!zone) {
        res.status(404).json({ error: 'Zone not found.' });
        return;
      }

      req.params.pageId = String(zone.pageId);
      return requirePageAccess(mode)(req, res, next);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}
