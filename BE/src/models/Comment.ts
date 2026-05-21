import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
  userId: mongoose.Types.ObjectId;
  chapterId: mongoose.Types.ObjectId;
  parentId?: mongoose.Types.ObjectId;
  text: string;
  likes: number;
  likedBy: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    chapterId: { type: Schema.Types.ObjectId, ref: 'Chapter', required: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'Comment' },
    text: { type: String, required: true, maxlength: 2000 },
    likes: { type: Number, default: 0 },
    likedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

commentSchema.index({ chapterId: 1, createdAt: -1 });

export const Comment = mongoose.model<IComment>('Comment', commentSchema);
