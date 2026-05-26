/**
 * Returns the base URL of the backend API.
 */
const API_URL = import.meta.env.VITE_API_URL;

export function getApiUrl(): string {
  // Handle undefined or empty API_URL
  if (!API_URL) {
    console.warn('VITE_API_URL is not defined');
    // In production, we expect this to be defined via environment variables
    // In development, fallback to default
    if (import.meta.env.PROD) {
      return 'https://iamobil-gestor-imobili-rio.onrender.com'; // Production fallback
    }
    return 'http://localhost:10000'; // Development fallback
  }

  // Defensive check for common misconfigurations (like pasting a terminal command)
  if (API_URL && (API_URL.includes('npx') || API_URL.includes('vercel') || !API_URL.startsWith('http'))) {
    if (!API_URL.startsWith('/') && !API_URL.startsWith('http')) {
      console.error('CRITICAL: VITE_API_URL appears to be misconfigured:', API_URL);
      // Fallback to relative path to at least try the Vercel proxy
      if (!API_URL.startsWith('/') && !API_URL.startsWith('http')) {
        return ''; // Will make relative requests
      }
    }
  }
  return API_URL.replace(/\/$/, ''); // Remove trailing slash if present
}

export function compressImage(file: File, maxWidth = 800, quality = 0.6): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        
        const sizeKB = compressed.length / 1024;
        if (sizeKB > 500) {
          return compressImage(file, maxWidth * 0.7, quality - 0.1).then(resolve).catch(reject);
        }
        
        resolve(compressed);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export async function compressImages(files: File[], maxImages = 10): Promise<string[]> {
  const results: string[] = [];
  const limitedFiles = files.slice(0, maxImages);
  
  for (const file of limitedFiles) {
    try {
      const compressed = await compressImage(file);
      results.push(compressed);
    } catch (err) {
      console.error("Erro ao comprimir imagem:", err);
    }
  }
  
  return results;
}

/**
 * Resolves an image path to a full URL.
 * If the path is already a full URL (http/https) or a base64 data URI, it returns as-is.
 * If it's a relative path (e.g., /properties/img.jpg), prepends the API base URL.
 */
export function resolveImageUrl(path: string | undefined | null): string {
  if (!path) return '';
  if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const base = getApiUrl().replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
