// server/services/storage.service.cjs
// Serviço de armazenamento com Cloudflare R2

const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const path = require('path');
const logger = require(path.join(__dirname, '..', 'utils', 'logger.cjs'));

class StorageService {
  constructor() {
    this.client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
    this.bucket = process.env.R2_BUCKET_NAME || 'iamobil-images';
    this.publicUrl = process.env.R2_PUBLIC_URL || '';
    this.configured = !!(process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY);
  }

  generateKey(filename, folder = 'properties') {
    const ext = path.extname(filename);
    const hash = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    return `${folder}/${timestamp}-${hash}${ext}`;
  }

  async upload(buffer, filename, contentType, folder = 'properties') {
    if (!this.configured) {
      logger.warn('R2 not configured, using fallback');
      return this.fallbackUpload(buffer, filename, contentType);
    }

    try {
      const key = this.generateKey(filename, folder);
      
      await this.client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: {
          originalName: filename,
          uploadedAt: new Date().toISOString()
        }
      }));

      const url = `${this.publicUrl}/${key}`;
      logger.info('Image uploaded to R2', { key, url });
      
      return { key, url };
    } catch (e) {
      logger.error('R2 upload error', { error: e.message });
      throw e;
    }
  }

  async uploadBase64(base64Data, filename, folder = 'properties') {
    // Remove data URL prefix if present
    const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Clean, 'base64');
    
    // Detect content type
    const ext = path.extname(filename).toLowerCase();
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    const contentType = contentTypes[ext] || 'image/jpeg';
    
    return this.upload(buffer, filename, contentType, folder);
  }

  async delete(key) {
    if (!this.configured) {
      logger.warn('R2 not configured, skip delete');
      return { success: true };
    }

    try {
      await this.client.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      }));
      
      logger.info('Image deleted from R2', { key });
      return { success: true };
    } catch (e) {
      logger.error('R2 delete error', { error: e.message });
      throw e;
    }
  }

  async getSignedUrl(key, expiresIn = 3600) {
    if (!this.configured) {
      return `${this.publicUrl}/${key}`;
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      });
      
      const url = await getSignedUrl(this.client, command, { expiresIn });
      return url;
    } catch (e) {
      logger.error('R2 signed URL error', { error: e.message });
      throw e;
    }
  }

  // Fallback: return base64 as data URL (for development without R2)
  fallbackUpload(buffer, filename, contentType) {
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${contentType};base64,${base64}`;
    logger.info('Using fallback upload (base64)', { filename });
    return { key: filename, url: dataUrl };
  }

  // Extract key from R2 URL
  extractKeyFromUrl(url) {
    if (!url || !url.includes(this.publicUrl)) {
      return null;
    }
    return url.replace(`${this.publicUrl}/`, '');
  }

  // Check if URL is R2 URL
  isR2Url(url) {
    return url && url.startsWith(this.publicUrl);
  }

  getStatus() {
    return {
      configured: this.configured,
      bucket: this.bucket,
      publicUrl: this.publicUrl
    };
  }
}

module.exports = StorageService;
