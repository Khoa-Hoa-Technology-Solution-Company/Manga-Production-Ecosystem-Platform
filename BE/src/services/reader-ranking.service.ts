import { Types } from 'mongoose';
import { ReaderActivityEvent } from '../models/ReaderActivityEvent';
import { ReadingProgress } from '../models/ReadingProgress';
import { User } from '../models/User';
import { getPeriodBounds } from './series-performance.service';

export type ReaderRankingPeriod = 'weekly' | 'monthly';

function toBangkokDateKey(value: Date) {
  return new Date(value.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export async function getReaderLeaderboard(
  period: ReaderRankingPeriod = 'weekly',
  referenceDate = new Date(),
  limit = 10
) {
  const { start, end } = getPeriodBounds(period, referenceDate);
  const startKey = toBangkokDateKey(start);
  const endKey = toBangkokDateKey(end);
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);

  // Backfill the current progress snapshot so readers who started before the
  // activity-event rollout are not invisible until their next autosave.
  const progressDocs = await ReadingProgress.find({ lastReadAt: { $gte: start, $lt: end } })
    .select('userId seriesId chapterId percentage completed lastReadAt')
    .lean();
  if (progressDocs.length > 0) {
    await ReaderActivityEvent.bulkWrite(progressDocs.map((progress) => {
      const update: any = {
        $set: {
          seriesId: progress.seriesId,
          lastReadAt: progress.lastReadAt,
        },
        $max: { maxPercentage: progress.percentage || 0 },
      };
      if (progress.completed) update.$set.completed = true;
      else update.$setOnInsert = { completed: false };
      return {
        updateOne: {
          filter: {
            userId: progress.userId,
            chapterId: progress.chapterId,
            activityDate: toBangkokDateKey(progress.lastReadAt),
          },
          update,
          upsert: true,
        },
      };
    }));
  }

  const rows = await ReaderActivityEvent.aggregate([
    { $match: { activityDate: { $gte: startKey, $lt: endKey } } },
    {
      $group: {
        _id: '$userId',
        seriesIds: { $addToSet: '$seriesId' },
        chapterIds: {
          $addToSet: {
            $cond: ['$completed', '$chapterId', null],
          },
        },
        activeDays: { $addToSet: '$activityDate' },
      },
    },
    {
      $project: {
        userId: '$_id',
        seriesRead: { $size: '$seriesIds' },
        completedChapters: {
          $size: {
            $filter: {
              input: '$chapterIds',
              as: 'chapterId',
              cond: { $ne: ['$$chapterId', null] },
            },
          },
        },
        activeDays: { $size: '$activeDays' },
      },
    },
    {
      $addFields: {
        // Completion is the primary signal; breadth and consistent reading break ties.
        score: {
          $add: [
            { $multiply: ['$completedChapters', 10] },
            { $multiply: ['$seriesRead', 5] },
            '$activeDays',
          ],
        },
      },
    },
    {
      $sort: {
        score: -1,
        completedChapters: -1,
        activeDays: -1,
        seriesRead: -1,
        userId: 1,
      },
    },
    { $limit: safeLimit },
  ]);

  const userIds = rows.map((row) => row.userId).filter((id) => Types.ObjectId.isValid(id));
  const users = await User.find({ _id: { $in: userIds } })
    .select('displayName avatar role')
    .lean();
  const usersById = new Map(users.map((user) => [user._id.toString(), user]));

  return {
    period,
    periodStart: start,
    periodEnd: end,
    rankings: rows.map((row, index) => {
      const user = usersById.get(row.userId.toString());
      return {
        rank: index + 1,
        userId: row.userId,
        username: user?.displayName || 'Reader',
        avatar: user?.avatar,
        role: user?.role,
        score: row.score || 0,
        seriesRead: row.seriesRead || 0,
        completedChapters: row.completedChapters || 0,
        activeDays: row.activeDays || 0,
      };
    }),
  };
}
