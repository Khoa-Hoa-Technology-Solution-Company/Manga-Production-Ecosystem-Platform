import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { User } from '../models/User';
import { Series } from '../models/Series';
import { Chapter } from '../models/Chapter';
import { Page } from '../models/Page';
import { Zone } from '../models/Zone';
import { Task } from '../models/Task';
import { Comment } from '../models/Comment';
import { Notification } from '../models/Notification';
import { Annotation } from '../models/Annotation';
import { EBVote } from '../models/EBVote';
import { Meeting } from '../models/Meeting';
import { Layer } from '../models/Layer';
import { Vote } from '../models/Vote';
import { Reaction } from '../models/Reaction';
import { ReactionEvent } from '../models/ReactionEvent';
import { SeriesRating } from '../models/SeriesRating';
import { SeriesRatingEvent } from '../models/SeriesRatingEvent';
import { ReadingProgress } from '../models/ReadingProgress';
import { ReaderActivityEvent } from '../models/ReaderActivityEvent';
import { SeriesPerformance } from '../models/SeriesPerformance';
import { recalculateSeriesRating } from '../services/series-rating.service';

async function seed() {
  await connectDB();
  console.log('🌱 Seeding database with rich, diverse, and complete sample data...');

  // Clear existing data across all collections
  console.log('🧹 Clearing existing collections...');
  await Promise.all([
    User.deleteMany({}),
    Series.deleteMany({}),
    Chapter.deleteMany({}),
    Page.deleteMany({}),
    Zone.deleteMany({}),
    Task.deleteMany({}),
    Reaction.deleteMany({}),
    ReactionEvent.deleteMany({}),
    Vote.deleteMany({}),
    SeriesRating.deleteMany({}),
    SeriesRatingEvent.deleteMany({}),
    ReadingProgress.deleteMany({}),
    ReaderActivityEvent.deleteMany({}),
    SeriesPerformance.deleteMany({}),
    Comment.deleteMany({}),
    Notification.deleteMany({}),
    Annotation.deleteMany({}),
    EBVote.deleteMany({}),
    Meeting.deleteMany({}),
    Layer.deleteMany({}),
  ]);

  // ── Users (Multiple accounts per role, including original demo accounts) ────────────────────────────
  console.log('👥 Seeding users (12 accounts total)...');
  const [
    mangaka, mangaka2,
    assistant, assistant2, assistant3,
    editor, editor2,
    eb, eb2, eb3,
    reader, reader2, reader3
  ] = await User.create([
    // Mangakas
    { email: 'mangaka@mangaflow.com', password: 'password123', displayName: 'Yuki Mori', role: 'mangaka', bio: 'Creator of Shadow Blade Saga & Neon Samurai. Specializes in dark fantasy and action genres.', rating: 4.9, totalEarnings: 150000 },
    { email: 'mangaka2@mangaflow.com', password: 'password123', displayName: 'Ken Akamatsu', role: 'mangaka', bio: 'Experienced mangaka, love science fiction, adventure, and high fantasy realms.', rating: 4.7, totalEarnings: 95000 },
    
    // Assistants
    { email: 'assistant@mangaflow.com', password: 'password123', displayName: 'Ren Takahashi', role: 'assistant', skills: ['inking', 'background', 'tone'], rating: 4.8, totalEarnings: 24000 },
    { email: 'assistant2@mangaflow.com', password: 'password123', displayName: 'Takeshi Obata', role: 'assistant', skills: ['inking', 'coloring'], rating: 4.9, totalEarnings: 31000 },
    { email: 'assistant3@mangaflow.com', password: 'password123', displayName: 'Yusuke Murata', role: 'assistant', skills: ['background', 'effects'], rating: 4.9, totalEarnings: 42000 },
    
    // Editors
    { email: 'editor@mangaflow.com', password: 'password123', displayName: 'Kenji Sato', role: 'editor', bio: 'Senior Editor with 10+ years in the industry. Oversees Shadow Blade Saga.' },
    { email: 'editor2@mangaflow.com', password: 'password123', displayName: 'Akira Toriyama', role: 'editor', bio: 'Passionate manga editor, loves action and high adventure stories.' },
    
    // Editorial Board
    { email: 'eb@mangaflow.com', password: 'password123', displayName: 'Aiko Nakamura', role: 'editorial_board', bio: 'Editorial Director & Head of Editorial Board', isEbHead: true },
    { email: 'eb2@mangaflow.com', password: 'password123', displayName: 'Shinji Mikami', role: 'editorial_board', bio: 'Senior Board Member, focusing on storytelling and commercial potential.' },
    { email: 'eb3@mangaflow.com', password: 'password123', displayName: 'Tetsuya Nomura', role: 'editorial_board', bio: 'Board Member, visual style and character design specialist.' },
    
    // Readers
    { email: 'reader@mangaflow.com', password: 'password123', displayName: 'Hiro Kazuo', role: 'reader', subscribedToNewSeries: true },
    { email: 'reader2@mangaflow.com', password: 'password123', displayName: 'Sakura Kinomoto', role: 'reader', subscribedToNewSeries: true },
    { email: 'reader3@mangaflow.com', password: 'password123', displayName: 'Naruto Uzumaki', role: 'reader', subscribedToNewSeries: false },
  ]);
  console.log('  ✅ Users seeded successfully.');

  // ── Series (10 Series representing every possible status) ────────────────────────────
  console.log('📚 Seeding manga series (10 series total)...');
  const [s1, s2, s3, s4, s5, s6, s7, s8, s9, s10] = await Series.create([
    {
      title: 'Shadow Blade Saga',
      description: 'In a world where ancient swords choose their wielders, a young ronin discovers a blade that can cut through fate itself.',
      genre: ['Action', 'Fantasy'],
      tags: ['action', 'fantasy'],
      coverImage: '/manga/cover-action.png',
      mangakaId: mangaka._id,
      editorId: editor._id,
      editorStatus: 'accepted',
      status: 'Active',
      totalChapters: 44,
      totalVotes: 1250000,
      weeklyVotes: 48500,
      readerCount: 380000,
      averageRating: 4.8,
      ratingCount: 310,
      publicationMode: 'immediate',
      publicationSchedule: 'weekly',
      publicationStartedAt: new Date('2026-03-01'),
      script: `Chapter 42: The Blade Awakens\n[Scene 1: The chamber of souls. Ancient runic columns glow with dark energy. Yuki, breathing heavily, clutches his bleeding side. Kuro stands before him, a smug grin on his face.]\nKuro: "You are foolish, Yuki. The Shadow Blade cannot be tamed by a weak-willed ronin."\nYuki: "It chose me... because I do not fight for power. I fight for those who cannot."\n[Scene 2: Yuki grips the hilt with both hands. The runes on the blade ignite in bright white flame. The air vibrates. Kuro\'s smile fades.]\nKuro: "Impossible! The flames of redemption... they shouldn\'t exist!"\n[Scene 3: Yuki dashes forward, leaving a trail of light. A massive shockwave shatters the dark chamber.]`,
      characterDesigns: [
        { name: 'Yuki', role: 'Protagonist', description: 'A young ronin with a scar over his left eye, wielder of the white-flamed Shadow Blade.', image: '/manga/char-drake.png' },
        { name: 'Kuro', role: 'Antagonist', description: 'A dark sorcerer with long purple hair, seeking to merge the mortal and shadow realms.', image: '/manga/char-dracula.png' },
        { name: 'Kasumi', role: 'Supporting', description: 'A swift ninja from the Shadow Clan, helping Yuki on his quest.', image: '/manga/char-leo.png' },
      ],
      dedicatedAssistants: [
        { userId: assistant._id, addedAt: new Date() },
        { userId: assistant2._id, addedAt: new Date() }
      ],
      subscribers: [reader._id, reader2._id]
    },
    {
      title: 'Neon Samurai',
      description: 'A cyberpunk reimagining of the samurai era in a neon-lit Tokyo of 2089. Steel clashing against plasma.',
      genre: ['Sci-Fi', 'Action'],
      tags: ['sci-fi', 'action'],
      coverImage: '/manga/cover-scifi.png',
      mangakaId: mangaka._id,
      editorId: editor._id,
      editorStatus: 'accepted',
      status: 'Completed',
      totalChapters: 105,
      totalVotes: 982000,
      weeklyVotes: 0,
      readerCount: 280000,
      averageRating: 4.5,
      ratingCount: 180,
      publicationMode: 'immediate',
      publicationSchedule: 'weekly',
      publicationStartedAt: new Date('2026-02-01'),
      script: `Chapter 105: Neon Requiem\n[Scene 1: Neon-lit Tokyo rooftop. Cyber-samurai Hiroshi stands under the pouring rain. His cybernetic eye blinks red.]\nHiroshi: "System override complete. There\'s no turning back."\n[Scene 2: The sky flashes. Dr. Aris arrives in a hover-car, throwing him his plasma katana.]\nAris: "Catch! Make them pay for what they did to the sector!"`,
      characterDesigns: [
        { name: 'Hiroshi', role: 'Protagonist', description: 'A cybernetic samurai with a visor, fighting against tech-corps.', image: '/manga/char-drake.png' },
        { name: 'Dr. Aris', role: 'Supporting', description: 'A rebel scientist who constructs prosthetics and high-tech weaponry.', image: '/manga/char-leo.png' },
      ]
    },
    {
      title: 'Lunar Whispers',
      description: 'A mystical romance between a moon spirit and a mortal scholar in feudal Japan.',
      genre: ['Romance', 'Fantasy'],
      tags: ['romance', 'fantasy'],
      coverImage: '/manga/cover-fantasy.png',
      mangakaId: mangaka._id,
      editorStatus: 'none',
      status: 'Draft',
      totalChapters: 1,
      totalVotes: 0,
      weeklyVotes: 0,
      readerCount: 0,
      averageRating: 0,
      ratingCount: 0,
      publicationSchedule: 'monthly',
      script: `Chapter 1: Moonlit Confession\n[Scene 1: Feudal garden. Moon spirit Kaguya descends in glowing white kimono, facing the young mortal scholar, Kenji.]\nKaguya: "I must return to the moon when the eclipse is complete. We cannot be together."\nKenji: "Then I will study the skies, and find a way to write my words upon the moon itself!"`,
      characterDesigns: [
        { name: 'Kaguya', role: 'Protagonist', description: 'A beautiful moon spirit dressed in white kimono, seeking mortal truth.', image: '/manga/char-leo.png' },
        { name: 'Kenji', role: 'Protagonist', description: 'A mortal scholar who spends night studying astronomy and forbidden arts.', image: '/manga/char-drake.png' }
      ]
    },
    {
      title: 'Dragon Hunter',
      description: 'Drake trails the legendary Ignis dragon through the Burning Peaks to avenge his lost village.',
      genre: ['Action', 'Fantasy'],
      tags: ['action', 'fantasy'],
      coverImage: '/manga/cover-horror.png',
      mangakaId: mangaka2._id,
      editorId: editor2._id,
      editorStatus: 'pending',
      status: 'Pending_Editor',
      totalChapters: 1,
      totalVotes: 0,
      weeklyVotes: 0,
      readerCount: 0,
      averageRating: 0,
      ratingCount: 0,
      publicationSchedule: 'weekly',
      script: `Chapter 1: Burning Trails\n[Scene 1: Drake stands on the edge of the ash canyon, shield strapped to his arm. Giant dragon footprints stretch before him.]\nDrake: "I have tracked you for three years, Ignis. Today, the hunt ends."`,
      characterDesigns: [
        { name: 'Drake', role: 'Protagonist', description: 'A veteran dragon slayer with a giant iron shield and a broadsword.', image: '/manga/char-drake.png' },
        { name: 'Ignis', role: 'Antagonist', description: 'A massive fire-breathing red dragon with obsidian claws and wings of flame.', image: '/manga/char-ignis.png' }
      ]
    },
    {
      title: 'Gothic Chronicles',
      description: 'A gothic horror tale about a vampire hunter uncovering a secret society in Victorian London.',
      genre: ['Mystery', 'Horror'],
      tags: ['mystery', 'horror'],
      coverImage: '/manga/cover-horror.png',
      mangakaId: mangaka2._id,
      editorId: editor2._id,
      editorStatus: 'accepted',
      status: 'Pending_EB',
      totalChapters: 1,
      totalVotes: 0,
      weeklyVotes: 0,
      readerCount: 0,
      averageRating: 0,
      ratingCount: 0,
      publicationSchedule: 'weekly',
      script: `Chapter 1: The Blood Guild\n[Scene 1: Rain-slicked cobblestone street. Dracula stands in a long velvet coat, holding a golden pocket watch.]\nDracula: "The night is young, and the feast has just begun."`,
      characterDesigns: [
        { name: 'Dracula', role: 'Antagonist', description: 'An ancient vampire lord of London underworld.', image: '/manga/char-dracula.png' }
      ]
    },
    {
      title: 'Space Academy',
      description: 'An eager recruit trying to fit into the stellar defense academy in a futuristic galactic capital.',
      genre: ['Sci-Fi', 'Comedy'],
      tags: ['sci-fi', 'comedy'],
      coverImage: '/manga/cover-scifi.png',
      mangakaId: mangaka._id,
      editorId: editor2._id,
      editorStatus: 'rejected',
      status: 'Rejected',
      rejectionNotes: 'The premise is too similar to existing space sci-fi manga. The pacing of the introduction is extremely rushed, and the characters lack distinct personality traits. Please revise the story structure and re-submit.',
      totalChapters: 0,
      totalVotes: 0,
      weeklyVotes: 0,
      readerCount: 0,
      averageRating: 0,
      ratingCount: 0,
      script: `Chapter 1: Launch Day\n[Scene 1: Leo runs down the corridor, toast in his mouth.]\nLeo: "Oh no! I am going to be late for the stellar simulation exam!"`,
      characterDesigns: [
        { name: 'Leo', role: 'Protagonist', description: 'An eager recruit trying to fit into the stellar defense academy.', image: '/manga/char-leo.png' }
      ]
    },
    {
      title: 'Time Travel Paradox',
      description: 'A brilliant scientist goes back in time and accidentally prevents his own birth, leading to cosmic anomalies.',
      genre: ['Sci-Fi', 'Mystery'],
      tags: ['sci-fi', 'mystery'],
      coverImage: '/manga/cover-action.png',
      mangakaId: mangaka2._id,
      editorId: editor._id,
      editorStatus: 'accepted',
      status: 'Hiatus',
      totalChapters: 12,
      totalVotes: 120000,
      weeklyVotes: 1200,
      readerCount: 35000,
      averageRating: 4.4,
      ratingCount: 50,
      publicationSchedule: 'weekly',
      script: 'Chapter 1: The Quantum Machine...'
    },
    {
      title: 'Lost Kingdom',
      description: 'An adventure story of finding a lost continent beneath the ocean with steam-powered submarines.',
      genre: ['Adventure', 'Sci-Fi'],
      tags: ['adventure', 'sci-fi'],
      coverImage: '/manga/cover-fantasy.png',
      mangakaId: mangaka._id,
      editorId: editor._id,
      editorStatus: 'accepted',
      status: 'Cancelled',
      cancellationRisk: true,
      totalChapters: 5,
      totalVotes: 52000,
      weeklyVotes: 0,
      readerCount: 12000,
      averageRating: 3.9,
      ratingCount: 22,
      script: 'Chapter 1: Ocean Depths...'
    },
    {
      title: 'Cybernetic Ninja',
      description: 'In a futuristic cyberpunk metropolis, a lone cybernetic ninja uncovers a massive corporate conspiracy.',
      genre: ['Sci-Fi', 'Action'],
      tags: ['sci-fi', 'action'],
      coverImage: '/manga/cover-ninja.png',
      mangakaId: mangaka._id,
      editorId: editor._id,
      editorStatus: 'accepted',
      status: 'Active',
      totalChapters: 1,
      totalVotes: 5000,
      weeklyVotes: 500,
      readerCount: 1500,
      averageRating: 4.8,
      ratingCount: 15,
      publicationMode: 'immediate',
      publicationSchedule: 'weekly',
      publicationStartedAt: new Date('2026-04-01'),
      script: 'Chapter 1: Silent Protocol',
      characterDesigns: [
        { name: 'Ryu', role: 'Protagonist', description: 'A cybernetic ninja with high-frequency blades.', image: '/manga/char-drake.png' }
      ]
    },
    {
      title: 'Under the Cherry Blossom',
      description: 'A touching slice-of-life romance about two high school students meeting under the falling cherry blossoms.',
      genre: ['Romance', 'Drama'],
      tags: ['romance', 'drama'],
      coverImage: '/manga/cover-cherry.png',
      mangakaId: mangaka2._id,
      editorId: editor2._id,
      editorStatus: 'accepted',
      status: 'Active',
      totalChapters: 1,
      totalVotes: 2000,
      weeklyVotes: 200,
      readerCount: 800,
      averageRating: 4.6,
      ratingCount: 8,
      publicationMode: 'scheduled',
      publicationSchedule: 'monthly',
      publicationStartAt: new Date(Date.now() + 3 * 86400000),
      nextPublicationAt: new Date(Date.now() + 3 * 86400000),
      script: 'Chapter 1: First Petal',
      characterDesigns: [
        { name: 'Sakura', role: 'Protagonist', description: 'A cheerful schoolgirl who loves photography.', image: '/manga/char-leo.png' }
      ]
    }
  ]);
  console.log('  ✅ Series seeded successfully.');

  // ── Chapters (Representing all lifecycle states) ────────────────────────────
  console.log('📑 Seeding chapters (Draft, Reviewing, Approved, Published)...');
  const chapters = await Chapter.create([
    // s1 (Shadow Blade Saga - Active)
    { seriesId: s1._id, chapterNumber: 40, title: 'Rising Shadows', status: 'Published', mangakaId: mangaka._id, editorId: editor._id, totalPages: 5, progress: 100, views: 154000, publishedAt: new Date('2026-03-05') },
    { seriesId: s1._id, chapterNumber: 41, title: 'The Dark Forge', status: 'Published', mangakaId: mangaka._id, editorId: editor._id, totalPages: 5, progress: 100, views: 186000, publishedAt: new Date('2026-03-12') },
    { seriesId: s1._id, chapterNumber: 42, title: 'The Blade Awakens', status: 'Approved', mangakaId: mangaka._id, editorId: editor._id, totalPages: 5, progress: 100, views: 0 },
    { seriesId: s1._id, chapterNumber: 43, title: 'Storm of Souls', status: 'Reviewing', mangakaId: mangaka._id, editorId: editor._id, totalPages: 4, progress: 80, views: 0 },
    { seriesId: s1._id, chapterNumber: 44, title: 'Dawn\'s Edge', status: 'Draft', mangakaId: mangaka._id, totalPages: 3, progress: 40, views: 0 },
    
    // s2 (Neon Samurai - Completed)
    { seriesId: s2._id, chapterNumber: 105, title: 'Neon Requiem', status: 'Published', mangakaId: mangaka._id, editorId: editor._id, totalPages: 5, progress: 100, views: 245000, publishedAt: new Date('2026-02-15') },
    
    // s3 (Lunar Whispers - Draft)
    { seriesId: s3._id, chapterNumber: 1, title: 'Moonlit Confession', status: 'Draft', mangakaId: mangaka._id, totalPages: 2, progress: 10, views: 0 },
    
    // s4 (Dragon Hunter - Pending_Editor)
    { seriesId: s4._id, chapterNumber: 1, title: 'Burning Trails', status: 'Reviewing', mangakaId: mangaka2._id, editorId: editor2._id, totalPages: 4, progress: 90, views: 0 },
    
    // s5 (Gothic Chronicles - Pending_EB)
    { seriesId: s5._id, chapterNumber: 1, title: 'The Blood Guild', status: 'Approved', mangakaId: mangaka2._id, editorId: editor2._id, totalPages: 5, progress: 100, views: 0 },

    // s6 (Space Academy - Rejected)
    { seriesId: s6._id, chapterNumber: 1, title: 'Launch Day', status: 'Draft', mangakaId: mangaka._id, totalPages: 3, progress: 100, views: 0 },

    // s7 (Time Travel Paradox - Hiatus)
    { seriesId: s7._id, chapterNumber: 1, title: 'The Quantum Machine', status: 'Published', mangakaId: mangaka2._id, editorId: editor._id, totalPages: 4, progress: 100, views: 12000, publishedAt: new Date('2026-01-10') },

    // s8 (Lost Kingdom - Cancelled)
    { seriesId: s8._id, chapterNumber: 1, title: 'Ocean Depths', status: 'Published', mangakaId: mangaka._id, editorId: editor._id, totalPages: 5, progress: 100, views: 24000, publishedAt: new Date('2026-02-20') },

    // s9 (Cybernetic Ninja)
    { seriesId: s9._id, chapterNumber: 1, title: 'Silent Protocol', status: 'Published', mangakaId: mangaka._id, editorId: editor._id, totalPages: 3, progress: 100, views: 0, publishedAt: new Date('2026-04-01') },

    // s10 (Under the Cherry Blossom)
    { seriesId: s10._id, chapterNumber: 1, title: 'First Petal', status: 'Published', mangakaId: mangaka2._id, editorId: editor2._id, totalPages: 3, progress: 100, views: 0, publishedAt: new Date('2026-04-02') }
  ]);
  console.log('  ✅ Chapters seeded successfully.');

  // ── Pages (Seeding canvas background images) ────────────────────────────
  console.log('🖼️ Seeding pages...');
  const mangaImages = [
    '/manga/page-panels.png',
    '/manga/cover-action.png',
    '/manga/cover-scifi.png',
    '/manga/cover-fantasy.png',
    '/manga/cover-horror.png',
  ];

  // ── Pages & Layers Seeding (Unified Loop for all chapters) ────────────────────────────
  console.log('🖼️ Seeding pages and layers for all chapters...');
  
  const createdPages: any[] = [];
  const layersToCreate: any[] = [];

  const ch42Pages: any[] = [];
  const ch43Pages: any[] = [];
  const ch44Pages: any[] = [];

  for (let cIdx = 0; cIdx < chapters.length; cIdx++) {
    const chapter = chapters[cIdx];
    const pageCount = chapter.totalPages || 3;
    
    const creatorUserIds = [
      chapter.mangakaId,
      assistant._id,
      assistant2._id,
      assistant3._id
    ];

    for (let pIdx = 0; pIdx < pageCount; pIdx++) {
      const pageNum = pIdx + 1;
      const img = mangaImages[pIdx % mangaImages.length];
      
      const page = await Page.create({
        chapterId: chapter._id,
        pageNumber: pageNum,
        originalImage: img,
        width: 1200,
        height: 1800,
      });
      
      createdPages.push(page);

      // Categorize for subsequent Zone, Task, and Annotation seeding
      if (cIdx === 2) ch42Pages.push(page);
      if (cIdx === 3) ch43Pages.push(page);
      if (cIdx === 4) ch44Pages.push(page);

      // Seed layers for each page
      if (chapter.seriesId.toString() === s9._id.toString() && pageNum === 1) {
        // Special matching aligned layers for Cybernetic Ninja Ch.1 Page 1
        layersToCreate.push({
          pageId: page._id,
          name: 'Pencil Sketch Layout',
          imageUrl: '/manga/scene-sketch.png',
          createdBy: creatorUserIds[1 % creatorUserIds.length],
        });

        layersToCreate.push({
          pageId: page._id,
          name: 'Final Ink Lineart',
          imageUrl: '/manga/scene-lineart.png',
          createdBy: creatorUserIds[2 % creatorUserIds.length],
        });

        layersToCreate.push({
          pageId: page._id,
          name: 'Color Rendering',
          imageUrl: '/manga/scene-colored.png',
          createdBy: creatorUserIds[3 % creatorUserIds.length],
        });
      } else {
        // Default layers
        layersToCreate.push({
          pageId: page._id,
          name: `Page ${pageNum} - Character Ink Outlines`,
          imageUrl: '/manga/layer-ink-ch44.png',
          createdBy: creatorUserIds[1 % creatorUserIds.length],
        });

        layersToCreate.push({
          pageId: page._id,
          name: `Page ${pageNum} - Background Scenery`,
          imageUrl: pIdx % 2 === 0 ? '/manga/layer-bg-ch44.png' : '/manga/draft-bg-ch43.png',
          createdBy: creatorUserIds[3 % creatorUserIds.length],
        });
      }
    }
  }

  // Bulk insert layers
  const seededLayers = await Layer.create(layersToCreate);

  // Group layers by pageId and update page.layerOrder
  console.log('🔄 Linking layers to pages in layerOrder...');
  const pageLayersMap: Record<string, any[]> = {};
  for (const layer of seededLayers) {
    const pId = layer.pageId.toString();
    if (!pageLayersMap[pId]) {
      pageLayersMap[pId] = [];
    }
    pageLayersMap[pId].push(layer);
  }

  for (const page of createdPages) {
    const layers = pageLayersMap[page._id.toString()] || [];
    page.layerOrder = layers.map((layer, idx) => ({
      layerId: layer._id,
      position: idx,
    }));
    await page.save();
  }

  console.log(`  ✅ Pages seeded (${createdPages.length} pages total).`);
  console.log(`  ✅ Layers seeded and linked (${seededLayers.length} layers total).`);

  // ── Zones (Canvas boundaries for collaboration) ────────────────────────────
  console.log('🎯 Seeding zones on pages...');
  // Ch 42 (Approved - all completed)
  await Zone.create([
    {
      pageId: ch42Pages[0]._id,
      name: 'Background Panel 1',
      type: 'background',
      color: '#3b82f6',
      boundingBox: { x: 10, y: 10, width: 480, height: 200 },
      status: 'done',
      progress: 100,
    },
    {
      pageId: ch42Pages[0]._id,
      name: 'Yuki Character Outlines',
      type: 'characters',
      color: '#f54900',
      boundingBox: { x: 50, y: 220, width: 400, height: 300 },
      assignedTo: assistant._id,
      status: 'done',
      progress: 100,
    },
    {
      pageId: ch42Pages[0]._id,
      name: 'White Flames Effect',
      type: 'effects',
      color: '#a855f7',
      boundingBox: { x: 100, y: 540, width: 300, height: 120 },
      assignedTo: assistant2._id,
      status: 'done',
      progress: 100,
    },
  ]);

  // Ch 43 (Reviewing - in progress / review)
  await Zone.create([
    {
      pageId: ch43Pages[0]._id,
      name: 'Background Forest',
      type: 'background',
      color: '#3b82f6',
      boundingBox: { x: 10, y: 10, width: 480, height: 250 },
      assignedTo: assistant3._id,
      status: 'in_progress',
      progress: 80,
    },
    {
      pageId: ch43Pages[0]._id,
      name: 'Yuki Battle Stance',
      type: 'characters',
      color: '#f54900',
      boundingBox: { x: 50, y: 280, width: 400, height: 320 },
      assignedTo: assistant2._id,
      status: 'done',
      progress: 100,
    },
  ]);

  // Ch 44 (Draft - open / in progress)
  await Zone.create([
    {
      pageId: ch44Pages[0]._id,
      name: 'Background City Skyline',
      type: 'background',
      color: '#3b82f6',
      boundingBox: { x: 0, y: 0, width: 500, height: 250 },
      status: 'open',
      progress: 0,
    },
    {
      pageId: ch44Pages[0]._id,
      name: 'Kasumi Sketch outlines',
      type: 'characters',
      color: '#f54900',
      boundingBox: { x: 60, y: 260, width: 380, height: 350 },
      assignedTo: assistant._id,
      status: 'in_progress',
      progress: 30,
    },
  ]);
  console.log('  ✅ Zones seeded successfully.');

  // ── Annotations (Editor annotations for manuscript corrections) ────────────────────────────
  console.log('✍️ Seeding annotations...');
  await Annotation.create([
    {
      chapterId: chapters[3]._id, // Ch 43 (Reviewing)
      pageId: ch43Pages[0]._id,
      authorId: editor._id,
      x: 15,
      y: 20,
      note: 'The runic lines on the columns in Panel 1 are a bit blurry. Please refine the outlines to make them look sharper.',
      source: 'review',
      status: 'open'
    },
    {
      chapterId: chapters[3]._id, // Ch 43 (Reviewing)
      pageId: ch43Pages[0]._id,
      authorId: editor._id,
      x: 65,
      y: 40,
      note: 'Yuki\'s left shoulder seems dislocated. Make the arm joint look more natural.',
      source: 'review',
      status: 'open'
    },
    {
      chapterId: chapters[3]._id, // Ch 43 (Reviewing)
      pageId: ch43Pages[0]._id,
      authorId: editor._id,
      x: 80,
      y: 80,
      note: 'The speech bubble font is perfect. Good job!',
      source: 'review',
      status: 'resolved'
    }
  ]);
  console.log('  ✅ Annotations seeded successfully.');

  // ── Tasks (Collaboration workflow items) ────────────────────────────
  console.log('🔧 Seeding tasks...');
  const now = new Date();
  const dayMs = 86400000;

  await Task.create([
    // Tasks for Chapter 44 (Draft)
    {
      chapterId: chapters[4]._id,
      seriesId: s1._id,
      pageId: ch44Pages[0]._id,
      assignmentLevel: 'page',
      type: 'inking',
      title: 'Ink character outlines Ch.44 Page 1',
      description: 'Draw final clean lines for Yuki and Kasumi in panels 1 to 3.',
      assignedTo: assistant._id,
      assignedBy: mangaka._id,
      status: 'in_progress',
      assistantType: 'dedicated',
      wage: 45000,
      deadline: new Date(now.getTime() + 2 * dayMs)
    },
    {
      chapterId: chapters[4]._id,
      seriesId: s1._id,
      pageId: ch44Pages[0]._id,
      assignmentLevel: 'page',
      type: 'background',
      title: 'Draw scenery backgrounds Ch.44 Page 1',
      description: 'Add Victorian city architectures and foggy textures.',
      assignedBy: mangaka._id,
      status: 'open',
      assistantType: 'freelance',
      wage: 38000,
      deadline: new Date(now.getTime() + 4 * dayMs)
    },
    {
      chapterId: chapters[4]._id,
      seriesId: s1._id,
      assignmentLevel: 'chapter',
      type: 'tone',
      title: 'Screentone shading Ch.44 entire chapter',
      description: 'Apply screen tones and shadows to ensure gothic atmospheric dark lighting.',
      assignedTo: assistant2._id,
      assignedBy: mangaka._id,
      status: 'assigned',
      assistantType: 'freelance',
      wage: 50000,
      deadline: new Date(now.getTime() + 5 * dayMs)
    },
    // Tasks for Chapter 43 (Reviewing)
    {
      chapterId: chapters[3]._id,
      seriesId: s1._id,
      pageId: ch43Pages[0]._id,
      assignmentLevel: 'page',
      type: 'background',
      title: 'Refining runic columns backgrounds Ch.43',
      description: 'Address editor feedback: sharpen runic lines on the columns in Panel 1.',
      assignedTo: assistant3._id,
      assignedBy: mangaka._id,
      status: 'in_progress',
      assistantType: 'freelance',
      wage: 25000,
      deadline: new Date(now.getTime() + 1 * dayMs)
    },
    // Completed Tasks
    {
      chapterId: chapters[0]._id,
      seriesId: s1._id,
      assignmentLevel: 'chapter',
      type: 'inking',
      title: 'Ink battle panels Ch.40',
      assignedTo: assistant._id,
      assignedBy: mangaka._id,
      status: 'done',
      assistantType: 'dedicated',
      wage: 52000,
      deadline: new Date(now.getTime() - 10 * dayMs),
      submittedFile: '/uploads/sub-ch40-inking.zip'
    },
    {
      chapterId: chapters[1]._id,
      seriesId: s1._id,
      assignmentLevel: 'chapter',
      type: 'tone',
      title: 'Screentone Ch.41',
      assignedTo: assistant2._id,
      assignedBy: mangaka._id,
      status: 'done',
      assistantType: 'dedicated',
      wage: 30000,
      deadline: new Date(now.getTime() - 5 * dayMs),
      submittedFile: '/uploads/sub-ch41-tone.zip'
    }
  ]);
  console.log('  ✅ Tasks seeded successfully.');

  // ── Votes & Comments (Reader engagement) ────────────────────────────
  console.log('❤️ Seeding reader votes & comments...');
  if (process.env.SEED_LEGACY_VOTES === 'true') await Vote.create([
    { userId: reader._id, chapterId: chapters[0]._id, seriesId: s1._id, rating: 5, reaction: '🔥' },
    { userId: reader2._id, chapterId: chapters[0]._id, seriesId: s1._id, rating: 5, reaction: '🔥' },
    { userId: reader3._id, chapterId: chapters[0]._id, seriesId: s1._id, rating: 4, reaction: '❤️' },
    { userId: reader._id, chapterId: chapters[1]._id, seriesId: s1._id, rating: 5, reaction: '❤️' },
    { userId: reader2._id, chapterId: chapters[1]._id, seriesId: s1._id, rating: 5, reaction: '👏' },
    { userId: reader3._id, chapterId: chapters[1]._id, seriesId: s1._id, rating: 3, reaction: '😮' },
    
    { userId: reader._id, chapterId: chapters[5]._id, seriesId: s2._id, rating: 5, reaction: '🔥' },
    { userId: reader2._id, chapterId: chapters[5]._id, seriesId: s2._id, rating: 4, reaction: '👏' }
  ]);

  const seededRatings = [
    { userId: reader._id, seriesId: s1._id, rating: 5 },
    { userId: reader2._id, seriesId: s1._id, rating: 5 },
    { userId: reader3._id, seriesId: s1._id, rating: 4 },
    { userId: reader._id, seriesId: s2._id, rating: 5 },
    { userId: reader2._id, seriesId: s2._id, rating: 4 },
    { userId: reader3._id, seriesId: s2._id, rating: 4 },
    { userId: reader._id, seriesId: s9._id, rating: 5 },
    { userId: reader2._id, seriesId: s9._id, rating: 4 },
  ];
  await SeriesRating.create(seededRatings.map((item) => ({ ...item, source: 'reader' as const })));
  await SeriesRatingEvent.create(seededRatings.map((item) => ({ ...item, action: 'created' as const })));
  await Promise.all([s1, s2, s9, s10].map((series) => recalculateSeriesRating(series._id)));

  const seededReactions = [
    { userId: reader._id, seriesId: s1._id, chapterId: chapters[0]._id, emoji: '🔥' },
    { userId: reader2._id, seriesId: s1._id, chapterId: chapters[0]._id, emoji: '🔥' },
    { userId: reader3._id, seriesId: s1._id, chapterId: chapters[0]._id, emoji: '❤️' },
    { userId: reader._id, seriesId: s1._id, chapterId: chapters[1]._id, emoji: '❤️' },
    { userId: reader2._id, seriesId: s1._id, chapterId: chapters[1]._id, emoji: '👏' },
    { userId: reader3._id, seriesId: s1._id, chapterId: chapters[1]._id, emoji: '😮' },
    { userId: reader._id, seriesId: s2._id, chapterId: chapters[5]._id, emoji: '🔥' },
    { userId: reader2._id, seriesId: s2._id, chapterId: chapters[5]._id, emoji: '👏' },
  ];
  await Reaction.create(seededReactions);
  await ReactionEvent.create(seededReactions.map((item) => ({ ...item, action: 'set' as const })));

  const activityNow = new Date();
  const toBangkokDateKey = (date: Date) => new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const seededProgress = [
    { userId: reader._id, seriesId: s1._id, chapterId: chapters[0]._id, chapterIndex: 0, pageIndex: 4, percentage: 100, completed: true, lastReadAt: new Date(activityNow.getTime() - 1 * 86400000) },
    { userId: reader2._id, seriesId: s1._id, chapterId: chapters[1]._id, chapterIndex: 1, pageIndex: 4, percentage: 100, completed: true, lastReadAt: new Date(activityNow.getTime() - 2 * 86400000) },
    { userId: reader3._id, seriesId: s2._id, chapterId: chapters[5]._id, chapterIndex: 0, pageIndex: 4, percentage: 100, completed: true, lastReadAt: new Date(activityNow.getTime() - 3 * 86400000) },
  ];
  await ReadingProgress.create(seededProgress);
  await ReaderActivityEvent.create(seededProgress.map((item) => ({
    ...item,
    activityDate: toBangkokDateKey(item.lastReadAt),
  })));

  await Comment.create([
    { userId: reader._id, chapterId: chapters[0]._id, text: 'Incredible battle sequence! The panel composition is masterful.', likes: 142 },
    { userId: reader2._id, chapterId: chapters[0]._id, text: 'OMG Yuki is so cool wielding that white-flame blade!', likes: 98 },
    { userId: reader3._id, chapterId: chapters[0]._id, text: 'Nice pacing here. Cannot wait to see what happens to Kasumi next.', likes: 12 },
    
    { userId: reader._id, chapterId: chapters[1]._id, text: 'Best chapter yet! The character development is amazing.', likes: 88 },
    { userId: reader2._id, chapterId: chapters[1]._id, text: 'The art quality in this series remains unmatched.', likes: 54 },
    
    { userId: reader._id, chapterId: chapters[5]._id, text: 'What an epic conclusion to Neon Samurai! Hiroshi made the ultimate sacrifice.', likes: 210 }
  ]);
  console.log('  ✅ Votes & Comments seeded successfully.');

  // ── EBVotes (Editorial board review decisions) ────────────────────────────
  console.log('🗳️ Seeding EBVotes...');
  await EBVote.create([
    {
      seriesId: s5._id, // Gothic Chronicles (Pending_EB)
      memberId: eb._id,
      decision: 'approved',
      comments: 'Excellent atmosphere and art styling. Victorian London vibes are strong, and the panel pacing is perfect for horror suspense.',
      rubric: { artStyle: 9, storytelling: 8, characterDesign: 9, pacing: 8, commercialPotential: 8 }
    },
    {
      seriesId: s5._id,
      memberId: eb2._id,
      decision: 'approved',
      comments: 'Very promising storytelling. Dracula character design is compelling. Commercial potential is high.',
      rubric: { artStyle: 8, storytelling: 9, characterDesign: 8, pacing: 7, commercialPotential: 9 }
    },
    {
      seriesId: s5._id,
      memberId: eb3._id,
      decision: 'rejected',
      comments: 'Art style is great, but the character design of Dracula is too standard. Needs more unique Gothic motifs.',
      rubric: { artStyle: 9, storytelling: 6, characterDesign: 5, pacing: 8, commercialPotential: 7 }
    }
  ]);
  console.log('  ✅ EBVotes seeded successfully.');

  // ── Meetings (Review panels schedule) ────────────────────────────
  console.log('📅 Seeding meetings...');
  await Meeting.create([
    {
      title: 'Weekly Review Meeting - Gothic Chronicles',
      description: 'Discuss the EB vote results of Gothic Chronicles. Assess Dracula character design changes suggested by Nomura.',
      dateTime: new Date(now.getTime() + 1 * dayMs),
      location: 'Conference Room A & Discord Channel 1',
      seriesId: s5._id,
      participants: [eb._id, eb2._id, eb3._id, mangaka2._id, editor2._id],
      createdBy: eb._id
    },
    {
      title: 'Shadow Blade Saga - Pre-publication check Ch.42',
      description: 'Verify page layout scaling and screen tones consistency before pushing the chapter to Published.',
      dateTime: new Date(now.getTime() + 3 * dayMs),
      location: 'Online Boardroom',
      seriesId: s1._id,
      participants: [eb._id, mangaka._id, editor._id],
      createdBy: eb._id
    }
  ]);
  console.log('  ✅ Meetings seeded successfully.');

  // ── Notifications (System & Workspace alerts) ────────────────────────────
  console.log('🔔 Seeding notifications...');
  await Notification.create([
    // Assistant
    { userId: assistant._id, type: 'task_assigned', title: 'New Task Assigned', message: 'You have been assigned: "Ink character outlines Ch.44 Page 1"', read: false },
    { userId: assistant3._id, type: 'task_assigned', title: 'Revision Task', message: 'Yuki Mori assigned you "Refining runic columns backgrounds Ch.43"', read: false },
    
    // Mangaka
    { userId: mangaka._id, type: 'chapter_status', title: 'Chapter Approved', message: 'Your chapter "The Blade Awakens" has been approved by Kenji Sato.', read: true },
    { userId: mangaka2._id, type: 'chapter_status', title: 'Chapter Ready for review', message: 'Your chapter "Burning Trails" is now pending editor review.', read: false },
    
    // Editor
    { userId: editor._id, type: 'chapter_status', title: 'New Chapter Submission', message: 'Yuki Mori submitted "Storm of Souls" for editor review.', read: false },
    { userId: editor2._id, type: 'chapter_status', title: 'New Series Assignment', message: 'You have been assigned as the editor for "Dragon Hunter".', read: true }
  ]);
  console.log('  ✅ Notifications seeded successfully.');

  console.log('\n🎉 Rich database seeding complete!');
  console.log('\n📋 Active demo accounts:');
  console.log('   mangaka@mangaflow.com    / password123 (Mangaka Yuki Mori)');
  console.log('   mangaka2@mangaflow.com   / password123 (Mangaka Ken Akamatsu)');
  console.log('   assistant@mangaflow.com  / password123 (Assistant Ren Takahashi)');
  console.log('   assistant2@mangaflow.com / password123 (Assistant Takeshi Obata)');
  console.log('   assistant3@mangaflow.com / password123 (Assistant Yusuke Murata)');
  console.log('   editor@mangaflow.com     / password123 (Editor Kenji Sato)');
  console.log('   editor2@mangaflow.com    / password123 (Editor Akira Toriyama)');
  console.log('   eb@mangaflow.com         / password123 (Editorial Board Aiko Nakamura - Head)');
  console.log('   eb2@mangaflow.com        / password123 (Editorial Board Shinji Mikami)');
  console.log('   eb3@mangaflow.com        / password123 (Editorial Board Tetsuya Nomura)');
  console.log('   reader@mangaflow.com     / password123 (Reader Hiro Kazuo)');
  console.log('   reader2@mangaflow.com    / password123 (Reader Sakura Kinomoto)');
  console.log('   reader3@mangaflow.com    / password123 (Reader Naruto Uzumaki)');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Database seeding failed:', err);
  process.exit(1);
});
