import mongoose, { Schema, Document } from 'mongoose';

export interface IRubricCriterion {
  key: string; // e.g. 'artStyle'
  label: string; // e.g. 'Art Style'
  weight?: number; // optional weight for future extensions
}

export interface IRubricTemplate extends Document {
  name: string;
  criteria: IRubricCriterion[];
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const rubricCriterionSchema = new Schema<IRubricCriterion>(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    weight: { type: Number, default: 1 },
  },
  { _id: false }
);

const rubricTemplateSchema = new Schema<IRubricTemplate>(
  {
    name: { type: String, required: true, trim: true },
    criteria: [rubricCriterionSchema],
    isActive: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Index to ensure quick lookup of active template
rubricTemplateSchema.index({ isActive: 1 });

export const RubricTemplate = mongoose.model<IRubricTemplate>('RubricTemplate', rubricTemplateSchema);
