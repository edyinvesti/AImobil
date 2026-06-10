// server/services/property.service.cjs
// Serviço de imóveis (CRUD)

const path = require('path');
const { NotFoundError, ValidationError } = require(path.join(__dirname, '..', 'utils', 'errors.cjs'));

const logger = require(path.join(__dirname, '..', 'utils', 'logger.cjs'));
const MAX_IMAGES = 10;

class PropertyService {
  constructor(dataEngine, storageService) {
    this.dataEngine = dataEngine;
    this.storageService = storageService;
  }

  async getAll() {
    return await this.dataEngine.getProperties();
  }

  async getById(id) {
    const property = await this.dataEngine.getPropertyById(id);
    if (!property) {
      throw new NotFoundError('Imóvel');
    }
    return property;
  }

  async create(propertyData) {
    // Validar limite de fotos
    const images = propertyData.images || [];
    if (Array.isArray(images) && images.length > MAX_IMAGES) {
      throw new ValidationError(`Máximo de ${MAX_IMAGES} fotos por imóvel`);
    }

    // Upload images to R2 if storage service is available
    if (this.storageService && this.storageService.configured) {
      const uploadedImages = [];
      
      for (const imageData of images) {
        if (imageData.startsWith('http')) {
          // Already a URL, keep as is
          uploadedImages.push(imageData);
        } else {
          // Upload base64 to R2
          const filename = `${propertyData.id || Date.now()}_${uploadedImages.length + 1}.jpg`;
          const result = await this.storageService.uploadBase64(imageData, filename);
          uploadedImages.push(result.url);
        }
      }
      
      propertyData.images = uploadedImages;
      
      // Upload thumbnail if exists
      if (propertyData.thumbnail && !propertyData.thumbnail.startsWith('http')) {
        const thumbResult = await this.storageService.uploadBase64(
          propertyData.thumbnail, 
          `${propertyData.id}_thumb.jpg`
        );
        propertyData.thumbnail = thumbResult.url;
      }
    }

    // Gerar ID se não fornecido
    if (!propertyData.id) {
      propertyData.id = `prop_${Date.now()}`;
    }

    await this.dataEngine.addProperty(propertyData);
    logger.info('Property created', { propertyId: propertyData.id });

    return { id: propertyData.id };
  }

  async update(id, propertyData) {
    const existing = await this.dataEngine.getPropertyById(id);
    if (!existing) {
      throw new NotFoundError('Imóvel');
    }

    // Validar limite de fotos
    const images = propertyData.images || [];
    if (Array.isArray(images) && images.length > MAX_IMAGES) {
      throw new ValidationError(`Máximo de ${MAX_IMAGES} fotos por imóvel`);
    }

    // Upload new images to R2 if storage service is available
    if (this.storageService && this.storageService.configured) {
      const uploadedImages = [];
      
      for (const imageData of images) {
        if (imageData.startsWith('http')) {
          // Already a URL, keep as is
          uploadedImages.push(imageData);
        } else {
          // Upload base64 to R2
          const filename = `${id}_${uploadedImages.length + 1}.jpg`;
          const result = await this.storageService.uploadBase64(imageData, filename);
          uploadedImages.push(result.url);
        }
      }
      
      propertyData.images = uploadedImages;
      
      // Upload thumbnail if exists and is new
      if (propertyData.thumbnail && !propertyData.thumbnail.startsWith('http')) {
        const thumbResult = await this.storageService.uploadBase64(
          propertyData.thumbnail, 
          `${id}_thumb.jpg`
        );
        propertyData.thumbnail = thumbResult.url;
      }
    }

    propertyData.id = id;
    await this.dataEngine.addProperty(propertyData);
    logger.info('Property updated', { propertyId: id });

    return { id };
  }

  async delete(id) {
    const existing = await this.dataEngine.getPropertyById(id);
    if (!existing) {
      throw new NotFoundError('Imóvel');
    }

    // Delete images from R2 if storage service is available
    if (this.storageService && this.storageService.configured) {
      try {
        const images = existing.images ? JSON.parse(existing.images) : [];
        for (const imageUrl of images) {
          const key = this.storageService.extractKeyFromUrl(imageUrl);
          if (key) {
            await this.storageService.delete(key);
          }
        }
      } catch (e) {
        logger.warn('Error deleting images from R2', { error: e.message });
      }
    }

    await this.dataEngine.deleteProperty(id);
    logger.info('Property deleted', { propertyId: id });

    return { success: true };
  }

  async getByBroker(brokerCreci) {
    const properties = await this.dataEngine.getProperties();
    return properties.filter(p => p.broker_creci === brokerCreci);
  }

  async search(filters = {}) {
    let properties = await this.dataEngine.getProperties();

    if (filters.city) {
      properties = properties.filter(p => 
        p.city?.toLowerCase().includes(filters.city.toLowerCase())
      );
    }

    if (filters.neighborhood) {
      properties = properties.filter(p => 
        p.neighborhood?.toLowerCase().includes(filters.neighborhood.toLowerCase())
      );
    }

    if (filters.minPrice) {
      properties = properties.filter(p => p.price >= filters.minPrice);
    }

    if (filters.maxPrice) {
      properties = properties.filter(p => p.price <= filters.maxPrice);
    }

    if (filters.bedrooms) {
      properties = properties.filter(p => p.bedrooms >= filters.bedrooms);
    }

    return properties;
  }
}

module.exports = PropertyService;
