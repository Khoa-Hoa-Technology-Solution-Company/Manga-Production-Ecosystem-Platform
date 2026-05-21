import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'mangaka' | 'assistant' | 'editor' | 'editorial_board' | 'reader';

export interface IUser extends Document {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  avatar?: string;
  bio?: string;
  skills?: string[];
  rating?: number;
  totalEarnings?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    displayName: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ['mangaka', 'assistant', 'editor', 'editorial_board', 'reader'],
      required: true,
      default: 'reader',
    },
    avatar: { type: String },
    bio: { type: String, maxlength: 500 },
    skills: [{ type: String }],
    rating: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export const User = mongoose.model<IUser>('User', userSchema);
