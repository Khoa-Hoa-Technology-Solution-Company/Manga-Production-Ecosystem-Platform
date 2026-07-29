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

export function isChapterOwner(chapter: any, userId: string | undefined): boolean {
  return Boolean(chapter && userId && String(chapter.mangakaId?._id || chapter.mangakaId) === String(userId));
}

export function canAccessChapterDocument(
  chapter: any,
  series: any,
  user: { _id: string; role: string } | undefined,
  mode: 'read' | 'edit' | 'comment' | 'invite' = 'read'
): boolean {
  if (!chapter || !series || !user) return false;
  const userId = String(user._id);
  const userRole = user.role;
  if (isChapterOwner(chapter, userId)) return true;

  const collaborator = Array.isArray(chapter.collaborators)
    ? chapter.collaborators.find((c: any) => String(c.userId?._id || c.userId) === userId)
    : null;
  if (collaborator) {
    if (mode === 'edit') return Boolean(collaborator.canEdit);
    if (mode === 'comment') return Boolean(collaborator.canComment || collaborator.canEdit);
    if (mode === 'invite') return Boolean(collaborator.canInvite);
    return true;
  }

  if (userRole === 'assistant' && (mode === 'read' || mode === 'comment')) {
    return false;
  }

  if (chapter.status === 'Published' && (mode === 'read' || mode === 'comment')) return true;
  if (userRole === 'editor' && String(series.editorId?._id || series.editorId) === userId && series.editorStatus === 'accepted') return true;
  if (userRole === 'editorial_board') return true;
  return false;
}

export function requireChapterOwner() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const chapter = await Chapter.findById(req.params.id).select('mangakaId');
      if (!chapter) {
        res.status(404).json({ error: 'Chapter not found.' });
        return;
      }
      if (req.user?.role !== 'mangaka' || !isChapterOwner(chapter, req.user._id)) {
        res.status(403).json({ error: 'Only the owning mangaka can manage this chapter.' });
        return;
      }
      next();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}

export function requirePageOwner() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = await Page.findById(req.params.id).select('chapterId');
      if (!page) {
        res.status(404).json({ error: 'Page not found.' });
        return;
      }
      const chapter = await Chapter.findById(page.chapterId).select('mangakaId');
      if (!chapter) {
        res.status(404).json({ error: 'Chapter not found.' });
        return;
      }
      if (req.user?.role !== 'mangaka' || !isChapterOwner(chapter, req.user._id)) {
        res.status(403).json({ error: 'Only the owning mangaka can delete this page.' });
        return;
      }
      next();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}

export function requireCommentAccess(mode: 'read' | 'comment' = 'read') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const comment = await (await import('../models/Comment')).Comment.findById(req.params.id).select('chapterId');
      if (!comment) {
        res.status(404).json({ error: 'Comment not found.' });
        return;
      }
      req.params.chapterId = String(comment.chapterId);
      return requireChapterAccess(mode)(req, res, next);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}

export function requireAnnotationAccess(mode: 'read' | 'comment' | 'edit' = 'read') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const annotation = await (await import('../models/Annotation')).Annotation.findById(req.params.id).select('chapterId');
      if (!annotation) {
        res.status(404).json({ error: 'Annotation not found.' });
        return;
      }
      req.params.chapterId = String(annotation.chapterId);
      return requireChapterAccess(mode)(req, res, next);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
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

export type TaskAccessAction = 'view' | 'accept' | 'decline' | 'submit' | 'status' | 'manage';

/** Task-specific authorization. A chapter collaborator is not automatically allowed to claim or mutate tasks. */
export function requireTaskAccess(action: TaskAccessAction) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const task = req.params.id ? await Task.findById(req.params.id) : null;
      if (req.params.id && !task) {
        res.status(404).json({ error: 'Task not found.' });
        return;
      }

      if (!task) {
        // Creation is authorized against the chapter owner, never merely a collaborator.
        const chapterId = req.body?.chapterId || req.query.chapterId;
        if (!chapterId) {
          res.status(400).json({ error: 'chapterId is required.' });
          return;
        }
        const chapter = await Chapter.findById(chapterId).select('mangakaId');
        if (!chapter) {
          res.status(404).json({ error: 'Chapter not found.' });
          return;
        }
        if (action !== 'manage' || req.user?.role !== 'mangaka' || !isChapterOwner(chapter, req.user?._id)) {
          res.status(403).json({ error: 'Only the owning mangaka can create or manage tasks.' });
          return;
        }
        next();
        return;
      }

      const userId = String(req.user?._id || '');
      const assignedTo = task.assignedTo ? String(task.assignedTo) : '';
      const assignedBy = String(task.assignedBy);

      if (action === 'accept') {
        if (req.user?.role !== 'assistant' || task.status !== 'open' || assignedTo) {
          res.status(403).json({ error: 'Only an eligible assistant can accept an open task.' });
          return;
        }
        const { Series } = await import('../models/Series');
        const series = await Series.findById(task.seriesId).select('status dedicatedAssistants');
        const dedicated = Array.isArray(series?.dedicatedAssistants)
          && series!.dedicatedAssistants.some((a: any) => String(a.userId?._id || a.userId) === userId);
        const eligible = Boolean(series && series.status === 'Active' && (task.assistantType === 'freelance' || dedicated));
        if (!eligible) {
          res.status(403).json({ error: 'You are not eligible for this task.' });
          return;
        }
        next();
        return;
      }

      if (action === 'decline' || action === 'submit') {
        if (req.user?.role !== 'assistant' || assignedTo !== userId) {
          res.status(403).json({ error: 'Only the assigned assistant can perform this action.' });
          return;
        }
        next();
        return;
      }

      if (action === 'status') {
        const isAssignee = req.user?.role === 'assistant' && assignedTo === userId;
        const isCreator = req.user?.role === 'mangaka' && assignedBy === userId;
        if (!isAssignee && !isCreator) {
          res.status(403).json({ error: 'You are not authorized to update this task.' });
          return;
        }
        next();
        return;
      }

      if (action === 'manage') {
        const chapter = await Chapter.findById(task.chapterId).select('mangakaId');
        const owner = isChapterOwner(chapter, userId);
        if (req.user?.role !== 'mangaka' || (!owner && assignedBy !== userId)) {
          res.status(403).json({ error: 'Only the task creator or owning mangaka can manage this task.' });
          return;
        }
        next();
        return;
      }

      // View access is scoped to the task participants or users who can read the chapter.
      if (assignedTo === userId || assignedBy === userId || ['editor', 'editorial_board'].includes(req.user?.role || '')) {
        next();
        return;
      }
      req.params.chapterId = String(task.chapterId);
      return requireChapterAccess('read')(req, res, next);
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
