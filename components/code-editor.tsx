'use client';

import { FileItem } from '@/lib/supabase';
import { useCodespaceStore } from '@/store/codespace-store';
import { useEffect, useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { X, Copy, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import JSZip from 'jszip';
import { buildFilePath } from '@/lib/file-utils';

type CodeEditorProps = {
  onContentChange: (content: string) => void;
};

export function CodeEditor({ onContentChange }: CodeEditorProps) {
  const { files, activeFileId, openFileIds, setActiveFile, closeFile, name } = useCodespaceStore();
  const { toast } = useToast();
  const [fileContents, setFileContents] = useState<Record<string, string>>({});

  const activeFile = files.find((f) => f.id === activeFileId);
  const openFiles = files.filter((f) => openFileIds.includes(f.id));

  // Initialize file contents
  useEffect(() => {
    const newContents: Record<string, string> = {};
    openFiles.forEach((file) => {
      if (!(file.id in fileContents)) {
        newContents[file.id] = file.content || '';
      }
    });
    if (Object.keys(newContents).length > 0) {
      setFileContents((prev) => ({ ...prev, ...newContents }));
    }
  }, [openFiles, fileContents]);

  const handleContentChange = (fileId: string, content: string) => {
    setFileContents((prev) => ({ ...prev, [fileId]: content }));
    onContentChange(content);
  };

  const copyCode = async (file: FileItem) => {
    const content = fileContents[file.id] || file.content || '';
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: 'Copied!',
        description: `Code from ${file.name} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy code',
        variant: 'destructive',
      });
    }
  };

  const downloadAllFiles = async () => {
    try {
      const zip = new JSZip();

      // Add all files to the zip
      files.forEach((file) => {
        if (file.type === 'file') {
          const content = fileContents[file.id] || file.content || '';
          // Build the full path
          const fullPath = buildFilePath(file.name, file.path);
          zip.file(fullPath, content);
        }
      });

      // Generate the zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // Create download link
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/[^a-zA-Z0-9]/g, '_')}_files.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Download Complete',
        description: 'All files have been downloaded as a ZIP archive',
      });
    } catch (error) {
      console.error('Error creating zip:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to create ZIP archive',
        variant: 'destructive',
      });
    }
  };

  if (openFiles.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-3">
          <div className="text-lg">No files open</div>
          <div className="text-sm">Select a file from the explorer to start editing</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* File Tabs */}
      <div className="flex items-center border-b bg-muted/30 overflow-x-auto">
        <div className="flex-1 flex">
          {openFiles.map((file) => (
            <div
              key={file.id}
              className={`flex items-center gap-2 px-3 py-2 border-r cursor-pointer hover:bg-muted/50 transition-colors min-w-0 ${
                activeFileId === file.id ? 'bg-background border-b-2 border-b-primary' : ''
              }`}
              onClick={() => setActiveFile(file.id)}
            >
              <span className="text-sm font-medium truncate max-w-32">{file.name}</span>
              {file.language && (
                <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                  {file.language}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-muted-foreground/20"
                onClick={(e) => {
                  e.stopPropagation();
                  copyCode(file);
                }}
                title="Copy code"
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-destructive/20 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  closeFile(file.id);
                }}
                title="Close file"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="px-3 py-2 hover:bg-muted/50"
          onClick={downloadAllFiles}
          title="Download all files as ZIP"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor */}
      {activeFile && (
        <div className="flex-1 overflow-auto">
          <Editor
            height="100%"
            language={activeFile.language || 'plaintext'}
            value={fileContents[activeFile.id] || activeFile.content || ''}
            onChange={(value) => handleContentChange(activeFile.id, value || '')}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>
      )}
    </div>
  );
}

