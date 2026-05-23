# Manga Production Ecosystem Platform

Manga Production Ecosystem Platform is a monorepo for building and operating a manga production workflow across web, backend, and mobile clients. The project is organized around studio operations, content workflows, and supporting tools for production teams.

## Live deployment

- Web app: https://manga-production-ecosystem-platform-web.onrender.com/

## Project structure

- `FE/` - Web frontend built with React, Vite, TypeScript, and Tailwind CSS
- `BE/` - Backend API built with Node.js, Express, MongoDB, and TypeScript
- `MB/` - Mobile app built with Expo / React Native

## Core features

- Studio and workflow management UI
- Protected application routes and authenticated sections
- Backend services for API, validation, and database access
- Shared utility layers for API communication and socket integration
- Mobile companion app for on-the-go access

## Environment files

Each app has its own example environment file:

- `FE/.env`
- `BE/.env`
- `MB/.env`

Use the matching local `.env` file for each app and keep secrets out of version control.

## Root scripts

Available from the project root:

- `npm run dev:fe` - start the frontend dev server
- `npm run build:fe` - build the frontend app
- `npm run lint:fe` - lint the frontend app
- `npm run dev:be` - start the backend service
- `npm run seed:be` - seed backend data
- `npm run dev:mb` - start the mobile app
- `npm run lint:mb` - lint the mobile app

## Local development

### Frontend

```bash
cd FE
npm install
npm run dev
```

### Backend

```bash
cd BE
npm install
npm run dev
```

### Mobile

```bash
cd MB
npm install
npm run start
```

## Notes

- The repository uses separate package managers and lockfiles per app.
- The frontend CI builds and lints the web app, and the backend CI validates the server build.
- Keep local secrets in untracked `.env` files and use the example files as references only.
