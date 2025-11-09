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

// Check if a file is a text file that should be editable
export const isTextFile = (filename: string): boolean => {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  const textExtensions = [
    'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'go', 'rs', 'rb', 'php',
    'swift', 'kt', 'scala', 'html', 'css', 'scss', 'sass', 'json', 'xml', 'yaml', 'yml',
    'md', 'sql', 'sh', 'bash', 'r', 'dart', 'vue', 'svelte', 'txt', 'log', 'ini', 'cfg',
    'conf', 'env', 'gitignore', 'dockerfile', 'makefile', 'readme'
  ];
  
  return textExtensions.includes(extension || '') || !extension;
};

// Check if a file is an image file
export const isImageFile = (filename: string): boolean => {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  const imageExtensions = [
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff', 'tif'
  ];
  
  return imageExtensions.includes(extension || '');
};

// Check if a file is allowed for upload (text or image)
export const isAllowedFileType = (filename: string): boolean => {
  return isTextFile(filename) || isImageFile(filename);
};

// Decode base64 content to text for text files
export const decodeFileContent = (content: string | null, filename: string): string => {
  if (!content) return '';
  
  // If it's a data URL (base64 encoded), extract and decode the content
  if (content.startsWith('data:')) {
    try {
      const base64Data = content.split(',')[1];
      return atob(base64Data);
    } catch (error) {
      console.error('Failed to decode base64 content:', error);
      return content;
    }
  }
  
  // If it's already plain text (for newly created files), return as is
  return content;
};

// Encode text content to base64 for storage
export const encodeFileContent = (content: string, filename: string): string => {
  if (!content) return '';
  
  // For text files, encode as data URL
  if (isTextFile(filename)) {
    try {
      const mimeType = getMimeType(filename);
      const base64Data = btoa(content);
      return `data:${mimeType};base64,${base64Data}`;
    } catch (error) {
      console.error('Failed to encode content to base64:', error);
      return content;
    }
  }
  
  // For binary files, content is already base64 encoded
  return content;
};

// Get MIME type for a file
export const getMimeType = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  const mimeMap: Record<string, string> = {
    js: 'text/javascript',
    jsx: 'text/javascript',
    ts: 'text/typescript',
    tsx: 'text/typescript',
    py: 'text/x-python',
    java: 'text/x-java-source',
    cpp: 'text/x-c++src',
    c: 'text/x-csrc',
    cs: 'text/x-csharp',
    go: 'text/x-go',
    rs: 'text/x-rust',
    rb: 'text/x-ruby',
    php: 'text/x-php',
    swift: 'text/x-swift',
    kt: 'text/x-kotlin',
    scala: 'text/x-scala',
    html: 'text/html',
    css: 'text/css',
    scss: 'text/x-scss',
    sass: 'text/x-sass',
    json: 'application/json',
    xml: 'text/xml',
    yaml: 'text/yaml',
    yml: 'text/yaml',
    md: 'text/markdown',
    sql: 'text/x-sql',
    sh: 'text/x-shellscript',
    bash: 'text/x-shellscript',
    txt: 'text/plain',
    log: 'text/plain',
    ini: 'text/plain',
    cfg: 'text/plain',
    conf: 'text/plain',
    env: 'text/plain',
    dockerfile: 'text/plain',
    makefile: 'text/plain',
    readme: 'text/plain',
  };
  
  return mimeMap[extension || ''] || 'text/plain';
};
