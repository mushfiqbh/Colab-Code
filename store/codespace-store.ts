import { create } from 'zustand';
import { FileItem } from '@/lib/supabase';

type CodespaceStore = {
  codespaceId: string | null;
  slug: string | null;
  name: string;
  files: FileItem[];
  activeFileId: string | null;
  openFileIds: string[];
  expandedFolders: Set<string>;

  setCodespace: (id: string, slug: string, name: string) => void;
  setFiles: (files: FileItem[]) => void;
  addFile: (file: FileItem) => void;
  updateFile: (id: string, updates: Partial<FileItem>) => void;
  deleteFile: (id: string) => void;
  lockFile: (id: string) => void;
  unlockFile: (id: string) => void;
  setActiveFile: (id: string | null) => void;
  openFile: (id: string) => void;
  closeFile: (id: string) => void;
  toggleFolder: (id: string) => void;
  expandFolder: (id: string) => void;
  collapseAllFolders: () => void;
  updateCodespaceName: (name: string) => void;
  reset: () => void;
};

export const useCodespaceStore = create<CodespaceStore>((set) => ({
  codespaceId: null,
  slug: null,
  name: 'Untitled Codespace',
  files: [],
  activeFileId: null,
  openFileIds: [],
  expandedFolders: new Set(),

  setCodespace: (id, slug, name) =>
    set({ codespaceId: id, slug, name }),

  setFiles: (files) => set({ files }),

  addFile: (file) =>
    set((state) => ({ files: [...state.files, file] })),

  updateFile: (id, updates) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, ...updates } : f
      ),
    })),

  lockFile: (id) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, is_locked: true } : f
      ),
    })),

  unlockFile: (id) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, is_locked: false } : f
      ),
    })),

  deleteFile: (id) =>
    set((state) => {
      const newFiles = state.files.filter((f) => f.id !== id && f.parent_id !== id);
      const newOpenFileIds = state.openFileIds.filter((fileId) => {
        const fileExists = newFiles.some(f => f.id === fileId);
        return fileExists;
      });
      const newActiveFileId = state.activeFileId && newOpenFileIds.includes(state.activeFileId)
        ? state.activeFileId
        : (newOpenFileIds.length > 0 ? newOpenFileIds[newOpenFileIds.length - 1] : null);

      return {
        files: newFiles,
        openFileIds: newOpenFileIds,
        activeFileId: newActiveFileId,
      };
    }),

  setActiveFile: (id) => set({ activeFileId: id }),

  openFile: (id) =>
    set((state) => ({
      openFileIds: state.openFileIds.includes(id)
        ? state.openFileIds
        : [...state.openFileIds, id],
      activeFileId: id,
    })),

  closeFile: (id) =>
    set((state) => {
      const newOpenFileIds = state.openFileIds.filter((fileId) => fileId !== id);
      const newActiveFileId = state.activeFileId === id
        ? (newOpenFileIds.length > 0 ? newOpenFileIds[newOpenFileIds.length - 1] : null)
        : state.activeFileId;
      return {
        openFileIds: newOpenFileIds,
        activeFileId: newActiveFileId,
      };
    }),

  toggleFolder: (id) =>
    set((state) => {
      const newExpanded = new Set(state.expandedFolders);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      return { expandedFolders: newExpanded };
    }),

  expandFolder: (id) =>
    set((state) => {
      const newExpanded = new Set(state.expandedFolders);
      newExpanded.add(id);
      return { expandedFolders: newExpanded };
    }),

  collapseAllFolders: () =>
    set({ expandedFolders: new Set() }),

  updateCodespaceName: (name) => set({ name }),

  reset: () =>
    set({
      codespaceId: null,
      slug: null,
      name: 'Untitled Codespace',
      files: [],
      activeFileId: null,
      openFileIds: [],
      expandedFolders: new Set(),
    }),
}));
