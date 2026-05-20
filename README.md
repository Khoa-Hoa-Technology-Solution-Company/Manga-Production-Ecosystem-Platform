# Manga Production Ecosystem Platform

Monorepo for the Manga Production Ecosystem Platform.

## Project structure

- `FE/` - Frontend app built with React + Vite
- `BE/` - Backend service
- `MB/` - Mobile app

## Environment files

Each app has its own example environment file:

- `FE/.env.example`
- `BE/.env.example`
- `MB/.env.example`

Copy the relevant example file to the local environment file expected by that app before running it.

## Root scripts

Available from the project root:

- `npm run dev:fe` - start the frontend dev server
- `npm run build:fe` - build the frontend app
- `npm run lint:fe` - lint the frontend app
- `npm run dev:be` - start the backend service
- `npm run dev:mb` - start the mobile app
- `npm run lint:mb` - lint the mobile app

## Notes

- Root `.gitignore` excludes dependencies, build output, logs, caches, and local environment files.
- Keep secrets out of version control. Use the example files as templates only.
