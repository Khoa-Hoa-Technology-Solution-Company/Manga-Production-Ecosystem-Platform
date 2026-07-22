import { connectDB } from '../config/db';
import { SeriesRating } from '../models/SeriesRating';
import { Reaction } from '../models/Reaction';
import { ReactionEvent } from '../models/ReactionEvent';
import { Vote } from '../models/Vote';
import { recalculateSeriesRating } from '../services/series-rating.service';

async function migrate() {
  await connectDB();
  const grouped = await Vote.aggregate([
    { $match: { rating: { $exists: true, $ne: null } } },
    { $group: { _id: { userId: '$userId', seriesId: '$seriesId' }, average: { $avg: '$rating' }, firstCreatedAt: { $min: '$createdAt' } } },
  ]);

  let migrated = 0;
  for (const item of grouped) {
    const rating = Math.min(5, Math.max(1, Math.round(item.average)));
    const result = await SeriesRating.updateOne(
      { userId: item._id.userId, seriesId: item._id.seriesId },
      {
        $setOnInsert: {
          userId: item._id.userId,
          seriesId: item._id.seriesId,
          rating,
          source: 'chapter_rating_migration',
          createdAt: item.firstCreatedAt || new Date(),
          updatedAt: item.firstCreatedAt || new Date(),
        },
      },
      { upsert: true }
    );
    if (result.upsertedCount > 0) migrated += 1;
  }

  const seriesIds = [...new Set(grouped.map((item) => item._id.seriesId.toString()))];
  for (const seriesId of seriesIds) await recalculateSeriesRating(seriesId);

  const legacyReactions = await Reaction.find({ chapterId: { $exists: true } }).lean();
  let reactionEvents = 0;
  for (const reaction of legacyReactions) {
    const exists = await ReactionEvent.exists({
      userId: reaction.userId,
      seriesId: reaction.seriesId,
      chapterId: reaction.chapterId,
      action: 'set',
      createdAt: reaction.createdAt,
    });
    if (!exists) {
      await ReactionEvent.create({
        userId: reaction.userId,
        seriesId: reaction.seriesId,
        chapterId: reaction.chapterId,
        action: 'set',
        emoji: reaction.emoji,
        createdAt: reaction.createdAt,
      });
      reactionEvents += 1;
    }
  }

  console.log(`[Migration] Created ${migrated} series ratings and ${reactionEvents} reaction events from legacy data.`);
  process.exit(0);
}

migrate().catch((error) => {
  console.error('[Migration] Failed:', error);
  process.exit(1);
});
