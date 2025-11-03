export const getFileLanguage = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase();

  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    cs: 'csharp',
    go: 'go',
    rs: 'rust',
    rb: 'ruby',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    scala: 'scala',
    html: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    json: 'json',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    sql: 'sql',
    sh: 'shell',
    bash: 'shell',
    r: 'r',
    dart: 'dart',
    vue: 'vue',
    svelte: 'svelte',
  };

  return languageMap[extension || ''] || 'plaintext';
};

export const getFileIcon = (filename: string, isFolder: boolean) => {
  if (isFolder) return 'folder';

  const extension = filename.split('.').pop()?.toLowerCase();

  const iconMap: Record<string, string> = {
    js: 'file-code',
    jsx: 'file-code',
    ts: 'file-code',
    tsx: 'file-code',
    py: 'file-code',
    html: 'file-code',
    css: 'file-code',
    json: 'file-json',
    md: 'file-text',
    txt: 'file-text',
  };

  return iconMap[extension || ''] || 'file';
};

export const buildFilePath = (name: string, parentPath?: string): string => {
  if (!parentPath || parentPath === '/') {
    return `/${name}`;
  }
  return `${parentPath}/${name}`;
};

export const sortFiles = (files: any[]): any[] => {
  return [...files].sort((a, b) => {
    if (a.type === 'folder' && b.type === 'file') return -1;
    if (a.type === 'file' && b.type === 'folder') return 1;
    return a.name.localeCompare(b.name);
  });
};
