'use client';

import { useState } from 'react';
import { FileItem } from '@/lib/supabase';
import { useCodespaceStore } from '@/store/codespace-store';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Plus, FileText, MoreVertical, Edit, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type FileTreeProps = {
  files: FileItem[];
  onFileClick: (file: FileItem) => void;
  onDeleteFile: (file: FileItem) => void;
  onCreateFileInFolder?: (parentId: string) => void;
  onCreateFolderInFolder?: (parentId: string) => void;
  onRenameFile?: (file: FileItem) => void;
  onCreateNewItem?: (type: 'file' | 'folder', name: string, parentId?: string) => void;
  creatingItem?: { type: 'file' | 'folder'; parentId?: string } | null;
  onCancelCreating?: () => void;
};

export function FileTree({ files, onFileClick, onDeleteFile, onCreateFileInFolder, onCreateFolderInFolder, onRenameFile, onCreateNewItem, creatingItem, onCancelCreating }: FileTreeProps) {
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
            'flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent rounded-md transition-colors group relative',
            isActive && 'bg-accent'
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
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
              className="flex-1 text-sm bg-background border border-border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-ring"
              autoFocus
            />
          ) : (
            <span className="flex-1 text-sm truncate">{file.name}</span>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground p-1 rounded hover:bg-accent transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3 w-3" />
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
                  className="flex-1 text-sm bg-background border border-border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-ring"
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
        <div className="flex items-center gap-2 px-2 py-1.5">
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
            className="flex-1 text-sm bg-background border border-border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-ring"
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
