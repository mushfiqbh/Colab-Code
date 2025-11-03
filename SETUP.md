# CodeShare Setup Guide

A Next.js code sharing platform with file management, built with Supabase and Zustand.

## Features

- Create codespaces without login
- File and folder management
- Unique shareable URLs
- Real-time code editing
- Multiple file type support
- Organized file tree structure

## Setup Instructions

### 1. Database Setup

The database schema has already been created with the following tables:
- `codespaces` - Stores codespace metadata
- `files` - Stores files and folders

### 2. Environment Variables

Update `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## How It Works

### Creating a Codespace

1. Visit the homepage
2. Click "Create New Codespace"
3. A unique codespace with a random slug is created
4. You're redirected to the codespace editor

### File Management

- Click "New File" to create files or folders
- Files support various languages (auto-detected from extension)
- Click on files to edit them
- Delete files/folders using the × button on hover

### Sharing

- Each codespace has a unique URL: `/codespace/[slug]`
- Click "Share" to copy the URL to clipboard
- Anyone with the URL can view and edit the code

## Tech Stack

- **Next.js 13** - React framework with App Router
- **Supabase** - Database and real-time capabilities
- **Zustand** - State management
- **shadcn/ui** - UI components
- **Tailwind CSS** - Styling
- **TypeScript** - Type safety

## Project Structure

```
├── app/
│   ├── page.tsx                    # Homepage
│   ├── codespace/[slug]/page.tsx   # Codespace editor
│   └── layout.tsx                  # Root layout
├── components/
│   ├── file-tree.tsx               # File tree component
│   ├── code-editor.tsx             # Code editor
│   ├── new-item-dialog.tsx         # Create file/folder dialog
│   └── ui/                         # shadcn components
├── lib/
│   ├── supabase.ts                 # Supabase client
│   ├── file-utils.ts               # File helper functions
│   └── utils.ts                    # General utilities
└── store/
    └── codespace-store.ts          # Zustand store
```

## Database Schema

### codespaces table
- `id` - UUID primary key
- `slug` - Unique identifier for URLs
- `name` - Codespace name
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### files table
- `id` - UUID primary key
- `codespace_id` - Reference to codespace
- `name` - File/folder name
- `type` - 'file' or 'folder'
- `parent_id` - Parent folder ID (null for root)
- `content` - File content (null for folders)
- `language` - Programming language
- `path` - Full file path
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

## Notes

- No authentication required - anyone can create and edit
- All data is stored in Supabase
- RLS policies allow public read/write access
- State is managed locally with Zustand
- Files are saved to database on every change
