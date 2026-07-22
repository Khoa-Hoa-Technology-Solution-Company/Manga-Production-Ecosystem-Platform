import mongoose, { Schema, Document } from 'mongoose';

export interface IWorkflowEvent extends Document {
  entityType: 'Series' | 'Chapter';
  entityId: mongoose.Types.ObjectId;
  action: string;
  fromStatus: string;
  toStatus: string;
  actorId: mongoose.Types.ObjectId;
  actorRole: string;
  reason?: string;
  createdAt: Date;
}

const workflowEventSchema = new Schema<IWorkflowEvent>(
  {
    entityType: { type: String, enum: ['Series', 'Chapter'], required: true },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    action: { type: String, required: true },
    fromStatus: { type: String, required: true },
    toStatus: { type: String, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actorRole: { type: String, required: true },
    reason: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

workflowEventSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export const WorkflowEvent = mongoose.model<IWorkflowEvent>('WorkflowEvent', workflowEventSchema);
