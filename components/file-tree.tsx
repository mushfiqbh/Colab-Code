'use client';

import { useState } from 'react';
import { FileItem } from '@/lib/supabase';
import { useCodespaceStore } from '@/store/codespace-store';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Plus, FileText, MoreVertical, Edit, Trash2, Lock, Unlock } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { preloadMonaco } from '@/lib/monaco-preload';

type FileTreeProps = {
  files: FileItem[];
  onFileClick: (file: FileItem) => void;
  onDeleteFile: (file: FileItem) => void;
  onCreateFileInFolder?: (parentId: string) => void;
  onCreateFolderInFolder?: (parentId: string) => void;
  onRenameFile?: (file: FileItem) => void;
  onCreateNewItem?: (type: 'file' | 'folder', name: string, parentId?: string) => void;
  onLockFile?: (file: FileItem) => void;
  onUnlockFile?: (file: FileItem) => void;
  creatingItem?: { type: 'file' | 'folder'; parentId?: string } | null;
  onCancelCreating?: () => void;
};

export function FileTree({ files, onFileClick, onDeleteFile, onCreateFileInFolder, onCreateFolderInFolder, onRenameFile, onCreateNewItem, onLockFile, onUnlockFile, creatingItem, onCancelCreating }: FileTreeProps) {
  const { activeFileId, expandedFolders, toggleFolder } = useCodespaceStore();
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const rootFiles = files.filter((f) => !f.parent_id);

  const getChildFiles = (parentId: string) => {
    return files.filter((f) => f.parent_id === parentId);
  };

  const startEditing = (file: FileItem) => {
    setEditingFileId(file.id);
    setEditingName(file.name);
  };

  const cancelEditing = () => {
    setEditingFileId(null);
    setEditingName('');
  };

  const saveEditing = () => {
    if (editingFileId && editingName.trim()) {
      const file = files.find(f => f.id === editingFileId);
      if (file) {
        onRenameFile?.({ ...file, name: editingName.trim() });
      }
    }
    setEditingFileId(null);
    setEditingName('');
  };

  const startCreating = (type: 'file' | 'folder', parentId?: string) => {
    onCreateNewItem?.(type, '', parentId);
  };

  const cancelCreating = () => {
    onCancelCreating?.();
  };

  const saveCreating = (name: string) => {
    if (name.trim() && creatingItem) {
      onCreateNewItem?.(creatingItem.type, name.trim(), creatingItem.parentId);
      onCancelCreating?.();
    } else {
      cancelCreating();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (editingFileId) {
        saveEditing();
      } else if (creatingItem) {
        saveCreating(editingName);
      }
    } else if (e.key === 'Escape') {
      if (editingFileId) {
        cancelEditing();
      } else if (creatingItem) {
        cancelCreating();
      }
    }
  };

  const renderFileItem = (file: FileItem, depth: number = 0) => {
    const isFolder = file.type === 'folder';
    const isExpanded = expandedFolders.has(file.id);
    const isActive = activeFileId === file.id;
    const children = isFolder ? getChildFiles(file.id) : [];

    return (
      <div key={file.id}>
        <div
          className={cn(
            'flex items-center gap-2 px-3 cursor-pointer hover:bg-accent rounded-md transition-colors group relative min-h-[44px]',
            isActive && 'bg-accent'
          )}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
          onMouseEnter={() => {
            // Preload Monaco when hovering over files
            if (!isFolder) {
              preloadMonaco();
            }
          }}
          onClick={() => {
            if (isFolder) {
              toggleFolder(file.id);
            } else {
              onFileClick(file);
            }
          }}
        >
          {isFolder && (
            <span className="flex-shrink-0">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </span>
          )}
          {!isFolder && <span className="w-4" />}

          {isFolder ? (
            isExpanded ? (
              <FolderOpen className="h-4 w-4 flex-shrink-0 text-blue-500" />
            ) : (
              <Folder className="h-4 w-4 flex-shrink-0 text-blue-500" />
            )
          ) : (
            <File className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          )}

          {editingFileId === file.id ? (
            <input
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={saveEditing}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 text-sm bg-background border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring min-h-[32px]"
              autoFocus
            />
          ) : (
            <div className="flex-1 flex items-center gap-1 min-w-0">
              <span className="text-sm truncate">{file.name}</span>
              {file.is_locked && !isFolder && (
                <Lock className="h-3 w-3 flex-shrink-0 text-orange-500" />
              )}
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 text-muted-foreground hover:text-foreground p-2 rounded hover:bg-accent transition-opacity min-w-[44px] min-h-[44px] flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  startEditing(file);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              {isFolder && (
                <>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateFileInFolder?.(file.id);
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    New File
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateFolderInFolder?.(file.id);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Folder
                  </DropdownMenuItem>
                </>
              )}
              {!isFolder && (
                <>
                  {file.is_locked ? (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onUnlockFile?.(file);
                      }}
                    >
                      <Unlock className="h-4 w-4 mr-2" />
                      Unlock
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onLockFile?.(file);
                      }}
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Lock
                    </DropdownMenuItem>
                  )}
                </>
              )}
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFile(file);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isFolder && isExpanded && (
          <div>
            {creatingItem && creatingItem.parentId === file.id && (
              <div className="flex items-center gap-2 px-2 py-1.5 ml-4">
                {creatingItem.type === 'folder' ? (
                  <Folder className="h-4 w-4 flex-shrink-0 text-blue-500" />
                ) : (
                  <File className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                )}
                <input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={() => saveCreating(editingName)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-sm bg-background border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring min-h-[32px]"
                  placeholder={`Enter ${creatingItem.type} name...`}
                  autoFocus
                />
              </div>
            )}
            {children.map((child: FileItem) => renderFileItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="py-2">
      {creatingItem && !creatingItem.parentId && (
        <div className="flex items-center gap-2 px-3 py-2 min-h-[44px]">
          {creatingItem.type === 'folder' ? (
            <Folder className="h-4 w-4 flex-shrink-0 text-blue-500" />
          ) : (
            <File className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          )}
          <input
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => saveCreating(editingName)}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-sm bg-background border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring min-h-[32px]"
            placeholder={`Enter ${creatingItem.type} name...`}
            autoFocus
          />
        </div>
      )}
      {rootFiles.length === 0 && !creatingItem ? (
        <div className="text-sm text-muted-foreground px-4 py-8 text-center">
          No files yet. Create a new file or folder to get started.
        </div>
      ) : (
        rootFiles.map((file) => renderFileItem(file))
      )}
    </div>
  );
}
