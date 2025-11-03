'use client';

import { FileItem } from '@/lib/supabase';
import { useCodespaceStore } from '@/store/codespace-store';
import { useEffect, useState, useRef, Suspense, lazy } from 'react';
import { Button } from '@/components/ui/button';
import { X, Copy, Download, Loader2, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import JSZip from 'jszip';
import { preloadMonaco } from '@/lib/monaco-preload';
import { buildFilePath } from '@/lib/file-utils';

// Lazy load Monaco Editor
const MonacoEditor = lazy(() =>
  import('@monaco-editor/react').then(module => ({ default: module.default }))
);

// Loading component for Monaco
const MonacoLoading = () => (
  <div className="flex-1 flex items-center justify-center bg-muted/20">
    <div className="text-center space-y-3">
      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
      <p className="text-sm text-muted-foreground">Loading code editor...</p>
    </div>
  </div>
);

type CodeEditorProps = {
  onContentChange: (content: string) => void;
};

export function CodeEditor({ onContentChange }: CodeEditorProps) {
  const { files, activeFileId, openFileIds, setActiveFile, closeFile, name } = useCodespaceStore();
  const { toast } = useToast();
  const [fileContents, setFileContents] = useState<Record<string, string>>({});

  const activeFile = files.find((f) => f.id === activeFileId);
  const openFiles = files.filter((f) => openFileIds.includes(f.id));

  // Preload Monaco when files are opened
  useEffect(() => {
    if (openFileIds.length > 0) {
      preloadMonaco();
    }
  }, [openFileIds.length]);

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
        <div className="flex-1 flex min-w-0">
          {openFiles.map((file) => (
            <div
              key={file.id}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 border-r cursor-pointer hover:bg-muted/50 transition-colors min-w-0 flex-shrink-0 ${
                activeFileId === file.id ? 'bg-background border-b-2 border-b-primary' : ''
              }`}
              onClick={() => setActiveFile(file.id)}
            >
              <span className="text-xs sm:text-sm font-medium truncate max-w-20 sm:max-w-32">{file.name}</span>
              {file.is_locked && <Lock className="h-3 w-3 flex-shrink-0 text-orange-500" />}
              {file.language && (
                <span className="hidden sm:inline text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                  {file.language}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 sm:h-4 sm:w-4 p-0 hover:bg-muted-foreground/20 min-w-[24px] min-h-[24px]"
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
                className="h-6 w-6 sm:h-4 sm:w-4 p-0 hover:bg-destructive/20 hover:text-destructive min-w-[24px] min-h-[24px]"
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
        {/* <Button
          variant="ghost"
          size="sm"
          className="px-2 sm:px-3 py-2 hover:bg-muted/50 min-w-[44px] min-h-[44px] flex-shrink-0"
          onClick={downloadAllFiles}
          title="Download all files as ZIP"
        >
          <Download className="h-4 w-4" />
        </Button> */}
      </div>

      {/* Editor */}
      {activeFile && (
        <div className="flex-1 overflow-auto">
          <Suspense fallback={<MonacoLoading />}>
            <MonacoEditor
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
                readOnly: activeFile.is_locked,
              }}
            />
          </Suspense>
        </div>
      )}
    </div>
  );
}

