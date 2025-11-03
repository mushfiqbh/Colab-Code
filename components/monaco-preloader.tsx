'use client';

import { useEffect } from 'react';
import { preloadMonaco } from '@/lib/monaco-preload';

export function MonacoPreloader() {
  useEffect(() => {
    // Preload Monaco Editor in the background when the app starts
    preloadMonaco();
  }, []);

  return null; // This component doesn't render anything
}