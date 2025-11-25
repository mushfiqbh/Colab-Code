"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { FolderOpen } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Code2, Loader2, Zap, Share2, Lock, Search, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Codespace } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [codespaces, setCodespaces] = useState<Codespace[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingCodespaces, setLoadingCodespaces] = useState(true);

  useEffect(() => {
    const fetchCodespaces = async () => {
      try {
        const supabase = getSupabase();
        if (!supabase) return;

        const { data, error } = await supabase
          .from("codespaces")
          .select("id, slug, name, visitor_count, created_at, updated_at")
          .order("visitor_count", { ascending: false })
          .order("created_at", { ascending: false });

        if (error) throw error;
        setCodespaces(data || []);
      } catch (error) {
        console.error("Error fetching codespaces:", error);
      } finally {
        setLoadingCodespaces(false);
      }
    };

    fetchCodespaces();
  }, []);

  const filteredCodespaces = codespaces.filter((codespace) =>
    codespace.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateCodespace = async () => {
    try {
      setCreating(true);
      const supabase = getSupabase();

      if (!supabase) {
        throw new Error("Supabase not initialized");
      }

      const slug = nanoid(10);

      const { data, error } = await supabase
        .from("codespaces")
        .insert({
          slug,
          name: "Untitled Codespace",
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your codespace has been created",
      });

      router.push(`/${slug}`);
    } catch (error) {
      console.error("Error creating codespace:", error);
      toast({
        title: "Error",
        description: "Failed to create codespace. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500/10 via-background to-background"></div>
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-to-tr from-blue-500/20 to-transparent rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-1/2 h-1/2 bg-gradient-to-tl from-emerald-500/20 to-transparent rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>
      <div className="container max-w-6xl mx-auto px-4 py-8 sm:py-16">
        <div className="text-center space-y-6 sm:space-y-8 mb-16 sm:mb-20">
          <div className="space-y-4 mt-16">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80">
              Share Code Instantly
            </h1>
            <div className="h-1.5 w-24 bg-gradient-to-r from-blue-500 to-blue-500/30 mx-auto rounded-full"></div>
          </div>

          <p className="text-lg sm:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Create, edit, and share code snippets without any login. Perfect for
            <span className="text-foreground font-medium"> collaboration</span>, <span className="text-foreground font-medium">code reviews</span>, and <span className="text-foreground font-medium">quick sharing</span>.
          </p>

          <div className="pt-6 sm:pt-8 space-y-4">
            <Button
              onClick={handleCreateCodespace}
              disabled={creating}
              size="lg"
              className="group relative overflow-hidden text-base sm:text-lg px-8 py-6 h-auto min-h-[52px] w-full sm:w-auto bg-gradient-to-r from-blue-500 to-blue-500/90 hover:from-blue-500/90 hover:to-blue-500/80 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg"
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                  <span className="relative z-10">Create Codespace</span>
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground/70">No signup required. Start coding in seconds.</p>
          </div>
        </div>

        <div className="mt-16 mb-8 sm:mb-12 text-center">
          <div className="inline-flex items-center space-x-2 text-muted-foreground/70 text-sm">
            <span>© {new Date().getFullYear()} Mushfiq R.</span>
            <span className="text-muted-foreground/30">•</span>
            <a 
              href="https://mushfiqbh.vercel.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-foreground/80 hover:text-blue-500 transition-colors flex items-center group"
            >
              <span>Contact Developer</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 h-3.5 w-3.5 opacity-0 -translate-x-1 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                <path d="M5 12h14"></path>
                <path d="m12 5 7 7-7 7"></path>
              </svg>
            </a>
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
