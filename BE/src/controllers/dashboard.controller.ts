import { Request, Response } from 'express';
import { Series } from '../models/Series';
import { Chapter } from '../models/Chapter';
import { Task } from '../models/Task';
import { Vote } from '../models/Vote';
import { User } from '../models/User';

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

    // Aggregate votes to get reader leaderboard
    const readerLeaderboard = await Vote.aggregate([
      {
        $group: {
          _id: '$userId',
          votesCount: { $sum: 1 },
          // Count unique series read (by looking at unique seriesId)
          uniqueSeries: { $addToSet: '$seriesId' }
        }
      },
      {
        $project: {
          userId: '$_id',
          votesCount: 1,
          seriesReadCount: { $size: '$uniqueSeries' }
        }
      },
      { $sort: { votesCount: -1 } },
      { $limit: 10 }
    ]);

    // Populate user details manually since aggregate populate is complex or not native
    const populatedLeaderboard = await Promise.all(
      readerLeaderboard.map(async (item) => {
        const user = await User.findById(item.userId).select('displayName avatar role').lean();
        return {
          userId: item.userId,
          username: user?.displayName || 'Reader',
          avatar: user?.avatar,
          votes: item.votesCount,
          seriesRead: item.seriesReadCount,
          role: user?.role
        };
      })
    );

    res.json({ rankings, readerLeaderboard: populatedLeaderboard });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
