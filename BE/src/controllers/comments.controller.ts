import { Request, Response } from 'express';
import { Comment } from '../models/Comment';
import { emitToRoom } from '../socket';

export async function getByChapter(req: Request, res: Response): Promise<void> {
  try {
    const { limit = '20', page = '1' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const parents = await Comment.find({ chapterId: req.params.id, parentId: null })
      .populate('userId', 'displayName avatar role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));

    const parentIds = parents.map(p => p._id);
    const children = await Comment.find({ parentId: { $in: parentIds } })
      .populate('userId', 'displayName avatar role')
      .sort({ createdAt: 1 });

    const comments = parents.map(p => {
      const pObj = p.toObject() as any;
      pObj.replies = children.filter(c => c.parentId?.toString() === p._id.toString());
      return pObj;
    });

    const total = await Comment.countDocuments({ chapterId: req.params.id, parentId: null });
    res.json({ comments, total });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const { text, parentId } = req.body;
    const comment = await Comment.create({
      userId: req.user!._id,
      chapterId: req.params.id,
      parentId: parentId || undefined,
      text,
    });

    const populated = await comment.populate('userId', 'displayName avatar role');
    
    // Emit to clients in the chapter room
    emitToRoom(`chapter:${req.params.id}`, 'comment:new', populated);

    res.status(201).json({ comment: populated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function like(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!._id;
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      res.status(404).json({ error: 'Comment not found.' });
      return;
    }

    const alreadyLiked = comment.likedBy.some((id) => id.toString() === userId);
    if (alreadyLiked) {
      // Unlike
      comment.likedBy = comment.likedBy.filter((id) => id.toString() !== userId);
      comment.likes = Math.max(0, comment.likes - 1);
    } else {
      // Like
      comment.likedBy.push(userId as any);
      comment.likes += 1;
    }
    await comment.save();

    res.json({ comment, liked: !alreadyLiked });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
