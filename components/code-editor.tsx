'use client';

import { getSupabase, FileItem, FileComment } from '@/lib/supabase';
import { useCodespaceStore } from '@/store/codespace-store';
import { useEffect, useState, useRef, Suspense, lazy, useCallback, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Copy, Loader2, Lock, MessageCircle, Trash2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { preloadMonaco } from '@/lib/monaco-preload';

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
  const { files, activeFileId, openFileIds, setActiveFile, closeFile, name, markDirty, clearDirty } = useCodespaceStore();
  const { toast } = useToast();
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<FileComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentContent, setCommentContent] = useState('');
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [mobileCommentsOpen, setMobileCommentsOpen] = useState(false);
  // Track last active file to detect file switches
  const lastActiveFileId = useRef<string | null>(null);

  const activeFile = files.find((f) => f.id === activeFileId);
  const openFiles = files.filter((f) => openFileIds.includes(f.id));
  
  const fetchComments = useCallback(async (fileId: string) => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      setLoadingComments(true);
      const { data, error } = await supabase
        .from('file_comments')
        .select('*')
        .eq('file_id', fileId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load comments',
        variant: 'destructive',
      });
    } finally {
      setLoadingComments(false);
    }
  }, [toast]);

  // Preload Monaco when files are opened
  useEffect(() => {
    if (openFileIds.length > 0) {
      preloadMonaco();
    }
  }, [openFileIds.length]);

  useEffect(() => {
    if (activeFile?.id) {
      fetchComments(activeFile.id);
      setCommentContent('');
    } else {
      setComments([]);
    }
  }, [activeFile?.id, fetchComments]);

  useEffect(() => {
    setMobileCommentsOpen(false);
  }, [activeFile?.id]);


  // When switching files, ensure the editor value is initialized from the file's saved content.
  // We overwrite the in-memory value on switch to avoid Monaco re-using previous model content
  // (this prevents the bug where switching to a new file shows the previously locked file's content).
  useEffect(() => {
    if (activeFile && lastActiveFileId.current !== activeFile.id) {
      // Show file content for all file types
      const displayContent = activeFile.content || '';
      setFileContents((prev) => ({ ...prev, [activeFile.id]: displayContent }));
      lastActiveFileId.current = activeFile.id;
    }
  }, [activeFile]);

  // If lock state changes for the active file, re-initialize the editor content to the saved file content.
  useEffect(() => {
    if (activeFile) {
      // Show file content for all file types
      const displayContent = activeFile.content || '';
      setFileContents((prev) => ({ ...prev, [activeFile.id]: displayContent }));
    }
  }, [activeFile]);

  const handleAddComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeFile) return;

    const trimmedContent = commentContent.trim();
    if (!trimmedContent) {
      toast({
        title: 'Add a comment',
        description: 'Comment cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('file_comments')
        .insert({
          codespace_id: activeFile.codespace_id,
          file_id: activeFile.id,
          author: commentAuthor.trim() || null,
          content: trimmedContent,
        })
        .select()
        .single();

      if (error) throw error;

      setComments((prev) => [...prev, data]);
      setCommentContent('');
      toast({
        title: 'Comment added',
        description: 'Your comment has been added.',
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to add comment',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      setDeletingCommentId(commentId);
      const { error } = await supabase
        .from('file_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
      toast({
        title: 'Comment deleted',
        description: 'The comment has been removed.',
      });
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete comment',
        variant: 'destructive',
      });
    } finally {
      setDeletingCommentId(null);
    }
  };

  const renderCommentsPanel = (showCloseButton = false) => (
    <div className="flex flex-col h-full bg-background">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Comments</h3>
          <p className="text-xs text-muted-foreground truncate">{activeFile?.name ?? 'No file selected'}</p>
        </div>
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
          {showCloseButton && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => setMobileCommentsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loadingComments ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Loading comments...
          </div>
        ) : comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} className="border rounded-md bg-muted/40 px-3 py-2 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    {comment.author && comment.author.trim().length > 0 ? comment.author : 'Anonymous'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(comment.created_at).toLocaleString()}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteComment(comment.id)}
                  disabled={deletingCommentId === comment.id}
                >
                  {deletingCommentId === comment.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              <p className="text-sm whitespace-pre-line">{comment.content}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            No comments yet. Be the first to share feedback.
          </p>
        )}
      </div>
      <div className="border-t px-4 py-3">
        <form onSubmit={handleAddComment} className="space-y-2">
          <Input
            placeholder="Your name (optional)"
            value={commentAuthor}
            onChange={(event) => setCommentAuthor(event.target.value)}
          />
          <Textarea
            placeholder="Share your feedback about this file"
            value={commentContent}
            onChange={(event) => setCommentContent(event.target.value)}
            rows={3}
          />
          <Button type="submit" className="w-full" disabled={!commentContent.trim()}>
            <Send className="h-4 w-4 mr-2" />
            Add Comment
          </Button>
        </form>
      </div>
    </div>
  );

  const handleContentChange = (fileId: string, content: string) => {
    // If the active file is locked, prevent any changes from being applied or propagated
    if (activeFile && activeFile.is_locked) return;

    setFileContents((prev) => ({ ...prev, [fileId]: content }));
    
    // Mark file as dirty if content changed from saved version
    const file = files.find(f => f.id === fileId);
    if (file && content !== (file.content || '')) {
      markDirty(fileId);
    } else if (file) {
      clearDirty(fileId);
    }
    
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

  const { unsavedFileIds } = useCodespaceStore.getState();

  return (
    <>
      <div className="flex flex-col h-full">
      {/* File Tabs */}
      <div className="flex items-center border-b bg-muted/30 overflow-x-auto">
        <div className="flex-1 flex min-w-0">
          {openFiles.map((file) => {
            const isUnsaved = unsavedFileIds.has(file.id);
            return (
              <div
                key={file.id}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 border-r cursor-pointer hover:bg-muted/50 transition-colors min-w-0 flex-shrink-0 ${
                  activeFileId === file.id ? 'bg-background border-b-2 border-b-primary' : ''
                }`}
                onClick={() => {
                  const { unsavedFileIds } = useCodespaceStore.getState();
                  if (unsavedFileIds && unsavedFileIds.size > 0 && activeFileId !== file.id) {
                    toast({
                      title: 'Save changes',
                      description: 'Please save current changes before switching files',
                    });
                    return;
                  }
                  setActiveFile(file.id);
                }}
              >
                <span className={`text-xs sm:text-sm font-medium truncate max-w-20 sm:max-w-32 ${isUnsaved ? 'italic' : ''}`}>
                  {isUnsaved && '• '}{file.name}
                </span>
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
          );
          })}
        </div>
      </div>

      {/* Editor */}
      {activeFile && (
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          <div className="flex-1 overflow-auto">
            <Suspense fallback={<MonacoLoading />}>
              <MonacoEditor
                key={activeFile.id}
                path={activeFile.id}
                height="100%"
                language={activeFile.language || 'plaintext'}
                // Do not pass a controlled `value` here; initialize the model in onMount instead.
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
                beforeMount={(monaco: any) => {
                  try {
                    // Clean up any stale models
                    const uri = monaco.Uri.parse(activeFile.id);
                    const existingModel = monaco.editor.getModel(uri);
                    if (existingModel) existingModel.dispose();
                  } catch (e) {
                    // ignore
                  }
                }}
                onMount={(editor: any, monaco: any) => {
                  const model = editor.getModel();
                  if (!model) return;

                  // Initialize the model value from our in-memory content or the file's saved content
                  const initial = fileContents[activeFile.id] ?? activeFile.content ?? '';
                  if (model.getValue() !== initial) {
                    model.setValue(initial);
                  }

                  const disposable = editor.onDidChangeModelContent(() => {
                    const newValue = model.getValue();

                    // Prevent updates when locked
                    if (activeFile.is_locked) return;

                    // Update in-memory contents
                    setFileContents((prev) => ({ ...prev, [activeFile.id]: newValue }));
                    // Mark dirty if different from saved content, else clear dirty
                    if (newValue !== (activeFile.content || '')) {
                      markDirty(activeFile.id);
                    } else {
                      clearDirty(activeFile.id);
                    }
                    onContentChange(newValue);
                  });

                  // Ensure we clean up the listener when the editor is disposed
                  editor.onDidDispose(() => disposable.dispose());
                }}
              />
            </Suspense>
          </div>
          <aside className="hidden md:flex md:w-80 flex-shrink-0 border-l bg-background">
            {renderCommentsPanel()}
          </aside>
        </div>
      )}
      </div>
      {activeFile && (
        <>
          <button
            type="button"
            className="md:hidden fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setMobileCommentsOpen((previous) => !previous)}
            aria-label={mobileCommentsOpen ? 'Hide comments' : 'Show comments'}
          >
            <span className="relative">
              <MessageCircle className="h-6 w-6" />
              <span className="absolute -top-1 -right-2 rounded-full bg-red-600 text-white px-2 text-sm font-medium text-foreground shadow">
                {loadingComments ? '...' : comments.length}
              </span>
            </span>
          </button>
          {mobileCommentsOpen && (
            <div className="md:hidden fixed inset-0 z-40">
              <div
                className="absolute inset-0 bg-black/40"
                onClick={() => setMobileCommentsOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute inset-x-0 bottom-0 top-24 bg-background rounded-t-2xl shadow-xl overflow-hidden flex flex-col">
                {renderCommentsPanel(true)}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

