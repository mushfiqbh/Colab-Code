"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-6xl mx-auto px-4 py-8 sm:py-16">
        <div className="text-center space-y-4 sm:space-y-6 mb-12 sm:mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 mb-4">
            <Code2 className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Share Code Instantly
          </h1>

          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            Create, edit, and share code snippets without any login. Perfect for
            collaboration, code reviews, and quick sharing.
          </p>

          <div className="pt-4 sm:pt-6">
            <Button
              onClick={handleCreateCodespace}
              disabled={creating}
              size="lg"
              className="text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 h-auto min-h-[48px] w-full sm:w-auto"
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-5 w-5" />
                  Create Codespace
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mt-12 sm:mt-16">
          <Card className="border-2">
            <CardHeader>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <CardTitle className="text-lg sm:text-xl">
                Instant Setup
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                No registration required. Start coding immediately with a single
                click.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2">
            <CardHeader>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Share2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <CardTitle className="text-lg sm:text-xl">Easy Sharing</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Share your code with a unique URL. Perfect for collaboration and
                code reviews.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 sm:col-span-2 md:col-span-1">
            <CardHeader>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <CardTitle className="text-lg sm:text-xl">
                Organize Files
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Create folders and multiple files. Organize your code just like
                a real project.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="mt-12 sm:mt-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6">
            Explore Codespaces
          </h2>
          <div className="max-w-md mx-auto mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search codespaces..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          {loadingCodespaces ? (
            <div className="text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              <p className="text-muted-foreground mt-2">Loading codespaces...</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCodespaces.map((codespace) => (
                <Card key={codespace.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{codespace.name}</CardTitle>
                    <div className="flex justify-between items-center">
                      <CardDescription>
                        Created {new Date(codespace.created_at).toLocaleDateString()}
                      </CardDescription>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Eye className="h-4 w-4 mr-1" />
                        {codespace.visitor_count || 0}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => router.push(`/${codespace.slug}`)}
                    >
                      View Codespace
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {filteredCodespaces.length === 0 && searchTerm && (
                <p className="text-center text-muted-foreground col-span-full">
                  No codespaces found matching &quot;{searchTerm}&quot;
                </p>
              )}
            </div>
          )}
        </div>

        <p className="mt-10 text-boldgit  text-muted-foreground text-center">
          © {new Date().getFullYear()} Mushfiq R. — <a href="https://mushfiqbh.vercel.app" target="_blank" className="text-blue-500 hover:text-blue-600">Contact Developer</a>
        </p>
      </div>
      <Toaster />
    </div>
  );
}
