import { Request, Response, NextFunction } from 'express';
import { Chapter } from '../models/Chapter';
import { Page } from '../models/Page';

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
      const chapterId = req.params.chapterId || req.params.id;
      if (!chapterId) {
        res.status(400).json({ error: 'chapterId is required.' });
        return;
      }

      const chapter = await Chapter.findById(chapterId).select('mangakaId collaborators');
      if (!chapter) {
        res.status(404).json({ error: 'Chapter not found.' });
        return;
      }

      const userId = req.user?._id;
      const userRole = req.user?.role || 'reader';
      const can = hasAccess(chapter, userId, userRole, mode);
      if (!can) {
        res.status(403).json({ error: 'You do not have access to this chapter.' });
        return;
      }

      req.chapterAccess = {
        chapterId: String(chapterId),
        role: userRole,
        canEdit: hasAccess(chapter, userId, userRole, 'edit'),
        canComment: hasAccess(chapter, userId, userRole, 'comment'),
        canInvite: hasAccess(chapter, userId, userRole, 'invite'),
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
