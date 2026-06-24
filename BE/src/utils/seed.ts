import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { User } from '../models/User';
import { Series } from '../models/Series';
import { Chapter } from '../models/Chapter';
import { Page } from '../models/Page';
import { Zone } from '../models/Zone';
import { Task } from '../models/Task';
import { Vote } from '../models/Vote';
import { Comment } from '../models/Comment';
import { Notification } from '../models/Notification';

async function seed() {
  await connectDB();
  console.log('🌱 Seeding database...');

  // Clear existing data
  await Promise.all([
    User.deleteMany({}),
    Series.deleteMany({}),
    Chapter.deleteMany({}),
    Page.deleteMany({}),
    Zone.deleteMany({}),
    Task.deleteMany({}),
    Vote.deleteMany({}),
    Comment.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  // ── Users (1 per role) ────────────────────────────
  const [mangaka, assistant, editor, eb, reader] = await User.create([
    { email: 'mangaka@mangaflow.com', password: 'password123', displayName: 'Yuki Mori', role: 'mangaka', bio: 'Creator of Shadow Blade Saga' },
    { email: 'assistant@mangaflow.com', password: 'password123', displayName: 'Ren Takahashi', role: 'assistant', skills: ['inking', 'background', 'tone'] },
    { email: 'editor@mangaflow.com', password: 'password123', displayName: 'Kenji Sato', role: 'editor', bio: 'Senior Editor' },
    { email: 'eb@mangaflow.com', password: 'password123', displayName: 'Aiko Nakamura', role: 'editorial_board', bio: 'Editorial Director', isEbHead: true },
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
      editorStatus: 'accepted',
      status: 'Active',
      totalChapters: 42,
      totalVotes: 1200000,
      weeklyVotes: 45200,
      readerCount: 340000,
      averageRating: 4.8,
      ratingCount: 250,
    },
    {
      title: 'Neon Samurai',
      description: 'A cyberpunk reimagining of the samurai era in a neon-lit Tokyo of 2089.',
      genre: ['Sci-Fi', 'Action'],
      coverImage: '/manga/cover-scifi.png',
      mangakaId: mangaka._id,
      editorId: editor._id,
      editorStatus: 'accepted',
      status: 'Active',
      totalChapters: 105,
      totalVotes: 982000,
      weeklyVotes: 38500,
      readerCount: 280000,
      averageRating: 4.5,
      ratingCount: 180,
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
      averageRating: 4.2,
      ratingCount: 90,
    },
  ]);

  console.log('  ✅ Series created (3)');

  // ── Chapters with various statuses ────────────────
  const chapters = await Chapter.create([
    { seriesId: s1._id, chapterNumber: 40, title: 'Rising Shadows', status: 'Published', mangakaId: mangaka._id, editorId: editor._id, totalPages: 22, progress: 100, views: 154000, publishedAt: new Date('2026-03-05') },
    { seriesId: s1._id, chapterNumber: 41, title: 'The Dark Forge', status: 'Published', mangakaId: mangaka._id, editorId: editor._id, totalPages: 24, progress: 100, views: 186000, publishedAt: new Date('2026-03-12') },
    { seriesId: s1._id, chapterNumber: 42, title: 'The Blade Awakens', status: 'Approved', mangakaId: mangaka._id, editorId: editor._id, totalPages: 24, progress: 95, views: 0 },
    { seriesId: s1._id, chapterNumber: 43, title: 'Storm of Souls', status: 'Reviewing', mangakaId: mangaka._id, editorId: editor._id, totalPages: 20, progress: 80, views: 0 },
    { seriesId: s1._id, chapterNumber: 44, title: 'Dawn\'s Edge', status: 'Draft', mangakaId: mangaka._id, totalPages: 18, progress: 40, views: 0 },
    { seriesId: s2._id, chapterNumber: 105, title: 'Neon Requiem', status: 'Reviewing', mangakaId: mangaka._id, editorId: editor._id, totalPages: 26, progress: 90, views: 0 },
    { seriesId: s2._id, chapterNumber: 106, title: 'Circuit Breaker', status: 'Draft', mangakaId: mangaka._id, totalPages: 22, progress: 30, views: 0 },
    { seriesId: s3._id, chapterNumber: 19, title: 'Moonlit Confession', status: 'Draft', mangakaId: mangaka._id, totalPages: 20, progress: 55, views: 0 },
  ]);

  console.log('  ✅ Chapters created (8)');

  // ── Pages for Chapter 40 (Rising Shadows) ──────
  const mangaImages = [
    '/manga/page-panels.png',
    '/manga/cover-action.png',
    '/manga/cover-scifi.png',
    '/manga/cover-fantasy.png',
    '/manga/cover-horror.png',
  ];

  const ch40Pages = await Page.create(
    mangaImages.map((img, idx) => ({
      chapterId: chapters[0]._id, // Chapter 40
      pageNumber: idx + 1,
      originalImage: img,
      width: 1200,
      height: 1800,
    }))
  );

  // ── Pages for Chapter 41 (The Dark Forge) ──────
  const ch41Pages = await Page.create(
    mangaImages.map((img, idx) => ({
      chapterId: chapters[1]._id, // Chapter 41
      pageNumber: idx + 1,
      originalImage: img,
      width: 1200,
      height: 1800,
    }))
  );

  // ── Pages for Chapter 42 (The Blade Awakens) ──────
  const ch42Pages = await Page.create(
    mangaImages.map((img, idx) => ({
      chapterId: chapters[2]._id, // Chapter 42
      pageNumber: idx + 1,
      originalImage: img,
      width: 1200,
      height: 1800,
    }))
  );

  // Also add pages for Chapter 44 (Draft - being worked on)
  const ch44Pages = await Page.create(
    mangaImages.slice(0, 3).map((img, idx) => ({
      chapterId: chapters[4]._id, // Chapter 44
      pageNumber: idx + 1,
      originalImage: img,
      width: 1200,
      height: 1800,
    }))
  );

  console.log(`  ✅ Pages created (${ch40Pages.length + ch41Pages.length + ch42Pages.length + ch44Pages.length})`);

  // ── Zones for Ch42 Page 1 ─────────────────────────
  const ch42Zones = await Zone.create([
    {
      pageId: ch42Pages[0]._id,
      name: 'Background',
      type: 'background',
      color: '#3b82f6',
      boundingBox: { x: 10, y: 10, width: 480, height: 200 },
      status: 'done',
      progress: 100,
    },
    {
      pageId: ch42Pages[0]._id,
      name: 'Characters',
      type: 'characters',
      color: '#f54900',
      boundingBox: { x: 50, y: 220, width: 400, height: 300 },
      assignedTo: assistant._id,
      status: 'in_progress',
      progress: 72,
    },
    {
      pageId: ch42Pages[0]._id,
      name: 'Effects',
      type: 'effects',
      color: '#a855f7',
      boundingBox: { x: 100, y: 540, width: 300, height: 120 },
      status: 'open',
      progress: 0,
    },
    {
      pageId: ch42Pages[0]._id,
      name: 'Dialog',
      type: 'dialog',
      color: '#22c55e',
      boundingBox: { x: 20, y: 680, width: 200, height: 80 },
      status: 'done',
      progress: 100,
    },
    {
      pageId: ch42Pages[0]._id,
      name: 'SFX',
      type: 'sfx',
      color: '#eab308',
      boundingBox: { x: 350, y: 400, width: 130, height: 100 },
      status: 'open',
      progress: 0,
    },
  ]);

  // Zones for Ch44 Page 1
  await Zone.create([
    {
      pageId: ch44Pages[0]._id,
      name: 'Background',
      type: 'background',
      color: '#3b82f6',
      boundingBox: { x: 0, y: 0, width: 500, height: 250 },
      status: 'open',
      progress: 0,
    },
    {
      pageId: ch44Pages[0]._id,
      name: 'Characters',
      type: 'characters',
      color: '#f54900',
      boundingBox: { x: 60, y: 260, width: 380, height: 350 },
      status: 'open',
      progress: 0,
    },
  ]);

  console.log(`  ✅ Zones created (${ch42Zones.length + 2})`);

  // ── Tasks ─────────────────────────────────────────
  const now = new Date();
  const dayMs = 86400000;

  await Task.create([
    { chapterId: chapters[4]._id, seriesId: s1._id, pageId: ch44Pages[0]._id, type: 'inking', title: 'Ink character outlines Ch.44', assignedTo: assistant._id, assignedBy: mangaka._id, status: 'in_progress', wage: 45000, deadline: new Date(now.getTime() + 2 * dayMs) },
    { chapterId: chapters[4]._id, seriesId: s1._id, pageId: ch44Pages[1]._id, type: 'background', title: 'Draw mountain scenery backgrounds', assignedBy: mangaka._id, status: 'open', wage: 38000, deadline: new Date(now.getTime() + 4 * dayMs) },
    { chapterId: chapters[4]._id, seriesId: s1._id, type: 'tone', title: 'Apply screentone shading', assignedBy: mangaka._id, status: 'open', wage: 28000, deadline: new Date(now.getTime() + 5 * dayMs) },
    { chapterId: chapters[6]._id, seriesId: s2._id, type: 'effects', title: 'Add neon glow effects', assignedBy: mangaka._id, status: 'open', wage: 40000, deadline: new Date(now.getTime() + 7 * dayMs) },
    { chapterId: chapters[6]._id, seriesId: s2._id, type: 'lettering', title: 'Place dialog text Ch.106', assignedTo: assistant._id, assignedBy: mangaka._id, status: 'assigned', wage: 22000, deadline: new Date(now.getTime() + 3 * dayMs) },
    { chapterId: chapters[7]._id, seriesId: s3._id, type: 'background', title: 'Paint moonlit garden scene', assignedBy: mangaka._id, status: 'open', wage: 35000, deadline: new Date(now.getTime() + 6 * dayMs) },
    { chapterId: chapters[0]._id, seriesId: s1._id, type: 'inking', title: 'Ink battle panels Ch.40', assignedTo: assistant._id, assignedBy: mangaka._id, status: 'done', wage: 52000, deadline: new Date(now.getTime() - 10 * dayMs) },
    { chapterId: chapters[1]._id, seriesId: s1._id, type: 'tone', title: 'Screentone Ch.41', assignedTo: assistant._id, assignedBy: mangaka._id, status: 'done', wage: 30000, deadline: new Date(now.getTime() - 5 * dayMs) },
  ]);

  console.log('  ✅ Tasks created (8)');

  // ── Votes & Comments for Published chapters ───────
  await Vote.create([
    { userId: reader._id, chapterId: chapters[0]._id, seriesId: s1._id, rating: 5, reaction: '🔥' },
    { userId: reader._id, chapterId: chapters[1]._id, seriesId: s1._id, rating: 5, reaction: '❤️' },
    { userId: eb._id, chapterId: chapters[0]._id, seriesId: s1._id, rating: 4, reaction: '👏' },
  ]);

  await Comment.create([
    { userId: reader._id, chapterId: chapters[0]._id, text: 'Incredible battle sequence! The panel composition is masterful.', likes: 42 },
    { userId: reader._id, chapterId: chapters[1]._id, text: 'Best chapter yet! The character development is amazing.', likes: 28 },
    { userId: eb._id, chapterId: chapters[0]._id, text: 'Great work on the art quality. Keep it up!', likes: 15 },
  ]);

  console.log('  ✅ Votes & Comments created');

  // ── Notifications ─────────────────────────────────
  await Notification.create([
    { userId: assistant._id, type: 'task_assigned', title: 'New Task', message: 'You have been assigned "Ink character outlines Ch.44"', read: false },
    { userId: mangaka._id, type: 'chapter_status', title: 'Chapter Approved', message: '"The Blade Awakens" has been approved by editor', read: true },
    { userId: editor._id, type: 'chapter_status', title: 'Chapter Ready for Review', message: '"Storm of Souls" is ready for review', read: false },
  ]);

  console.log('  ✅ Notifications created');

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
