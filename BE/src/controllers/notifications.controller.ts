import { Request, Response } from 'express';
import { Notification } from '../models/Notification';

export async function getAll(req: Request, res: Response): Promise<void> {
  try {
    const { limit = '20', page = '1', unreadOnly } = req.query;
    const filter: any = { userId: req.user!._id };
    if (unreadOnly === 'true') filter.read = false;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [notifications, total, unread] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string)),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId: req.user!._id, read: false }),
    ]);

    res.json({ notifications, total, unread });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function markRead(req: Request, res: Response): Promise<void> {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!._id },
      { read: true },
      { new: true }
    );
    if (!notification) {
      res.status(404).json({ error: 'Notification not found.' });
      return;
    }
    res.json({ notification });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function markAllRead(req: Request, res: Response): Promise<void> {
  try {
    await Notification.updateMany(
      { userId: req.user!._id, read: false },
      { read: true }
    );
    res.json({ message: 'All notifications marked as read.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
