import { Request, Response } from 'express';
import { Series } from '../models/Series';
import { Chapter } from '../models/Chapter';
import { Task } from '../models/Task';

export async function getStats(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!._id;
    const role = req.user!.role;

    let stats: any = {};

    if (role === 'mangaka') {
      const [activeSeries, totalChapters, pendingTasks, publishedChapters] = await Promise.all([
        Series.countDocuments({ mangakaId: userId, status: 'Active' }),
        Chapter.countDocuments({ mangakaId: userId }),
        Task.countDocuments({ assignedBy: userId, status: { $nin: ['done'] } }),
        Chapter.countDocuments({ mangakaId: userId, status: 'Published' }),
      ]);
      stats = { activeSeries, totalChapters, pendingTasks, publishedChapters };
    } else if (role === 'assistant') {
      const [availableTasks, inProgress, completed, earnings] = await Promise.all([
        Task.countDocuments({ status: 'open' }),
        Task.countDocuments({ assignedTo: userId, status: 'in_progress' }),
        Task.countDocuments({ assignedTo: userId, status: 'done' }),
        Task.aggregate([
          { $match: { assignedTo: userId, status: 'done' } },
          { $group: { _id: null, total: { $sum: '$wage' } } },
        ]),
      ]);
      stats = {
        availableTasks,
        inProgress,
        completed,
        totalEarnings: earnings[0]?.total || 0,
      };
    } else if (role === 'editor' || role === 'editorial_board') {
      const [reviewing, approved, published, totalSeries] = await Promise.all([
        Chapter.countDocuments({ status: 'Reviewing' }),
        Chapter.countDocuments({ status: 'Approved' }),
        Chapter.countDocuments({ status: 'Published' }),
        Series.countDocuments({}),
      ]);
      stats = { reviewing, approved, published, totalSeries };
    } else {
      // Reader
      stats = {
        totalSeries: await Series.countDocuments({ status: 'Active' }),
        publishedChapters: await Chapter.countDocuments({ status: 'Published' }),
      };
    }

    res.json({ stats });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getWorkflow(_req: Request, res: Response): Promise<void> {
  try {
    const statuses = ['Draft', 'Reviewing', 'Approved', 'Published'] as const;
    const workflow: any = {};

    for (const status of statuses) {
      workflow[status] = await Chapter.find({ status })
        .populate('seriesId', 'title')
        .populate('mangakaId', 'displayName avatar')
        .sort({ updatedAt: -1 })
        .limit(10)
        .lean();
    }

    res.json({ workflow });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getRankings(_req: Request, res: Response): Promise<void> {
  try {
    const rankings = await Series.find({ status: { $in: ['Active', 'Completed'] } })
      .populate('mangakaId', 'displayName avatar')
      .sort({ weeklyVotes: -1 })
      .limit(20)
      .lean();

    res.json({ rankings });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
