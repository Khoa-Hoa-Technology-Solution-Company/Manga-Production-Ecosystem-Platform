import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Series } from '../models/Series';
import { Chapter } from '../models/Chapter';
import { Task } from '../models/Task';
import { Vote } from '../models/Vote';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import { isUserOnline } from '../socket';

export async function getStats(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!._id;
    const role = req.user!.role;

    let stats: any = {};
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const oneDayAhead = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    if (role === 'mangaka') {
      const [activeSeries, activeSeriesDelta, totalChapters, pendingTasks, urgentTasks, publishedChapters] = await Promise.all([
        Series.countDocuments({ mangakaId: userId, status: 'Active' }),
        Series.countDocuments({ mangakaId: userId, status: 'Active', createdAt: { $gte: thirtyDaysAgo } }),
        Chapter.countDocuments({ mangakaId: userId }),
        Task.countDocuments({ assignedBy: userId, status: { $nin: ['done'] } }),
        Task.countDocuments({ assignedBy: userId, status: { $nin: ['done'] }, deadline: { $gte: now, $lte: oneDayAhead } }),
        Chapter.countDocuments({ mangakaId: userId, status: 'Published' }),
      ]);

      const mangakaSeriesIds = await Series.find({ mangakaId: userId }).distinct('_id');

      const [thisWeekVotes, lastWeekVotes] = await Promise.all([
        Vote.countDocuments({ seriesId: { $in: mangakaSeriesIds }, createdAt: { $gte: sevenDaysAgo } }),
        Vote.countDocuments({ seriesId: { $in: mangakaSeriesIds }, createdAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo } })
      ]);

      let weeklyVotesDelta = 0;
      if (lastWeekVotes > 0) {
        weeklyVotesDelta = Number((((thisWeekVotes - lastWeekVotes) / lastWeekVotes) * 100).toFixed(1));
      } else if (thisWeekVotes > 0) {
        weeklyVotesDelta = 100;
      }

      const seriesStats = await Series.aggregate([
        { $match: { mangakaId: userId } },
        { $group: { _id: null, totalWeeklyVotes: { $sum: '$weeklyVotes' } } }
      ]);
      const weeklyVotes = seriesStats[0]?.totalWeeklyVotes || thisWeekVotes || 0;

      stats = {
        activeSeries,
        activeSeriesDelta,
        pendingTasks,
        urgentTasks,
        weeklyVotes,
        weeklyVotesDelta
      };
    } else if (role === 'assistant') {
      const user = await User.findById(userId).select('totalEarnings');
      const [availableTasks, inProgress, urgentTasks, completed] = await Promise.all([
        Task.countDocuments({ status: 'open' }),
        Task.countDocuments({ assignedTo: userId, status: 'in_progress' }),
        Task.countDocuments({ assignedTo: userId, status: 'in_progress', deadline: { $gte: now, $lte: oneDayAhead } }),
        Task.countDocuments({ assignedTo: userId, status: 'done' }),
      ]);
      stats = {
        availableTasks,
        inProgress,
        urgentTasks,
        completed,
        earnings: user?.totalEarnings || 0
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
      const [subscribedSeries, publishedChapters, totalVotes] = await Promise.all([
        Series.countDocuments({ subscribers: userId }),
        Chapter.countDocuments({ status: 'Published' }),
        Vote.countDocuments({ userId }),
      ]);
      stats = { subscribedSeries, publishedChapters, totalVotes };
    }

    res.json({ stats });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getWorkflow(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 4;
    const skip = (page - 1) * limit;
    const userId = req.user!._id;
    const role = req.user!.role;

    let filter: any = {};
    if (role === 'mangaka') {
      filter.mangakaId = userId;
    } else if (role === 'assistant') {
      const [dedicatedSeriesIds, taskChapterIds] = await Promise.all([
        Series.find({ 'dedicatedAssistants.userId': userId }).distinct('_id'),
        Task.find({ assignedTo: userId }).distinct('chapterId')
      ]);
      filter = {
        $or: [
          { _id: { $in: taskChapterIds } },
          { seriesId: { $in: dedicatedSeriesIds } }
        ]
      };
    } else if (role === 'editor') {
      const seriesIds = await Series.find({ editorId: userId, editorStatus: 'accepted' }).distinct('_id');
      filter.seriesId = { $in: seriesIds };
    } else if (role === 'editorial_board') {
      // Keep empty filter to see all
    } else {
      filter._id = null; // matches nothing for readers, etc.
    }

    const statuses = ['Draft', 'Reviewing', 'Approved', 'Published'] as const;
    const workflow: any = {};

    for (const status of statuses) {
      const queryFilter = { ...filter, status };
      const [items, total] = await Promise.all([
        Chapter.find(queryFilter)
          .populate('seriesId', 'title')
          .populate('mangakaId', 'displayName avatar')
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Chapter.countDocuments(queryFilter)
      ]);

      workflow[status] = {
        items,
        count: total
      };
    }

    res.json({
      workflow,
      pagination: {
        page,
        limit
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getRankings(req: Request, res: Response): Promise<void> {
  try {
    const { sortBy } = req.query;
    const sortOption: any = sortBy === 'rating'
      ? { averageRating: -1, totalVotes: -1 }
      : { weeklyVotes: -1 };
    const userId = req.user!._id;
    const role = req.user!.role;

    let filter: any = { status: { $in: ['Active', 'Completed'] } };
    if (role === 'mangaka') {
      filter.mangakaId = userId;
    } else if (role === 'editor') {
      filter.editorId = userId;
    } else if (role === 'assistant') {
      const [dedicatedSeriesIds, taskSeriesIds] = await Promise.all([
        Series.find({ 'dedicatedAssistants.userId': userId }).distinct('_id'),
        Task.find({ assignedTo: userId }).distinct('seriesId')
      ]);
      const assistantSeriesIds = [...new Set([
        ...dedicatedSeriesIds.map(id => id.toString()),
        ...taskSeriesIds.map(id => id.toString())
      ])];
      filter._id = { $in: assistantSeriesIds };
    }

    const rankings = await Series.find(filter)
      .populate('mangakaId', 'displayName avatar')
      .sort(sortOption)
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

export async function getRecentActivity(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!._id;
    const activities = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    res.json({ activities });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getTeamOverview(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!._id;
    const role = req.user!.role;
    let memberIds: mongoose.Types.ObjectId[] = [];

    if (role === 'mangaka') {
      const mySeries = await Series.find({ mangakaId: userId });

      // Get editors assigned to series
      const editors = mySeries.map(s => s.editorId).filter(Boolean) as mongoose.Types.ObjectId[];

      // Get dedicated assistants
      const dedicatedAssistants: mongoose.Types.ObjectId[] = [];
      mySeries.forEach(s => {
        s.dedicatedAssistants.forEach(a => {
          if (a.userId) dedicatedAssistants.push(a.userId);
        });
      });

      // Get freelance assistants assigned to tasks
      const freelanceAssistants = await Task.find({ assignedBy: userId }).distinct('assignedTo');

      memberIds = [...new Set([
        ...editors.map(id => id.toString()),
        ...dedicatedAssistants.map(id => id.toString()),
        ...freelanceAssistants.map(id => id.toString())
      ])].map(id => new mongoose.Types.ObjectId(id));

    } else if (role === 'editor') {
      const mySeries = await Series.find({ editorId: userId });

      // Get mangakas
      const mangakas = mySeries.map(s => s.mangakaId).filter(Boolean);

      // Get dedicated assistants
      const dedicatedAssistants: mongoose.Types.ObjectId[] = [];
      mySeries.forEach(s => {
        s.dedicatedAssistants.forEach(a => {
          if (a.userId) dedicatedAssistants.push(a.userId);
        });
      });

      memberIds = [...new Set([
        ...mangakas.map(id => id.toString()),
        ...dedicatedAssistants.map(id => id.toString())
      ])].map(id => new mongoose.Types.ObjectId(id));
    }

    // Exclude self if present
    memberIds = memberIds.filter(id => id.toString() !== userId.toString());

    const members = await User.find({ _id: { $in: memberIds } })
      .select('displayName email role avatar skills')
      .lean();

    const team = members.map(m => ({
      ...m,
      online: isUserOnline(m._id.toString())
    }));

    res.json({ team });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getReaderDashboard(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!._id;

    const [subscribedSeries, votedChapters] = await Promise.all([
      Series.find({ subscribers: userId })
        .populate('mangakaId', 'displayName avatar')
        .lean(),
      Vote.find({ userId })
        .populate('seriesId', 'title coverImage')
        .populate('chapterId', 'chapterNumber title')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()
    ]);

    res.json({
      subscribedSeries,
      votedChapters
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
