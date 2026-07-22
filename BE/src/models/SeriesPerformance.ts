import mongoose, { Document, Schema } from 'mongoose';

export type PerformancePeriod = 'weekly' | 'monthly';
export type PerformanceRiskLevel = 'insufficient_data' | 'healthy' | 'watch' | 'at_risk' | 'closure_review';

export interface ISeriesPerformance extends Document {
  seriesId: mongoose.Types.ObjectId;
  periodType: PerformancePeriod;
  periodStart: Date;
  periodEnd: Date;
  averageRating: number;
  weightedRating: number;
  ratingCount: number;
  newRatingCount: number;
  reactionCount: number;
  uniqueReactors: number;
  reactionBreakdown: Record<string, number>;
  publishedChapterCount: number;
  score: number;
  previousScore?: number;
  trendPercent: number;
  eligibleForRisk: boolean;
  poorPerformance: boolean;
  consecutivePoorPeriods: number;
  riskLevel: PerformanceRiskLevel;
  computedAt: Date;
}

const seriesPerformanceSchema = new Schema<ISeriesPerformance>(
  {
    seriesId: { type: Schema.Types.ObjectId, ref: 'Series', required: true },
    periodType: { type: String, enum: ['weekly', 'monthly'], required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    averageRating: { type: Number, default: 0 },
    weightedRating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    newRatingCount: { type: Number, default: 0 },
    reactionCount: { type: Number, default: 0 },
    uniqueReactors: { type: Number, default: 0 },
    reactionBreakdown: { type: Schema.Types.Mixed, default: {} },
    publishedChapterCount: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    previousScore: { type: Number },
    trendPercent: { type: Number, default: 0 },
    eligibleForRisk: { type: Boolean, default: false },
    poorPerformance: { type: Boolean, default: false },
    consecutivePoorPeriods: { type: Number, default: 0 },
    riskLevel: {
      type: String,
      enum: ['insufficient_data', 'healthy', 'watch', 'at_risk', 'closure_review'],
      default: 'insufficient_data',
    },
    computedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

seriesPerformanceSchema.index({ seriesId: 1, periodType: 1, periodStart: 1 }, { unique: true });
seriesPerformanceSchema.index({ periodType: 1, periodStart: -1, score: -1 });
seriesPerformanceSchema.index({ riskLevel: 1, periodStart: -1 });

export const SeriesPerformance = mongoose.model<ISeriesPerformance>('SeriesPerformance', seriesPerformanceSchema);
