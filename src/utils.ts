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
      return 'https://aimobil.onrender.com'; // Production fallback
    }
    return 'http://localhost:10002'; // Development fallback
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

function autoEnhance(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const len = data.length;

  // 1. Auto-levels: calcular histograma e esticar
  let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
  for (let i = 0; i < len; i += 4) {
    if (data[i] < minR) minR = data[i];
    if (data[i] > maxR) maxR = data[i];
    if (data[i + 1] < minG) minG = data[i + 1];
    if (data[i + 1] > maxG) maxG = data[i + 1];
    if (data[i + 2] < minB) minB = data[i + 2];
    if (data[i + 2] > maxB) maxB = data[i + 2];
  }

  const rangeR = maxR - minR || 1;
  const rangeG = maxG - minG || 1;
  const rangeB = maxB - minB || 1;

  // 2. Aplicar correção + saturação + nitidez (kernel sharpen)
  const factor = 1.15; // saturação
  const sharpen = [
    0, -0.3, 0,
    -0.3, 2.2, -0.3,
    0, -0.3, 0
  ];

  const original = new Uint8ClampedArray(data);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;

      // Auto-levels + brilho
      let r = ((original[idx] - minR) / rangeR) * 255;
      let g = ((original[idx + 1] - minG) / rangeG) * 255;
      let b = ((original[idx + 2] - minB) / rangeB) * 255;

      // Saturação
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = r + (r - gray) * (factor - 1);
      g = g + (g - gray) * (factor - 1);
      b = b + (b - gray) * (factor - 1);

      // Sharpening
      let sr = 0, sg = 0, sb = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const kidx = ((y + ky) * width + (x + kx)) * 4;
          const k = sharpen[(ky + 1) * 3 + (kx + 1)];
          sr += original[kidx] * k;
          sg += original[kidx + 1] * k;
          sb += original[kidx + 2] * k;
        }
      }
      r += sr; g += sg; b += sb;

      data[idx] = Math.max(0, Math.min(255, r));
      data[idx + 1] = Math.max(0, Math.min(255, g));
      data[idx + 2] = Math.max(0, Math.min(255, b));
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

export function compressImage(file: File, maxWidth = 800, quality = 0.6, depth = 0): Promise<string> {
  if (depth > 5) {
    return compressImageFallback(file, maxWidth);
  }
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

        // Auto-enhance: corrige brilho, contraste, saturação e nitidez
        try {
          autoEnhance(ctx, width, height);
        } catch (e) {
          console.warn('Auto-enhance falhou, usando imagem original', e);
        }

        const compressed = canvas.toDataURL('image/jpeg', quality);
        
        const sizeKB = compressed.length / 1024;
        if (sizeKB > 500) {
          return compressImage(file, maxWidth * 0.7, quality - 0.1, depth + 1).then(resolve).catch(reject);
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

function compressImageFallback(file: File, maxWidth: number): Promise<string> {
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
        if (!ctx) { reject(new Error('Could not get canvas context')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.3));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function compressThumbnail(file: File, maxWidth = 200, quality = 0.2): Promise<string> {
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
        if (!ctx) { reject(new Error('Could not get canvas context')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
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
