# MEMENTO — Your life, in little moments.

A full-stack personal photo memory archive built for a hackathon. Upload, organize, and relive your photographs in a beautiful, editorial interface.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Image uploads | Multer (local filesystem) |
| Animations | Framer Motion |
| Icons | Lucide React |

---

## Project Structure

```
memento/
├── frontend/         React + Vite frontend
├── backend/          Node.js + Express backend
├── .gitignore
└── README.md
```

---

## Setup Guide

### Prerequisites

- Node.js v18 or newer
- MongoDB (local or Atlas)
- npm

### 1. Install MongoDB

**Option A — Local MongoDB (recommended for development):**

1. Download: https://www.mongodb.com/try/download/community
2. Install and run: `mongod`
3. MongoDB runs on `mongodb://localhost:27017` by default.

**Option B — MongoDB Atlas (free cloud):**

1. Register: https://www.mongodb.com/cloud/atlas/register
2. Create a free cluster.
3. Get your connection string (format: `mongodb+srv://user:pass@cluster.mongodb.net/memento`).
4. Update `backend/.env` with your connection string.

---

### 2. Backend Setup

```bash
cd memento/backend
cp .env.example .env
# Edit .env if needed (e.g., set your Atlas connection string)
npm install
npm run dev
```

Backend runs at: http://localhost:5000

---

### 3. Frontend Setup

```bash
cd memento/frontend
npm install
npm run dev
```

Frontend runs at: http://localhost:5173

---

## Features

- **Photo Upload** — Drag-and-drop or file browser, multiple files, progress bar, preview, retry on error
- **Duplicate Detection** — SHA-256 checksum deduplication server-side
- **Album Management** — Create, rename, edit, delete albums; cover photo selection; add/remove/move photos
- **Photo Gallery** — Masonry grid, adjustable density, lazy loading, multi-select, bulk delete
- **Full-Screen Viewer** — Keyboard navigation, zoom, info panel, edit descriptions/tags, favorite, delete
- **Search & Filters** — Backend-powered search by filename, description, tags; filter by album, favorites, date
- **Favorites** — Toggle and browse favorited photos
- **Memories Timeline** — Chronological grouping by month and day with On This Day section
- **Storage Indicator** — Real-time storage usage display

---

## Environment Variables

### Backend (`backend/.env`)

```env
MONGO_URI=mongodb://localhost:27017/memento
PORT=5000
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

---

## API Endpoints

### Photos
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/photos` | Get all photos (paginated, searchable) |
| POST | `/api/photos/upload` | Upload photos (multipart) |
| GET | `/api/photos/stats` | Get library statistics |
| GET | `/api/photos/on-this-day` | On This Day photos |
| GET | `/api/photos/timeline` | Chronological timeline |
| GET | `/api/photos/:id` | Get single photo |
| PUT | `/api/photos/:id` | Update photo metadata |
| PATCH | `/api/photos/:id/favorite` | Toggle favorite |
| DELETE | `/api/photos/:id` | Delete single photo |
| DELETE | `/api/photos/bulk` | Delete multiple photos |

### Albums
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/albums` | Get all albums |
| POST | `/api/albums` | Create album |
| GET | `/api/albums/:id` | Get album with photos |
| PUT | `/api/albums/:id` | Update album |
| DELETE | `/api/albums/:id` | Delete album |
| POST | `/api/albums/:id/photos` | Add photos to album |
| DELETE | `/api/albums/:id/photos` | Remove photos from album |
| POST | `/api/albums/move` | Move photos between albums |

---

## Notes

- Uploaded images are stored in `backend/uploads/` and served at `/uploads/`.
- Deleting an album does **not** delete its photos.
- SHA-256 checksums are calculated server-side from actual file contents.
- The `sharp` package is used for image dimensions; it's optional — the app works without it.
