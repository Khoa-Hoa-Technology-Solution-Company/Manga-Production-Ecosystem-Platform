import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'MangaFlow API',
      version: '1.0.0',
      description: 'REST API for the MangaFlow Manga Production & Ecosystem Platform',
      contact: { name: 'MangaFlow Team' },
    },
    servers: [
      { url: 'http://localhost:3000/api', description: 'Local development' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token (from /auth/login)',
        },
      },
      schemas: {
        // ── Auth ──────────────────────────────────
        RegisterBody: {
          type: 'object',
          required: ['email', 'password', 'displayName'],
          properties: {
            email: { type: 'string', format: 'email', example: 'mangaka@mangaflow.com' },
            password: { type: 'string', minLength: 6, example: 'password123' },
            displayName: { type: 'string', example: 'Yuki Mori' },
            role: { type: 'string', enum: ['mangaka', 'assistant', 'editor', 'editorial_board', 'reader'], default: 'reader' },
          },
        },
        LoginBody: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'mangaka@mangaflow.com' },
            password: { type: 'string', example: 'password123' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            email: { type: 'string' },
            displayName: { type: 'string' },
            role: { type: 'string', enum: ['mangaka', 'assistant', 'editor', 'editorial_board', 'reader'] },
            avatar: { type: 'string', nullable: true },
            bio: { type: 'string', nullable: true },
            skills: { type: 'array', items: { type: 'string' } },
            rating: { type: 'number' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },

        // ── Series ────────────────────────────────
        Series: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            genre: { type: 'array', items: { type: 'string' } },
            coverImage: { type: 'string', nullable: true },
            mangakaId: { type: 'string' },
            editorId: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['Draft', 'Active', 'Completed', 'Hiatus'] },
            totalChapters: { type: 'number' },
            totalVotes: { type: 'number' },
            weeklyVotes: { type: 'number' },
            readerCount: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateSeriesBody: {
          type: 'object',
          required: ['title', 'description', 'genre'],
          properties: {
            title: { type: 'string', example: 'Shadow Blade Saga' },
            description: { type: 'string', example: 'An epic samurai manga' },
            genre: { type: 'array', items: { type: 'string' }, example: ['Action', 'Fantasy'] },
            coverImage: { type: 'string' },
          },
        },

        // ── Chapter ───────────────────────────────
        Chapter: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            seriesId: { type: 'string' },
            chapterNumber: { type: 'number' },
            title: { type: 'string' },
            status: { type: 'string', enum: ['Draft', 'Reviewing', 'Approved', 'Published'] },
            mangakaId: { type: 'string' },
            editorId: { type: 'string', nullable: true },
            totalPages: { type: 'number' },
            progress: { type: 'number', minimum: 0, maximum: 100 },
            publishedAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateChapterBody: {
          type: 'object',
          required: ['chapterNumber', 'title'],
          properties: {
            chapterNumber: { type: 'number', example: 1 },
            title: { type: 'string', example: 'The Beginning' },
          },
        },
        UpdateStatusBody: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['Draft', 'Reviewing', 'Approved', 'Published'] },
          },
        },

        // ── Task ──────────────────────────────────
        Task: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            chapterId: { type: 'string' },
            seriesId: { type: 'string' },
            zoneId: { type: 'string', nullable: true },
            pageId: { type: 'string', nullable: true },
            type: { type: 'string', enum: ['inking', 'background', 'tone', 'lettering', 'effects'] },
            title: { type: 'string' },
            description: { type: 'string', nullable: true },
            assignedTo: { type: 'string', nullable: true },
            assignedBy: { type: 'string' },
            status: { type: 'string', enum: ['open', 'assigned', 'in_progress', 'review', 'done'] },
            deadline: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateTaskBody: {
          type: 'object',
          required: ['chapterId', 'seriesId', 'type', 'title', 'deadline'],
          properties: {
            chapterId: { type: 'string' },
            seriesId: { type: 'string' },
            zoneId: { type: 'string' },
            pageId: { type: 'string' },
            type: { type: 'string', enum: ['inking', 'background', 'tone', 'lettering', 'effects'] },
            title: { type: 'string', example: 'Ink character outlines' },
            description: { type: 'string' },
            deadline: { type: 'string', format: 'date-time' },
          },
        },

        // ── Common ────────────────────────────────
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: [], // We define paths inline below, not via JSDoc comments
};

export const swaggerSpec: any = swaggerJsdoc(options);

// ── Add paths programmatically ──────────────────────
swaggerSpec.paths = {
  // ── Auth ──────────────────────────────────────────
  '/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Register a new user',
      security: [],
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterBody' } } } },
      responses: {
        201: { description: 'User created', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
        409: { description: 'Email already registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      },
    },
  },
  '/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Login and receive JWT',
      security: [],
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginBody' } } } },
      responses: {
        200: { description: 'Login successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
        401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      },
    },
  },
  '/auth/me': {
    get: {
      tags: ['Auth'],
      summary: 'Get current user profile',
      responses: {
        200: { description: 'User profile', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } } } } },
      },
    },
  },
  '/auth/profile': {
    put: {
      tags: ['Auth'],
      summary: 'Update profile',
      requestBody: {
        content: {
          'application/json': {
            schema: { type: 'object', properties: { displayName: { type: 'string' }, bio: { type: 'string' }, skills: { type: 'array', items: { type: 'string' } } } },
          },
        },
      },
      responses: { 200: { description: 'Updated profile' } },
    },
  },

  // ── Series ────────────────────────────────────────
  '/series': {
    get: {
      tags: ['Series'],
      summary: 'List series (filtered by role)',
      parameters: [
        { in: 'query', name: 'status', schema: { type: 'string', enum: ['Draft', 'Active', 'Completed', 'Hiatus'] } },
        { in: 'query', name: 'genre', schema: { type: 'string' } },
        { in: 'query', name: 'sort', schema: { type: 'string', enum: ['votes', 'date'] } },
        { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
        { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
      ],
      responses: { 200: { description: 'Paginated series list' } },
    },
    post: {
      tags: ['Series'],
      summary: 'Create a new series (Mangaka only)',
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateSeriesBody' } } } },
      responses: { 201: { description: 'Series created' }, 403: { description: 'Forbidden' } },
    },
  },
  '/series/{id}': {
    get: {
      tags: ['Series'],
      summary: 'Get series by ID',
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Series details' }, 404: { description: 'Not found' } },
    },
    put: {
      tags: ['Series'],
      summary: 'Update series (Mangaka/Editor)',
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateSeriesBody' } } } },
      responses: { 200: { description: 'Updated' } },
    },
    delete: {
      tags: ['Series'],
      summary: 'Delete series (Mangaka only)',
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Deleted' }, 404: { description: 'Not found' } },
    },
  },

  // ── Chapters ──────────────────────────────────────
  '/chapters/series/{seriesId}': {
    get: {
      tags: ['Chapters'],
      summary: 'List chapters by series',
      parameters: [{ in: 'path', name: 'seriesId', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Chapters list' } },
    },
    post: {
      tags: ['Chapters'],
      summary: 'Create chapter (Mangaka only)',
      parameters: [{ in: 'path', name: 'seriesId', required: true, schema: { type: 'string' } }],
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateChapterBody' } } } },
      responses: { 201: { description: 'Chapter created' } },
    },
  },
  '/chapters/{id}': {
    put: {
      tags: ['Chapters'],
      summary: 'Update chapter (Mangaka/Editor)',
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Updated' } },
    },
  },
  '/chapters/{id}/status': {
    patch: {
      tags: ['Chapters'],
      summary: 'Transition chapter workflow status',
      description: 'Valid transitions: Draft → Reviewing (Mangaka), Reviewing → Approved/Draft (Editor), Approved → Published (EB)',
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateStatusBody' } } } },
      responses: { 200: { description: 'Status updated' }, 400: { description: 'Invalid transition' } },
    },
  },

  // ── Tasks ─────────────────────────────────────────
  '/tasks': {
    get: {
      tags: ['Tasks'],
      summary: 'List tasks (filtered by role)',
      parameters: [
        { in: 'query', name: 'status', schema: { type: 'string', enum: ['open', 'assigned', 'in_progress', 'review', 'done'] } },
        { in: 'query', name: 'type', schema: { type: 'string', enum: ['inking', 'background', 'tone', 'lettering', 'effects'] } },
        { in: 'query', name: 'assignedTo', schema: { type: 'string' }, description: 'Use "me" for current user\'s tasks' },
      ],
      responses: { 200: { description: 'Tasks list' } },
    },
    post: {
      tags: ['Tasks'],
      summary: 'Create task (Mangaka only)',
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateTaskBody' } } } },
      responses: { 201: { description: 'Task created' } },
    },
  },
  '/tasks/{id}/accept': {
    patch: {
      tags: ['Tasks'],
      summary: 'Accept a task (Assistant only)',
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Task accepted' }, 400: { description: 'Task not available' } },
    },
  },
  '/tasks/{id}/status': {
    patch: {
      tags: ['Tasks'],
      summary: 'Update task status',
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', enum: ['open', 'assigned', 'in_progress', 'review', 'done'] } } } } } },
      responses: { 200: { description: 'Status updated' } },
    },
  },

  // ── Dashboard ─────────────────────────────────────
  '/dashboard/stats': {
    get: {
      tags: ['Dashboard'],
      summary: 'Get KPI stats (role-specific)',
      responses: { 200: { description: 'Dashboard stats' } },
    },
  },
  '/dashboard/workflow': {
    get: {
      tags: ['Dashboard'],
      summary: 'Get workflow board data (chapters grouped by status)',
      responses: { 200: { description: 'Workflow board' } },
    },
  },
  '/dashboard/rankings': {
    get: {
      tags: ['Dashboard'],
      summary: 'Get series rankings (sorted by weekly votes)',
      responses: { 200: { description: 'Rankings list' } },
    },
  },

  // ── Health ────────────────────────────────────────
  '/health': {
    get: {
      tags: ['System'],
      summary: 'Health check',
      security: [],
      responses: { 200: { description: 'Server is running' } },
    },
  },

  // ═══ Phase 2 Endpoints ═══════════════════════════

  // ── Pages ─────────────────────────────────────────
  '/pages/chapter/{chapterId}': {
    get: {
      tags: ['Pages'],
      summary: 'List pages by chapter',
      parameters: [{ in: 'path', name: 'chapterId', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Pages list' } },
    },
    post: {
      tags: ['Pages'],
      summary: 'Upload a manga page (Mangaka only)',
      parameters: [{ in: 'path', name: 'chapterId', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['image', 'pageNumber'],
              properties: {
                image: { type: 'string', format: 'binary' },
                pageNumber: { type: 'integer' },
                width: { type: 'integer' },
                height: { type: 'integer' },
              },
            },
          },
        },
      },
      responses: { 201: { description: 'Page uploaded' } },
    },
  },
  '/pages/{id}': {
    delete: {
      tags: ['Pages'],
      summary: 'Delete a page (Mangaka only)',
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Page deleted' } },
    },
  },

  // ── Zones ─────────────────────────────────────────
  '/zones/page/{pageId}': {
    get: {
      tags: ['Zones'],
      summary: 'List zones for a page',
      parameters: [{ in: 'path', name: 'pageId', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Zones list' } },
    },
    post: {
      tags: ['Zones'],
      summary: 'Create a zone on a page (Mangaka only)',
      parameters: [{ in: 'path', name: 'pageId', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'type', 'boundingBox'],
              properties: {
                name: { type: 'string', example: 'Background' },
                type: { type: 'string', enum: ['background', 'characters', 'effects', 'dialog', 'sfx'] },
                color: { type: 'string', example: '#3b82f6' },
                boundingBox: {
                  type: 'object',
                  properties: {
                    x: { type: 'number' }, y: { type: 'number' },
                    width: { type: 'number' }, height: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
      responses: { 201: { description: 'Zone created' } },
    },
  },
  '/zones/{id}': {
    put: {
      tags: ['Zones'],
      summary: 'Update a zone (Mangaka only)',
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Zone updated' } },
    },
    delete: {
      tags: ['Zones'],
      summary: 'Delete a zone (Mangaka only)',
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Zone deleted' } },
    },
  },

  // ── Tasks (extended) ──────────────────────────────
  '/tasks/{id}': {
    get: {
      tags: ['Tasks'],
      summary: 'Get task by ID',
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Task details' } },
    },
    put: {
      tags: ['Tasks'],
      summary: 'Update task (Mangaka/Assistant)',
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Task updated' } },
    },
  },
  '/tasks/{id}/submit': {
    post: {
      tags: ['Tasks'],
      summary: 'Submit task work (Assistant only)',
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      requestBody: {
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: { file: { type: 'string', format: 'binary' } },
            },
          },
        },
      },
      responses: { 200: { description: 'Task submitted for review' } },
    },
  },

  // ── Votes & Comments (under chapters) ─────────────
  '/chapters/{id}/vote': {
    post: {
      tags: ['Votes'],
      summary: 'Vote for a chapter',
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                seriesId: { type: 'string' },
                rating: { type: 'integer', minimum: 1, maximum: 5 },
                reaction: { type: 'string', example: '🔥' },
              },
            },
          },
        },
      },
      responses: { 200: { description: 'Vote recorded' } },
    },
  },
  '/chapters/{id}/votes': {
    get: {
      tags: ['Votes'],
      summary: 'Get vote stats for a chapter',
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Vote statistics' } },
    },
  },
  '/chapters/{id}/comments': {
    get: {
      tags: ['Comments'],
      summary: 'List comments for a chapter',
      parameters: [
        { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
        { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
        { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
      ],
      responses: { 200: { description: 'Comments list' } },
    },
    post: {
      tags: ['Comments'],
      summary: 'Post a comment',
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['text'],
              properties: {
                text: { type: 'string' },
                parentId: { type: 'string', description: 'For reply threads' },
              },
            },
          },
        },
      },
      responses: { 201: { description: 'Comment posted' } },
    },
  },
  '/comments/{id}/like': {
    post: {
      tags: ['Comments'],
      summary: 'Like/Unlike a comment (toggle)',
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Like toggled' } },
    },
  },

  // ── Notifications ─────────────────────────────────
  '/notifications': {
    get: {
      tags: ['Notifications'],
      summary: 'List notifications',
      parameters: [
        { in: 'query', name: 'unreadOnly', schema: { type: 'boolean' } },
        { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
        { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
      ],
      responses: { 200: { description: 'Notifications list with unread count' } },
    },
  },
  '/notifications/{id}/read': {
    patch: {
      tags: ['Notifications'],
      summary: 'Mark notification as read',
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Marked as read' } },
    },
  },
  '/notifications/read-all': {
    patch: {
      tags: ['Notifications'],
      summary: 'Mark all notifications as read',
      responses: { 200: { description: 'All marked as read' } },
    },
  },
};
