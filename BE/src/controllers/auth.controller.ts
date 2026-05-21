import { Request, Response } from 'express';
import { User } from '../models/User';
import { signToken } from '../utils/jwt';

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, displayName, role } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      res.status(409).json({ error: 'Email already registered.' });
      return;
    }

    const user = await User.create({ email, password, displayName, role: role || 'reader' });
    const token = signToken({ userId: user._id.toString(), role: user.role });

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'Account is deactivated.' });
      return;
    }

    const token = signToken({ userId: user._id.toString(), role: user.role });

    res.json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    res.json({ user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    const { displayName, bio, avatar, skills } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user?._id,
      { displayName, bio, avatar, skills },
      { new: true, runValidators: true }
    );
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    res.json({ user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
