# Early Eco UI

Frontend web app for the Early Eco health platform.

Early Eco UI is designed to help users monitor personal and community health in one place. It provides a secure sign-up/sign-in flow, personalized health dashboards, symptom and vitals check-ins, trend/risk visualization, and location-aware community insights so users can take proactive decisions early.

It includes:
- Auth (sign up / sign in).
- Personalized dashboard after login.
- Health check-in flows.
- Community health snapshot with map and risk markers.

## Tech Stack

- React 18
- Vite 5
- React Leaflet + Leaflet (community map)

## Prerequisites

- Node.js 18+ (recommended)
- npm
- Running backend API (default expected at `http://127.0.0.1:8000`)

## Replicate Locally (From Scratch)

1) Clone the repository:

```bash
git clone https://github.com/EarlyEco/ui.git
cd ui
```

2) Install dependencies:

```bash
npm install
```

3) Create local environment file:

```bash
cp .env.example .env
```

4) Update `.env` if needed:

```env
BE_BASE_URL=http://127.0.0.1:8000
```

5) Start the app:

```bash
npm run dev
```

6) Open in browser:

- `http://localhost:5173`

## Environment

Create local env from the example:

```bash
cp .env.example .env
```

Required variable:

- `BE_BASE_URL` - backend base URL  
  Example: `http://127.0.0.1:8000`

## Local Development

```bash
npm install
npm run dev
```

Default app URL:
- `http://localhost:5173`

## Available Scripts

- `npm run dev` - start development server
- `npm run build` - production build
- `npm run preview` - preview production build locally

## Deployment (Vercel)

This project uses Vite output in `dist/`.

`vercel.json` already sets:
- `outputDirectory: "dist"`

So Vercel can build and serve without additional output-dir configuration.

## Project Structure

- `src/app.jsx` - main application shell and page composition
- `src/components/` - UI components (auth, modals, etc.)
- `src/api/` - API communication layer
- `src/styles.css` - global styles and responsive rules

## Notes

- If auth actions fail locally, verify backend is running and `BE_BASE_URL` is correct.
- For map/geolocation features, browser location permission must be allowed.
