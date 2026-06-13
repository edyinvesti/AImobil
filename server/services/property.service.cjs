// server/services/property.service.cjs
// Serviço de imóveis (CRUD)

const path = require('path');
const { NotFoundError, ValidationError } = require(path.join(__dirname, '..', 'utils', 'errors.cjs'));

const logger = require(path.join(__dirname, '..', 'utils', 'logger.cjs'));
const MAX_IMAGES = 10;

class PropertyService {
  constructor(dataEngine) {
    this.dataEngine = dataEngine;
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
    const images = propertyData.images || [];
    if (Array.isArray(images) && images.length > MAX_IMAGES) {
      throw new ValidationError(`Máximo de ${MAX_IMAGES} fotos por imóvel`);
    }

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

    const images = propertyData.images || [];
    if (Array.isArray(images) && images.length > MAX_IMAGES) {
      throw new ValidationError(`Máximo de ${MAX_IMAGES} fotos por imóvel`);
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

    await this.dataEngine.deleteProperty(id);
    logger.info('Property deleted', { propertyId: id });

    return { success: true };
  }

  async getByBroker(brokerLogin) {
    const properties = await this.dataEngine.getProperties();
    return properties.filter(p => p.brokerLogin === brokerLogin || p.broker_login === brokerLogin);
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
