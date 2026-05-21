import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { User } from '../models/User';
import { Series } from '../models/Series';
import { Chapter } from '../models/Chapter';
import { Task } from '../models/Task';

async function seed() {
  await connectDB();
  console.log('🌱 Seeding database...');

  // Clear existing data
  await Promise.all([
    User.deleteMany({}),
    Series.deleteMany({}),
    Chapter.deleteMany({}),
    Task.deleteMany({}),
  ]);

  // ── Users (1 per role) ────────────────────────────
  const [mangaka, assistant, editor, eb, reader] = await User.create([
    { email: 'mangaka@mangaflow.com', password: 'password123', displayName: 'Yuki Mori', role: 'mangaka', bio: 'Creator of Shadow Blade Saga' },
    { email: 'assistant@mangaflow.com', password: 'password123', displayName: 'Ren Takahashi', role: 'assistant', skills: ['inking', 'background', 'tone'] },
    { email: 'editor@mangaflow.com', password: 'password123', displayName: 'Kenji Sato', role: 'editor', bio: 'Senior Editor' },
    { email: 'eb@mangaflow.com', password: 'password123', displayName: 'Aiko Nakamura', role: 'editorial_board', bio: 'Editorial Director' },
    { email: 'reader@mangaflow.com', password: 'password123', displayName: 'Hiro Kazuo', role: 'reader' },
  ]);

  console.log('  ✅ Users created (5)');

  // ── Series ────────────────────────────────────────
  const [s1, s2, s3] = await Series.create([
    {
      title: 'Shadow Blade Saga',
      description: 'In a world where ancient swords choose their wielders, a young ronin discovers a blade that can cut through fate itself.',
      genre: ['Action', 'Fantasy'],
      coverImage: '/manga/cover-action.png',
      mangakaId: mangaka._id,
      editorId: editor._id,
      status: 'Active',
      totalChapters: 42,
      totalVotes: 1200000,
      weeklyVotes: 45200,
      readerCount: 340000,
    },
    {
      title: 'Neon Samurai',
      description: 'A cyberpunk reimagining of the samurai era in a neon-lit Tokyo of 2089.',
      genre: ['Sci-Fi', 'Action'],
      coverImage: '/manga/cover-scifi.png',
      mangakaId: mangaka._id,
      editorId: editor._id,
      status: 'Active',
      totalChapters: 105,
      totalVotes: 982000,
      weeklyVotes: 38500,
      readerCount: 280000,
    },
    {
      title: 'Lunar Whispers',
      description: 'A mystical romance between a moon spirit and a mortal scholar in feudal Japan.',
      genre: ['Romance', 'Fantasy'],
      coverImage: '/manga/cover-fantasy.png',
      mangakaId: mangaka._id,
      status: 'Draft',
      totalChapters: 19,
      totalVotes: 845000,
      weeklyVotes: 28000,
      readerCount: 420000,
    },
  ]);

  console.log('  ✅ Series created (3)');

  // ── Chapters with various statuses ────────────────
  const chapters = await Chapter.create([
    { seriesId: s1._id, chapterNumber: 40, title: 'Rising Shadows', status: 'Published', mangakaId: mangaka._id, editorId: editor._id, totalPages: 22, progress: 100, publishedAt: new Date('2026-03-05') },
    { seriesId: s1._id, chapterNumber: 41, title: 'The Dark Forge', status: 'Published', mangakaId: mangaka._id, editorId: editor._id, totalPages: 24, progress: 100, publishedAt: new Date('2026-03-12') },
    { seriesId: s1._id, chapterNumber: 42, title: 'The Blade Awakens', status: 'Approved', mangakaId: mangaka._id, editorId: editor._id, totalPages: 24, progress: 95 },
    { seriesId: s1._id, chapterNumber: 43, title: 'Storm of Souls', status: 'Reviewing', mangakaId: mangaka._id, editorId: editor._id, totalPages: 20, progress: 80 },
    { seriesId: s1._id, chapterNumber: 44, title: 'Dawn\'s Edge', status: 'Draft', mangakaId: mangaka._id, totalPages: 18, progress: 40 },
    { seriesId: s2._id, chapterNumber: 105, title: 'Neon Requiem', status: 'Reviewing', mangakaId: mangaka._id, editorId: editor._id, totalPages: 26, progress: 90 },
    { seriesId: s2._id, chapterNumber: 106, title: 'Circuit Breaker', status: 'Draft', mangakaId: mangaka._id, totalPages: 22, progress: 30 },
    { seriesId: s3._id, chapterNumber: 19, title: 'Moonlit Confession', status: 'Draft', mangakaId: mangaka._id, totalPages: 20, progress: 55 },
  ]);

  console.log('  ✅ Chapters created (8)');

  // ── Tasks ─────────────────────────────────────────
  const now = new Date();
  const dayMs = 86400000;

  await Task.create([
    { chapterId: chapters[4]._id, seriesId: s1._id, type: 'inking', title: 'Ink character outlines Ch.44', assignedTo: assistant._id, assignedBy: mangaka._id, status: 'in_progress', wage: 45000, deadline: new Date(now.getTime() + 2 * dayMs) },
    { chapterId: chapters[4]._id, seriesId: s1._id, type: 'background', title: 'Draw mountain scenery backgrounds', assignedBy: mangaka._id, status: 'open', wage: 38000, deadline: new Date(now.getTime() + 4 * dayMs) },
    { chapterId: chapters[4]._id, seriesId: s1._id, type: 'tone', title: 'Apply screentone shading', assignedBy: mangaka._id, status: 'open', wage: 28000, deadline: new Date(now.getTime() + 5 * dayMs) },
    { chapterId: chapters[6]._id, seriesId: s2._id, type: 'effects', title: 'Add neon glow effects', assignedBy: mangaka._id, status: 'open', wage: 40000, deadline: new Date(now.getTime() + 7 * dayMs) },
    { chapterId: chapters[6]._id, seriesId: s2._id, type: 'lettering', title: 'Place dialog text Ch.106', assignedTo: assistant._id, assignedBy: mangaka._id, status: 'assigned', wage: 22000, deadline: new Date(now.getTime() + 3 * dayMs) },
    { chapterId: chapters[7]._id, seriesId: s3._id, type: 'background', title: 'Paint moonlit garden scene', assignedBy: mangaka._id, status: 'open', wage: 35000, deadline: new Date(now.getTime() + 6 * dayMs) },
    { chapterId: chapters[0]._id, seriesId: s1._id, type: 'inking', title: 'Ink battle panels Ch.40', assignedTo: assistant._id, assignedBy: mangaka._id, status: 'done', wage: 52000, deadline: new Date(now.getTime() - 10 * dayMs) },
    { chapterId: chapters[1]._id, seriesId: s1._id, type: 'tone', title: 'Screentone Ch.41', assignedTo: assistant._id, assignedBy: mangaka._id, status: 'done', wage: 30000, deadline: new Date(now.getTime() - 5 * dayMs) },
  ]);

  console.log('  ✅ Tasks created (8)');

  console.log('\n🎉 Seed complete!');
  console.log('\n📋 Demo accounts:');
  console.log('   mangaka@mangaflow.com  / password123 (Mangaka)');
  console.log('   assistant@mangaflow.com / password123 (Assistant)');
  console.log('   editor@mangaflow.com   / password123 (Editor)');
  console.log('   eb@mangaflow.com       / password123 (Editorial Board)');
  console.log('   reader@mangaflow.com   / password123 (Reader)');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
