// Monaco Editor preload utility
let monacoPreloaded = false;

export const preloadMonaco = () => {
  if (monacoPreloaded) return Promise.resolve();

  return new Promise<void>((resolve) => {
    // Preload Monaco Editor in the background
    import('@monaco-editor/react').then(() => {
      monacoPreloaded = true;
      resolve();
    }).catch(() => {
      // If preload fails, still resolve to not block the app
      resolve();
    });
  });
};

// Start preloading Monaco immediately when this module is imported
if (typeof window !== 'undefined') {
  preloadMonaco();
}