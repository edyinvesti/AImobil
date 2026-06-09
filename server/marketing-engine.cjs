const path = require('path');
const { DataEngine } = require(path.join(__dirname, 'data_engine.cjs'));

const META_ADS_TOKEN = process.env.META_ADS_ACCESS_TOKEN;
const META_ACCOUNT_ID = (process.env.META_ADS_AD_ACCOUNT_ID || '').replace(/^act_/, '');
const INSTAGRAM_BUSINESS_ID = process.env.INSTAGRAM_BUSINESS_ID;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const API_URL = process.env.VITE_API_URL || 'http://localhost:10002';
const FACEBOOK_GRAPH_URL = 'https://graph.facebook.com/v22.0';

const campaigns = new Map();

class MarketingEngine {
  constructor() {
    this.dataEngine = new DataEngine();
    this.logger = {
      info: (msg, data) => console.log(`[MarketingEngine] ${msg}`, data || ''),
      error: (msg, data) => console.error(`[MarketingEngine] ${msg}`, data || ''),
      warn: (msg, data) => console.warn(`[MarketingEngine] ${msg}`, data || '')
    };
  }

  async criarCampanha(propertyId, options = {}) {
    const budget = options.budget || 20;
    const campaignDays = options.campaignDays || 14;
    const includeOrganic = options.includeOrganic !== false;

    this.logger.info('Iniciando campanha', { propertyId, budget, campaignDays });

    try {
      const property = await this.dataEngine.getPropertyById(propertyId);
      if (!property) {
        return { success: false, error: 'Imóvel não encontrado' };
      }

      if (!property.images || property.images.length === 0) {
        return { success: false, error: 'Imóvel não possui fotos' };
      }

      this.logger.info('Dados do imóvel obtidos', { title: property.title });

      const criativos = await this.processarFotos(property);
      const copys = await this.gerarCopy(property);

      let campaignResult = null;
      if (META_ADS_TOKEN && META_ACCOUNT_ID) {
        campaignResult = await this.criarCampanhaMeta(property, criativos, copys, budget, campaignDays);
      } else {
        this.logger.warn('Meta Ads não configurado (META_ADS_ACCESS_TOKEN ausente)');
        campaignResult = { status: 'SKIPPED', reason: 'Meta Ads token não configurado' };
      }

      let instagramResult = null;
      if (includeOrganic && INSTAGRAM_BUSINESS_ID) {
        instagramResult = await this.publicarInstagram(property, criativos[0], copys[0]);
      } else if (includeOrganic) {
        this.logger.warn('Instagram Business ID não configurado');
        instagramResult = { status: 'SKIPPED', reason: 'Instagram Business ID não configurado' };
      }

      const result = {
        success: true,
        propertyId,
        propertyTitle: property.title,
        campaign: campaignResult,
        instagram: instagramResult,
        creatives: {
          total: criativos.length,
          formats: criativos.map(c => c.format)
        },
        copys: {
          generated: copys.length,
          headlines: copys.map(c => c.headline)
        },
        createdAt: Date.now()
      };

      const campaignId = `camp_${Date.now()}`;
      campaigns.set(campaignId, { ...result, status: 'ACTIVE' });
      campaigns.set(propertyId, { campaignId, status: 'ACTIVE' });

      this.logger.info('Campanha criada com sucesso', { campaignId });
      return result;

    } catch (error) {
      this.logger.error('Erro ao criar campanha', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  async processarFotos(property) {
    const imagens = property.images || [];
    const criativos = [];

    const formats = [
      { name: 'feed_square', width: 1080, height: 1080, format: '1:1' },
      { name: 'feed_vertical', width: 1080, height: 1350, format: '4:5' },
      { name: 'stories', width: 1080, height: 1920, format: '9:16' }
    ];

    for (let i = 0; i < Math.min(imagens.length, 5); i++) {
      for (const fmt of formats) {
        criativos.push({
          format: fmt.name,
          dimensions: `${fmt.width}x${fmt.height}`,
          aspectRatio: fmt.format,
          imageIndex: i,
          imageData: imagens[i].substring(0, 100) + '...[base64 truncated]',
          overlay: {
            price: property.price,
            title: property.title,
            location: `${property.neighborhood || ''}, ${property.city || ''}`
          }
        });
      }
    }

    this.logger.info('Criativos processados', { total: criativos.length });
    return criativos;
  }

  async gerarCopy(property) {
    const copys = [];

    const templates = [
      {
        headline: `${property.type} incrível em ${property.city || 'localização privilegiada'}`,
        primaryText: `${property.bedrooms} dormitórios, ${property.bathrooms} banheiros, ${property.size}${property.sizeUnit || 'm²'}. ${property.neighborhood ? `Localizado no ${property.neighborhood}.` : ''} Agende sua visita!`,
        description: `A partir de R$ ${Number(property.price).toLocaleString('pt-BR')}`,
        cta: 'Agende sua visita'
      },
      {
        headline: `O lar perfeito espera por você`,
        primaryText: `${property.title} — ${property.type} com ${property.bedrooms} quartos em ${property.city || 'região nobre'}. ${property.description ? property.description.substring(0, 80) : ''}`,
        description: `R$ ${Number(property.price).toLocaleString('pt-BR')}`,
        cta: 'Fale com o corretor'
      },
      {
        headline: `Não perca esta oportunidade`,
        primaryText: `${property.type} à venda em ${property.city || 'excelente localização'}. ${property.suites} suítes, vaga para ${property.parkingSpaces} carros.`,
        description: `Só R$ ${Number(property.price).toLocaleString('pt-BR')}`,
        cta: 'Saiba mais'
      }
    ];

    if (GEMINI_API_KEY) {
      try {
        const prompt = `Gere 3 headlines persuasivas para anunciar este imóvel no Facebook e Instagram:
          Tipo: ${property.type}
          Título: ${property.title}
          Preço: R$ ${property.price}
          Cidade: ${property.city}
          Bairro: ${property.neighborhood}
          Quartos: ${property.bedrooms}
          Banheiros: ${property.bathrooms}
          Área: ${property.size}${property.sizeUnit}
          Descrição: ${property.description || ''}

          Regras:
          - Headline máxima 40 caracteres
          - Tom persuasivo e profissional
          - Português brasileiro
          - Incluir localização
          - Retorne apenas as 3 headlines, uma por linha`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 200 }
            })
          }
        );

        const data = await response.json();
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
          const geminiHeadlines = data.candidates[0].content.parts[0].text
            .split('\n')
            .filter(h => h.trim().length > 0)
            .slice(0, 3);

          geminiHeadlines.forEach((headline, i) => {
            if (templates[i]) {
              templates[i].headline = headline.replace(/^\d+[\.\-\)]\s*/, '');
            }
          });
        }
      } catch (e) {
        this.logger.warn('Erro ao gerar copy com Gemini, usando templates', { error: e.message });
      }
    }

    return templates;
  }

  async criarCampanhaMeta(property, criativos, copys, budget, days) {
    try {
      const campaignName = `IAmobil - ${property.type} - ${property.city || 'Sem cidade'} - ${Date.now()}`;

      const campaignResponse = await fetch(
        `${FACEBOOK_GRAPH_URL}/act_${META_ACCOUNT_ID}/campaigns`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: campaignName,
            objective: 'OUTCOME_TRAFFIC',
            status: 'PAUSED',
            access_token: META_ADS_TOKEN,
            special_ad_categories: 'HOUSING',
            is_adset_budget_sharing_enabled: false
          })
        }
      );

      const campaignData = await campaignResponse.json();

      if (campaignData.error) {
        this.logger.error('Erro Meta Ads ao criar campanha', { error: campaignData.error });
        return { status: 'ERROR', error: campaignData.error.message, apiResponse: campaignData };
      }

      const campaignId = campaignData.id;

      const pageId = process.env.META_FACEBOOK_PAGE_ID;

      const geoLocations = { countries: ['BR'] };
      if (property.latitude && property.longitude) {
        geoLocations.custom_locations = [
          { latitude: property.latitude, longitude: property.longitude, radius: 10, distance_unit: 'km' }
        ];
        geoLocations.location_types = ['home', 'recent'];
        delete geoLocations.countries;
      }

      const adsetBody = {
        name: `${property.neighborhood || property.city || 'Região'} - ${property.type}`,
        campaign_id: campaignId,
        daily_budget: Math.round(budget * 100),
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'LINK_CLICKS',
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        targeting: {
          geo_locations: geoLocations,
          age_min: 22,
          age_max: 60
        },
        status: 'PAUSED',
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + days * 86400000).toISOString(),
        access_token: META_ADS_TOKEN
      };
      if (pageId) adsetBody.promoted_object = { page_id: pageId };

      const adsetResponse = await fetch(
        `${FACEBOOK_GRAPH_URL}/act_${META_ACCOUNT_ID}/adsets`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(adsetBody) }
      );

      const adsetData = await adsetResponse.json();
      if (adsetData.error) {
        return { status: 'PARTIAL', campaignId, error: adsetData.error.message, campaign: { id: campaignId, name: campaignName } };
      }

      const adsetId = adsetData.id;
      if (!pageId) {
        this.logger.info('Campanha criada sem page_id. Configure META_FACEBOOK_PAGE_ID para criar anúncios.');
        return { status: 'NO_PAGE', campaignId, name: campaignName, adsetId, dailyBudget: budget, duration: days, message: 'Conjunto criado. Configure META_FACEBOOK_PAGE_ID no .env para gerar os anúncios.' };
      }

      const creativeResponse = await fetch(
        `${FACEBOOK_GRAPH_URL}/act_${META_ACCOUNT_ID}/adcreatives`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `Criativo - ${property.type} - Feed`,
            object_story_spec: {
              page_id: pageId,
              link_data: {
                link: `${API_URL}/imovel/${property.id}?utm_source=facebook&utm_medium=ads&utm_campaign=${campaignId}`,
                message: copys[0]?.primaryText || property.description || '',
                name: copys[0]?.headline || property.title,
                description: copys[0]?.description || `R$ ${Number(property.price).toLocaleString('pt-BR')}`,
                call_to_action: { type: 'LEARN_MORE' }
              }
            },
            access_token: META_ADS_TOKEN
          })
        }
      );

      const creativeData = await creativeResponse.json();

      const adResponse = await fetch(
        `${FACEBOOK_GRAPH_URL}/act_${META_ACCOUNT_ID}/ads`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `Anúncio - ${property.type} - ${property.city || ''}`,
            adset_id: adsetId,
            creative: { creative_id: creativeData.id },
            status: 'ACTIVE',
            access_token: META_ADS_TOKEN
          })
        }
      );

      const adData = await adResponse.json();

      this.logger.info('Campanha Meta Ads completa criada', { campaignId, adsetId, adId: adData.id, dailyBudget: budget, days });

      return {
        status: 'ACTIVE',
        id: campaignId,
        name: campaignName,
        dailyBudget: budget,
        duration: days,
        adsetId,
        adId: adData.id,
        creativeId: creativeData.id,
        targeting: `${property.neighborhood || property.city || 'Raio 10km'}`
      };

    } catch (error) {
      this.logger.error('Erro ao criar campanha Meta Ads', { error: error.message });
      return { status: 'ERROR', error: error.message };
    }
  }

  async publicarInstagram(property, criativo, copy) {
    try {
      if (!INSTAGRAM_BUSINESS_ID) {
        return { status: 'SKIPPED', reason: 'INSTAGRAM_BUSINESS_ID não configurado' };
      }

      const legenda =
        `✨ ${copy?.headline || property.title}\n\n` +
        `${copy?.primaryText || property.description || ''}\n\n` +
        `💰 ${copy?.description || `R$ ${Number(property.price).toLocaleString('pt-BR')}`}\n\n` +
        `📍 ${property.neighborhood || ''}, ${property.city || ''}\n\n` +
        `📞 Fale com o corretor!\n\n` +
        `. . . . .\n\n` +
        `#iamobil #imoveis #${property.city ? property.city.toLowerCase().replace(/\s/g, '') : 'imovel'} ` +
        `#${property.type ? property.type.toLowerCase() : 'imovel'} ` +
        `#corretordeimoveis #${property.neighborhood ? property.neighborhood.toLowerCase().replace(/\s/g, '') : 'imovel'}`;

      const creationResponse = await fetch(
        `${FACEBOOK_GRAPH_URL}/${INSTAGRAM_BUSINESS_ID}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: criativo?.imageUrl || '',
            caption: legenda,
            access_token: META_ADS_TOKEN
          })
        }
      );

      const creationData = await creationResponse.json();

      if (creationData.error) {
        this.logger.warn('Erro ao criar media no Instagram', { error: creationData.error });
        return { status: 'DRAFT', error: creationData.error.message, apiResponse: creationData };
      }

      const publishResponse = await fetch(
        `${FACEBOOK_GRAPH_URL}/${INSTAGRAM_BUSINESS_ID}/media_publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creation_id: creationData.id,
            access_token: META_ADS_TOKEN
          })
        }
      );

      const publishData = await publishResponse.json();

      this.logger.info('Post Instagram publicado', { mediaId: creationData.id });

      return {
        status: 'PUBLISHED',
        postId: creationData.id,
        url: `https://instagram.com/p/${publishData.id || creationData.id}`,
        caption: legenda.substring(0, 100)
      };

    } catch (error) {
      this.logger.error('Erro ao publicar no Instagram', { error: error.message });
      return { status: 'ERROR', error: error.message };
    }
  }

  getCampaignStatus(propertyId) {
    return campaigns.get(propertyId) || null;
  }

  listActiveCampaigns() {
    const active = [];
    campaigns.forEach((value, key) => {
      if (value.status === 'ACTIVE' || value.campaign?.status === 'ACTIVE') {
        active.push({ key, ...value });
      }
    });
    return active;
  }

  getStatus() {
    return {
      metaAdsConfigured: !!META_ADS_TOKEN && !!META_ACCOUNT_ID,
      facebookPageConfigured: !!process.env.META_FACEBOOK_PAGE_ID,
      instagramConfigured: !!INSTAGRAM_BUSINESS_ID,
      geminiConfigured: !!GEMINI_API_KEY,
      activeCampaigns: this.listActiveCampaigns().length,
      totalCampaigns: campaigns.size
    };
  }
}

module.exports = { MarketingEngine };
