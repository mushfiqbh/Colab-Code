"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { nanoid } from "nanoid";

// Helper function for debouncing
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
import { getSupabase, FileItem } from "@/lib/supabase";
import { useCodespaceStore } from "@/store/codespace-store";
import { FileTree } from "@/components/file-tree";
import { isTextFile, encodeFileContent, isAllowedFileType } from "@/lib/file-utils";
import { CodeEditor } from "@/components/code-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Share2,
  Loader2,
  FileText,
  File,
  Folder,
  RefreshCw,
  ChevronDown,
  Menu,
  X,
  Download,
  Eye,
  Check,
  Copy,
} from "lucide-react";
import { buildFilePath, getFileLanguage, sortFiles } from "@/lib/file-utils";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

export default function Codespace() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const slug = params.slug as string;

  const {
    codespaceId,
    name,
    visitorCount,
    files,
    activeFileId,
    openFileIds,
    setCodespace,
    setFiles,
    addFile,
    updateFile,
    deleteFile,
    lockFile,
    unlockFile,
    setActiveFile,
    openFile,
    closeFile,
    updateCodespaceName,
    incrementVisitorCount,
    expandFolder,
  } = useCodespaceStore();

  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(name);
  const [editingSlug, setEditingSlug] = useState(false);
  const [tempSlug, setTempSlug] = useState(slug);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);
  const [creatingItem, setCreatingItem] = useState<{
    type: "file" | "folder";
    parentId?: string;
    name?: string;
  } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadParentId, setUploadParentId] = useState<string | undefined>(
    undefined
  );
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<FileItem | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareSlug, setShareSlug] = useState(slug);
  const [cloning, setCloning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadCodespace = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = getSupabase();

      if (!supabase) {
        throw new Error("Supabase not initialized");
      }

      const { data: codespace, error: codespaceError } = await supabase
        .from("codespaces")
        .select("*")
        .ilike("slug", slug)
        .maybeSingle();

      if (codespaceError) throw codespaceError;

      if (!codespace) {
        router.push("/");
        return;
      }

      setCodespace(
        codespace.id,
        codespace.slug,
        codespace.name,
        codespace.visitor_count || 0
      );
      setTempName(codespace.name);

      // Increment visitor count using session storage (only once per session)
      const sessionKey = `visited_codespace_${codespace.id}`;
      const hasVisited =
        typeof window !== "undefined"
          ? sessionStorage.getItem(sessionKey)
          : null;

      if (!hasVisited) {
        const { error: updateError } = await supabase
          .from("codespaces")
          .update({ visitor_count: (codespace.visitor_count || 0) + 1 })
          .eq("id", codespace.id);

        if (updateError) {
          console.error("Error updating visitor count:", updateError);
        } else {
          // Update local state
          const store = useCodespaceStore.getState();
          store.incrementVisitorCount();
          // Mark as visited in session storage (only on client side)
          if (typeof window !== "undefined") {
            sessionStorage.setItem(sessionKey, "true");
          }
        }
      }

      const { data: filesData, error: filesError } = await supabase
        .from("files")
        .select("*")
        .eq("codespace_id", codespace.id);

      if (filesError) throw filesError;

      setFiles(sortFiles(filesData || []));
    } catch (error) {
      console.error("Error loading codespace:", error);
      toast({
        title: "Error",
        description: "Failed to load codespace",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [slug, router, toast, setCodespace, setTempName, setFiles]);

  useEffect(() => {
    loadCodespace();
  }, [slug, loadCodespace]);

  // Auto-open sidebar on mobile when no file is active
  useEffect(() => {
    if (!loading && typeof window !== "undefined") {
      const isMobile = window.innerWidth < 768; // md breakpoint
      const hasActiveFile = !!activeFileId;

      if (isMobile && !hasActiveFile && files.length > 0) {
        setSidebarOpen(true);
      }
    }
  }, [loading, activeFileId, files.length]);

  const handleCreateItem = async (
    itemName: string,
    type: "file" | "folder",
    parentId?: string
  ) => {
    if (!codespaceId) return;

    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase not initialized");

      // Find the parent folder's path if parentId is provided
      let parentPath = "/";
      if (parentId) {
        const parentFolder = files.find((f) => f.id === parentId);
        parentPath = parentFolder?.path || "/";
      }

      const path = buildFilePath(itemName, parentPath);
      const language = type === "file" ? getFileLanguage(itemName) : null;

      const { data, error } = await supabase
        .from("files")
        .insert({
          codespace_id: codespaceId,
          name: itemName,
          type,
          parent_id: parentId || null,
          content: type === "file" ? "" : null,
          language,
          path,
        })
        .select()
        .single();

      if (error) throw error;

      addFile(data);
      setFiles(sortFiles([...files, data]));

      // Expand the parent folder if it exists
      if (parentId) {
        expandFolder(parentId);
      }

      if (type === "file") {
        setActiveFile(data.id);
      }

      toast({
        title: "Success",
        description: `${
          type === "file" ? "File" : "Folder"
        } created successfully`,
      });
    } catch (error) {
      console.error("Error creating item:", error);
      toast({
        title: "Error",
        description: "Failed to create item",
        variant: "destructive",
      });
    }
  };

  const isImageFile = (file: FileItem) => {
    return (
      file.content?.startsWith("data:image/") ||
      file.name.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i)
    );
  };

  const handleNewFile = () => {
    setCreatingItem({ type: "file" });
  };

  const handleNewFolder = () => {
    setCreatingItem({ type: "folder" });
  };

  const handleRefresh = async () => {
    await loadCodespace();
    toast({
      title: "Refreshed",
      description: "File tree has been refreshed",
    });
  };

  const handleCollapseAll = () => {
    useCodespaceStore.getState().collapseAllFolders();
  };

  const handleCreateNewItem = async (
    type: "file" | "folder",
    name: string,
    parentId?: string
  ) => {
    await handleCreateItem(name, type, parentId);
    setCreatingItem(null);
  };

  const handleCancelCreating = () => {
    setCreatingItem(null);
  };

  const handleCreateFileInFolder = (parentId: string) => {
    expandFolder(parentId);
    setCreatingItem({ type: "file", parentId });
  };

  const handleCreateFolderInFolder = (parentId: string) => {
    expandFolder(parentId);
    setCreatingItem({ type: "folder", parentId });
  };

  const handleRenameFile = async (file: FileItem) => {
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase not initialized");

      const newPath = buildFilePath(
        file.name,
        file.path.replace(file.name.split("/").pop() || "", "")
      );
      const newLanguage =
        file.type === "file" ? getFileLanguage(file.name) : null;

      const { error } = await supabase
        .from("files")
        .update({
          name: file.name,
          path: newPath,
          language: newLanguage,
        })
        .eq("id", file.id);

      if (error) throw error;

      updateFile(file.id, {
        name: file.name,
        path: newPath,
        language: newLanguage,
      });

      setFiles(
        sortFiles(
          files.map((f) =>
            f.id === file.id
              ? { ...f, name: file.name, path: newPath, language: newLanguage }
              : f
          )
        )
      );

      toast({
        title: "Success",
        description: "File renamed successfully",
      });
    } catch (error) {
      console.error("Error renaming file:", error);
      toast({
        title: "Error",
        description: "Failed to rename file",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFile = (file: FileItem) => {
    setFileToDelete(file);
  };

  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;

    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase not initialized");

      const { error } = await supabase
        .from("files")
        .delete()
        .eq("id", fileToDelete.id);

      if (error) throw error;

      deleteFile(fileToDelete.id);
      setFiles(
        sortFiles(
          files.filter(
            (f) => f.id !== fileToDelete.id && f.parent_id !== fileToDelete.id
          )
        )
      );

      toast({
        title: "Success",
        description: `${
          fileToDelete.type === "file" ? "File" : "Folder"
        } deleted`,
      });
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    } finally {
      setFileToDelete(null);
    }
  };

  const handleLockFile = async (file: FileItem) => {
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase not initialized");

      const { error } = await supabase
        .from("files")
        .update({ is_locked: true })
        .eq("id", file.id);

      if (error) throw error;

      lockFile(file.id);
      updateFile(file.id, { is_locked: true });

      toast({
        title: "File Locked",
        description: `${file.name} is now locked and cannot be edited`,
      });
    } catch (error) {
      console.error("Error locking file:", error);
      toast({
        title: "Error",
        description: "Failed to lock file",
        variant: "destructive",
      });
    }
  };

  const handleUnlockFile = async (file: FileItem) => {
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase not initialized");

      const { error } = await supabase
        .from("files")
        .update({ is_locked: false })
        .eq("id", file.id);

      if (error) throw error;

      unlockFile(file.id);
      updateFile(file.id, { is_locked: false });

      toast({
        title: "File Unlocked",
        description: `${file.name} is now unlocked and can be edited`,
      });
    } catch (error) {
      console.error("Error unlocking file:", error);
      toast({
        title: "Error",
        description: "Failed to unlock file",
        variant: "destructive",
      });
    }
  };

  const handleUploadFile = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const maxSize = 1024 * 1024; // 1MB in bytes
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    // Validate all files first
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      
      // Check file type
      if (!isAllowedFileType(file.name)) {
        invalidFiles.push(`${file.name} (unsupported file type)`);
        continue;
      }
      
      // Check file size
      if (file.size > maxSize) {
        invalidFiles.push(`${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB - too large)`);
      } else {
        validFiles.push(file);
      }
    }

    // Show error for oversized files
    if (invalidFiles.length > 0) {
      toast({
        title: "Files not uploaded",
        description: `The following files were rejected: ${invalidFiles.join(", ")}. Only text and image files under 1MB are allowed.`,
        variant: "destructive",
      });
    }

    if (validFiles.length === 0) return;

    let successCount = 0;
    let errorCount = 0;

    // Process each valid file
    for (const file of validFiles) {
      try {
        const supabase = getSupabase();
        if (!supabase) throw new Error("Supabase not initialized");

        // Convert file to base64 or text based on file type
        const fileContent = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result as string;
            if (isTextFile(file.name)) {
              // For text files, decode base64 to plain text
              const base64Data = result.split(',')[1];
              try {
                resolve(atob(base64Data));
              } catch (error) {
                reject(new Error("Failed to decode text file"));
              }
            } else {
              // For binary files, keep as base64 data URL
              resolve(result);
            }
          };
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsDataURL(file);
        });

        // Create file record in database
        const parentFolder = uploadParentId
          ? files.find((f) => f.id === uploadParentId)
          : null;
        const parentPath = parentFolder?.path || "/";
        const filePath = buildFilePath(file.name, parentPath);

        const { data, error } = await supabase
          .from("files")
          .insert({
            codespace_id: codespaceId,
            name: file.name,
            type: "file",
            parent_id: uploadParentId || null,
            content: fileContent,
            language: null,
            path: filePath,
          })
          .select()
          .single();

        if (error) throw error;

        addFile(data);
        setFiles(sortFiles([...files, data]));
        successCount++;

        // Expand the parent folder if it exists
        if (uploadParentId) {
          expandFolder(uploadParentId);
        }
      } catch (error) {
        console.error("Error uploading file:", file.name, error);
        errorCount++;
      }
    }

    // Show results
    if (successCount > 0) {
      toast({
        title: "Upload complete",
        description: `${successCount} file${successCount > 1 ? 's' : ''} uploaded successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      });
    }

    if (errorCount > 0 && successCount === 0) {
      toast({
        title: "Upload failed",
        description: "Failed to upload all files",
        variant: "destructive",
      });
    }

    // Clear the input and parent ID
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setUploadParentId(undefined);
  };

  const handleContentChange = async (content: string) => {
    if (!activeFileId) return;

    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase not initialized");

      // Find the active file to check if it's a text file
      const activeFile = files.find(f => f.id === activeFileId);
      // Text files are stored as plain text, binary files as base64
      const contentToSave = activeFile && isTextFile(activeFile.name) 
        ? content
        : encodeFileContent(content, activeFile?.name || '');

      const { error } = await supabase
        .from("files")
        .update({ content: contentToSave, updated_at: new Date().toISOString() })
        .eq("id", activeFileId);

      if (error) throw error;

      updateFile(activeFileId, { content: contentToSave });
      // Clear dirty flag after successful save
      try {
        const { clearDirty } = useCodespaceStore.getState();
        clearDirty(activeFileId);
      } catch (e) {
        // ignore if store not available
      }
    } catch (error) {
      console.error("Error updating file:", error);
    }
  };

  const handleUpdateName = async () => {
    if (!codespaceId || !tempName.trim()) return;

    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase not initialized");

      const { error } = await supabase
        .from("codespaces")
        .update({ name: tempName, updated_at: new Date().toISOString() })
        .eq("id", codespaceId);

      if (error) throw error;

      updateCodespaceName(tempName);
      setEditingName(false);

      toast({
        title: "Success",
        description: "Codespace name updated",
      });
    } catch (error) {
      console.error("Error updating name:", error);
      toast({
        title: "Error",
        description: "Failed to update name",
        variant: "destructive",
      });
    }
  };

  const checkSlugAvailability = useCallback(
    async (newSlug: string): Promise<boolean> => {
      if (!newSlug.trim() || newSlug === slug) return true;

      try {
        const supabase = getSupabase();
        if (!supabase) return false;

        const { data, error } = await supabase
          .from("codespaces")
          .select("id")
          .ilike("slug", newSlug.trim())
          .maybeSingle();

        if (error) {
          console.error("Error checking slug availability:", error);
          return false;
        }

        return !data; // Available if no data found
      } catch (error) {
        console.error("Error checking slug availability:", error);
        return false;
      }
    },
    [slug]
  );

  // Debounced slug availability check
  const debouncedCheckSlug = useCallback(
    (slugToCheck: string) => {
      if (!slugToCheck.trim() || slugToCheck === slug) {
        setSlugAvailable(null);
        return;
      }

      const checkAvailability = async () => {
        setCheckingSlug(true);
        try {
          const available = await checkSlugAvailability(slugToCheck);
          setSlugAvailable(available);
        } catch (error) {
          setSlugAvailable(null);
        } finally {
          setCheckingSlug(false);
        }
      };

      const timeoutId = setTimeout(checkAvailability, 500);
      return () => clearTimeout(timeoutId);
    },
    [slug, checkSlugAvailability]
  );

  const handleUpdateSlug = async () => {
    const newSlug = tempSlug.trim();

    if (!newSlug) {
      toast({
        title: "Invalid slug",
        description: "Slug cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (newSlug === slug) {
      setEditingSlug(false);
      return;
    }

    // Check if slug availability is known and valid
    if (slugAvailable === false) {
      toast({
        title: "Slug not available",
        description: "This slug is already taken. Please choose another one.",
        variant: "destructive",
      });
      return;
    }

    if (slugAvailable === null) {
      // Still checking, wait for availability check to complete
      setCheckingSlug(true);
      const isAvailable = await checkSlugAvailability(newSlug);
      setCheckingSlug(false);

      if (!isAvailable) {
        toast({
          title: "Slug not available",
          description: "This slug is already taken. Please choose another one.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase not initialized");

      const { error } = await supabase
        .from("codespaces")
        .update({ slug: newSlug, updated_at: new Date().toISOString() })
        .eq("id", codespaceId);

      if (error) throw error;

      // Update the store
      const store = useCodespaceStore.getState();
      store.setCodespace(codespaceId!, newSlug, store.name);

      // Redirect to new URL
      router.push(`/${newSlug}`);

      toast({
        title: "Slug updated!",
        description: "Your codespace URL has been updated.",
      });
    } catch (error) {
      console.error("Error updating slug:", error);
      toast({
        title: "Error updating slug",
        description: "Failed to update the slug. Please try again.",
        variant: "destructive",
      });
    } finally {
      setEditingSlug(false);
    }
  };

  const handleCloneCodespace = async () => {
    if (!codespaceId) {
      return;
    }

    try {
      setCloning(true);
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error("Supabase not initialized");
      }

      const newSlug = `${slug}-${nanoid(6)}`.toLowerCase();
      const cloneName = name ? `${name} (Copy)` : "Untitled Codespace Copy";

      const { data: newCodespace, error: cloneError } = await supabase
        .from("codespaces")
        .insert({
          slug: newSlug,
          name: cloneName,
        })
        .select()
        .single();

      if (cloneError) throw cloneError;

      if (newCodespace && files.length > 0) {
        const depthForPath = (path: string) =>
          path.split("/").filter(Boolean).length;

        const filesByDepth = [...files].sort(
          (a, b) => depthForPath(a.path) - depthForPath(b.path)
        );

        const idMap = new Map<string, string>();

        for (const file of filesByDepth) {
          const parentId = file.parent_id
            ? idMap.get(file.parent_id) ?? null
            : null;

          const { data: insertedFile, error: insertError } = await supabase
            .from("files")
            .insert({
              codespace_id: newCodespace.id,
              name: file.name,
              type: file.type,
              parent_id: parentId,
              content: file.type === "file" ? file.content : null,
              language: file.language,
              path: file.path,
              is_locked: file.is_locked,
            })
            .select()
            .single();

          if (insertError) throw insertError;

          if (insertedFile?.id) {
            idMap.set(file.id, insertedFile.id);
          }
        }
      }

      toast({
        title: "Codespace cloned",
        description: "Opening the duplicate in a new tab.",
      });

      if (typeof window !== "undefined") {
        window.open(`/${newSlug}`, "_blank");
      }
    } catch (error) {
      console.error("Error cloning codespace:", error);
      toast({
        title: "Clone failed",
        description: "We could not clone this codespace. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCloning(false);
    }
  };

  const handleShare = () => {
    setShareSlug(slug);
    setShareModalOpen(true);
  };

  const handleCopyShareLink = async () => {
    const url = `${window.location.origin}/${shareSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied!",
        description: "Share this link to let others view your code",
      });
      setShareModalOpen(false);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  const handleUpdateSlugFromModal = async () => {
    const newSlug = shareSlug.trim();

    if (!newSlug) {
      toast({
        title: "Invalid slug",
        description: "Slug cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (newSlug === slug) {
      setShareModalOpen(false);
      return;
    }

    // Check if slug availability is known and valid
    if (slugAvailable === false) {
      toast({
        title: "Slug not available",
        description: "This slug is already taken. Please choose another one.",
        variant: "destructive",
      });
      return;
    }

    if (slugAvailable === null) {
      // Still checking, wait for availability check to complete
      setCheckingSlug(true);
      const isAvailable = await checkSlugAvailability(newSlug);
      setCheckingSlug(false);

      if (!isAvailable) {
        toast({
          title: "Slug not available",
          description: "This slug is already taken. Please choose another one.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase not initialized");

      const { error } = await supabase
        .from("codespaces")
        .update({ slug: newSlug, updated_at: new Date().toISOString() })
        .eq("id", codespaceId);

      if (error) throw error;

      // Update the store
      const store = useCodespaceStore.getState();
      store.setCodespace(codespaceId!, newSlug, store.name);

      // Redirect to new URL
      router.push(`/${newSlug}`);

      toast({
        title: "Slug updated!",
        description: "Your codespace URL has been updated.",
      });
      setShareModalOpen(false);
    } catch (error) {
      console.error("Error updating slug:", error);
      toast({
        title: "Error updating slug",
        description: "Failed to update the slug. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Slug availability checking
  useEffect(() => {
    if ((editingSlug && tempSlug !== slug) || (shareModalOpen && shareSlug !== slug)) {
      const slugToCheck = editingSlug ? tempSlug : shareSlug;
      const cleanup = debouncedCheckSlug(slugToCheck);
      return cleanup;
    } else {
      setSlugAvailable(null);
    }
  }, [tempSlug, editingSlug, slug, debouncedCheckSlug, shareSlug, shareModalOpen]);

  const activeFile = files.find((f) => f.id === activeFileId);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </Button>

            {editingName ? (
              <Input
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={handleUpdateName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleUpdateName();
                  if (e.key === "Escape") {
                    setTempName(name);
                    setEditingName(false);
                  }
                }}
                className="h-8 w-32 sm:w-64"
                autoFocus
              />
            ) : (
              <h1
                className="text-lg sm:text-xl font-semibold cursor-pointer hover:text-primary transition-colors truncate max-w-32 sm:max-w-none"
                onClick={() => setEditingName(true)}
              >
                {name}
              </h1>
            )}
          </div>

          {/* Visitor count - hidden on mobile */}
          <div className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
            <Eye className="h-4 w-4" />
            <span>{visitorCount} views</span>
          </div>

          {/* Mobile menu dropdown */}
          <div className="md:hidden">
            <DropdownMenu
              open={mobileMenuOpen}
              onOpenChange={setMobileMenuOpen}
            >
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">                
                <DropdownMenuItem
                  onClick={() => {
                    if (cloning) return;
                    setMobileMenuOpen(false);
                    handleCloneCodespace();
                  }}
                  className="flex items-center gap-2"
                  disabled={cloning}
                >
                  {cloning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span>{cloning ? "Cloning..." : "Clone This Codespace"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleShare}
                  className="flex items-center gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  <span>Share</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span>{visitorCount} views</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  <span>{sidebarOpen ? "Hide" : "Show"} File Explorer</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <Button
              onClick={handleCloneCodespace}
              variant="outline"
              size="sm"
              disabled={cloning}
            >
              {cloning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {cloning ? "Cloning" : "Clone This Codespace"}
            </Button>
            <Button
              onClick={handleShare}
              variant="outline"
              size="sm"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={`
          w-full md:w-80 border-t md:border-t-0 md:border-r bg-white flex flex-col
          fixed md:relative bottom-0 md:bottom-auto md:inset-y-0 left-0 md:left-auto z-50 md:z-auto
          transform ${
            sidebarOpen ? "translate-y-0" : "translate-y-full"
          } md:translate-y-0
          transition-transform duration-200 ease-in-out
          h-80 md:h-auto shadow-lg md:shadow-none
        `}
        >
          <div className="p-2 border-b bg-muted/50">
            <div className="flex items-center gap-1 flex-wrap">
              <Button
                onClick={handleNewFile}
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                title="New File"
              >
                <File className="h-3.5 w-3.5" />
              </Button>
              <Button
                onClick={handleNewFolder}
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                title="New Folder"
              >
                <Folder className="h-3.5 w-3.5" />
              </Button>
              <Button
                onClick={handleRefresh}
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                title="Refresh Explorer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              <Button
                onClick={handleCollapseAll}
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                title="Collapse All"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <FileTree
              files={files}
              onFileClick={(file) => {
                if (isImageFile(file)) {
                  setSelectedImage(file);
                  setImageModalOpen(true);
                  setSidebarOpen(false); // Close sidebar on mobile
                  return;
                }

                const { unsavedFileIds } = useCodespaceStore.getState();
                if (
                  unsavedFileIds &&
                  unsavedFileIds.size > 0 &&
                  unsavedFileIds.has(activeFileId || "")
                ) {
                  // If there are unsaved files, warn and prevent switching
                  toast({
                    title: "Save changes",
                    description:
                      "Please save current changes before switching files",
                  });
                  return;
                }
                openFile(file.id);
                setSidebarOpen(false); // Close sidebar on mobile after selecting file
              }}
              onDeleteFile={handleDeleteFile}
              onCreateFileInFolder={handleCreateFileInFolder}
              onCreateFolderInFolder={handleCreateFolderInFolder}
              onRenameFile={handleRenameFile}
              onCreateNewItem={handleCreateNewItem}
              onLockFile={handleLockFile}
              onUnlockFile={handleUnlockFile}
              creatingItem={creatingItem}
              onCancelCreating={handleCancelCreating}
              onUploadFile={(parentId) => {
                setUploadParentId(parentId);
                fileInputRef.current?.click();
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.cs,.go,.rs,.rb,.php,.swift,.kt,.scala,.html,.css,.scss,.sass,.json,.xml,.yaml,.yml,.md,.sql,.sh,.bash,.txt,.log,.ini,.cfg,.conf,.env,.gitignore,.dockerfile,.makefile,.readme,image/*"
              onChange={handleUploadFile}
              className="hidden"
            />
          </div>
        </aside>

        <main className="flex-1 overflow-hidden bg-background">
          <CodeEditor onContentChange={handleContentChange} />
        </main>
      </div>

      <AlertDialog
        open={!!fileToDelete}
        onOpenChange={() => setFileToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {fileToDelete?.type}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{fileToDelete?.name}&quot;?
              {fileToDelete?.type === "folder" &&
                " This will also delete all files and folders inside it."}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteFile}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{selectedImage?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {selectedImage?.content && (
              <Image
                src={selectedImage.content}
                alt={selectedImage.name}
                width={800}
                height={600}
                className="max-w-full max-h-[60vh] object-contain rounded-lg"
              />
            )}

            <Button
              onClick={() => {
                if (selectedImage) {
                  const link = document.createElement("a");
                  link.href = selectedImage.content || "";
                  link.download = selectedImage.name;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }
              }}
              className="w-fit"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Codespace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Share Link</label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  value={`${window.location.origin}/${shareSlug}`}
                  readOnly
                  className="flex-1"
                />
                <Button onClick={handleCopyShareLink} size="sm">
                  Copy
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Slug</label>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">/</span>
                <Input
                  value={shareSlug}
                  onChange={(e) => setShareSlug(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleUpdateSlugFromModal();
                  }}
                  className={`flex-1 h-8 text-sm ${
                    slugAvailable === false
                      ? "border-red-500"
                      : slugAvailable === true
                      ? "border-green-500"
                      : ""
                  }`}
                  disabled={checkingSlug}
                  autoFocus
                  placeholder="Enter slug"
                />
                {checkingSlug && <Loader2 className="h-4 w-4 animate-spin" />}
                {!checkingSlug && slugAvailable === true && (
                  <Check className="h-4 w-4 text-green-500" />
                )}
                {!checkingSlug && slugAvailable === false && (
                  <X className="h-4 w-4 text-red-500" />
                )}
              </div>
              {slugAvailable === false && (
                <p className="text-sm text-red-500 mt-1">
                  This slug is already taken. Please choose another one.
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShareModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSlugFromModal} disabled={checkingSlug}>
              Save Slug
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}
