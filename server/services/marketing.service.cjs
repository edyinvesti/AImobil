// server/services/marketing.service.cjs
// Serviço de marketing (refatorado de marketing-engine.cjs)

const path = require('path');
const logger = require(path.join(__dirname, '..', 'utils', 'logger'));

class MarketingService {
  constructor(dataEngine, marketingEngine) {
    this.dataEngine = dataEngine;
    this.marketingEngine = marketingEngine;
  }

  async criarCampanha(propertyId, options = {}) {
    try {
      const result = await this.marketingEngine.criarCampanha(propertyId, options);
      logger.info('Campanha criada', { propertyId, campaignId: result?.campaignId });
      return result;
    } catch (e) {
      logger.error('Erro ao criar campanha', { error: e.message });
      throw e;
    }
  }

  async postarNoInstagram(propertyId, options = {}) {
    try {
      const result = await this.marketingEngine.postarNoInstagram(propertyId, options);
      logger.info('Post Instagram criado', { propertyId, postId: result?.postId });
      return result;
    } catch (e) {
      logger.error('Erro ao postar no Instagram', { error: e.message });
      throw e;
    }
  }

  async deletarDoInstagram(postId) {
    try {
      const result = await this.marketingEngine.deletarDoInstagram(postId);
      logger.info('Post Instagram deletado', { postId });
      return result;
    } catch (e) {
      logger.error('Erro ao deletar do Instagram', { error: e.message });
      throw e;
    }
  }

  async getCampaigns() {
    return await this.dataEngine.getCampaigns();
  }

  async saveCampaign(campaign) {
    return await this.dataEngine.saveCampaign(campaign);
  }

  async deleteCampaign(id) {
    return await this.dataEngine.deleteCampaign(id);
  }

  async getStatus() {
    return {
      instagramConfigured: !!process.env.INSTAGRAM_ACCESS_TOKEN,
      metaAdsConfigured: !!process.env.META_ADS_ACCESS_TOKEN,
      geminiConfigured: !!process.env.GEMINI_API_KEY
    };
  }
}

module.exports = MarketingService;
