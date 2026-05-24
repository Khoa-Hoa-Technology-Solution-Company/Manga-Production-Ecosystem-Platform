import { Request, Response } from 'express'
import { Notification } from '../models/Notification'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

function parsePositiveInt(value: unknown, fallback: number) {
  const parsed = Number.parseInt(String(value), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export async function getAll(req: Request, res: Response): Promise<void> {
  try {
    const limit = Math.min(parsePositiveInt(req.query.limit, DEFAULT_LIMIT), MAX_LIMIT)
    const page = parsePositiveInt(req.query.page, 1)
    const unreadOnly = req.query.unreadOnly === 'true'

    const filter = { userId: req.user!._id, ...(unreadOnly ? { read: false } : {}) }
    const skip = (page - 1) * limit

    const [notifications, total, unread] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId: req.user!._id, read: false }),
    ])

    res.json({ notifications, total, unread })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export async function markRead(req: Request, res: Response): Promise<void> {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!._id },
      { read: true },
      { new: true }
    )

    if (!notification) {
      res.status(404).json({ error: 'Notification not found.' })
      return
    }

    res.json({ notification })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export async function markAllRead(req: Request, res: Response): Promise<void> {
  try {
    await Notification.updateMany({ userId: req.user!._id, read: false }, { read: true })
    res.json({ message: 'All notifications marked as read.' })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}
