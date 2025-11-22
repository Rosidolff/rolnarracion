# The Lazy DM Vault

A local-first application for Dungeon Masters based on the "Return of the Lazy Dungeon Master" methodology.

## Features

- **Campaign Management**: Track truths, fronts, and elevator pitches.
- **The Vault**: A reserve of NPCs, scenes, secrets, and items.
- **Session Management**: Plan sessions, link resources, and log notes.
- **File System DB**: All data is stored as JSON files in `data_storage/` for future AI integration.

## Tech Stack

- **Backend**: Flask (Python)
- **Frontend**: Vue.js 3 + Vite + Tailwind CSS + Pinia

## Getting Started

### Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

See [walkthrough.md](walkthrough.md) for usage instructions.
