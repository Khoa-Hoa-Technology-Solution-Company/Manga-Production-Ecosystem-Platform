import { Request, Response } from 'express';
import { User } from '../models/User';
import { Task } from '../models/Task';
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

export async function searchUsers(req: Request, res: Response): Promise<void> {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) {
      res.json({ users: [] });
      return;
    }

    const users = await User.find({
      $or: [
        { email: { $regex: q, $options: 'i' } },
        { displayName: { $regex: q, $options: 'i' } },
      ],
      isActive: true,
    })
      .select('_id email displayName role avatar')
      .limit(10);

    res.json({ users });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function recommendAssistants(req: Request, res: Response): Promise<void> {
  try {
    const { skills, limit = '5' } = req.query;
    
    // Find all active assistants
    const assistants = await User.find({
      role: 'assistant',
      isActive: true,
    }).select('_id email displayName avatar skills rating totalEarnings');

    // For each assistant, get their count of active tasks
    const recommended = await Promise.all(
      assistants.map(async (assistant) => {
        const activeTasksCount = await Task.countDocuments({
          assignedTo: assistant._id,
          status: { $in: ['assigned', 'in_progress', 'review'] }
        });
        
        return {
          ...assistant.toObject(),
          activeTasksCount
        };
      })
    );

    // Score and rank assistants based on skills match, rating, and availability
    const skillList = typeof skills === 'string' 
      ? skills.split(',').map(s => s.trim().toLowerCase()) 
      : [];

    recommended.sort((a, b) => {
      // 1. Match count of skills
      const aMatch = a.skills?.filter((s: string) => skillList.includes(s.toLowerCase())).length || 0;
      const bMatch = b.skills?.filter((s: string) => skillList.includes(s.toLowerCase())).length || 0;
      
      if (aMatch !== bMatch) {
        return bMatch - aMatch; // More matches first
      }

      // 2. Rating (higher first)
      if ((b.rating || 0) !== (a.rating || 0)) {
        return (b.rating || 0) - (a.rating || 0);
      }

      // 3. Fewer active tasks first (more available)
      return (a.activeTasksCount || 0) - (b.activeTasksCount || 0);
    });

    res.json({ assistants: recommended.slice(0, parseInt(limit as string)) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
