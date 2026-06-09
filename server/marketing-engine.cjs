const path = require('path');
const { DataEngine } = require(path.join(__dirname, 'data_engine.cjs'));

const META_ADS_TOKEN = process.env.META_ADS_ACCESS_TOKEN;
const META_ACCOUNT_ID = (process.env.META_ADS_AD_ACCOUNT_ID || '').replace(/^act_/, '');
const INSTAGRAM_BUSINESS_ID = process.env.INSTAGRAM_BUSINESS_ID;
const INSTAGRAM_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN || META_ADS_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID;

const API_URL = process.env.VITE_API_URL || 'http://localhost:10000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://iamobil-frontend.pages.dev';
const FACEBOOK_GRAPH_URL = 'https://graph.facebook.com/v22.0';

const campaigns = new Map();

function stripBase64Prefix(data) {
  return data.replace(/^data:image\/\w+;base64,/, '');
}

class MarketingEngine {
  constructor() {
    this.dataEngine = new DataEngine();
    this.logger = {
      info: (msg, data) => console.log(`[MarketingEngine] ${msg}`, data || ''),
      error: (msg, data) => console.error(`[MarketingEngine] ${msg}`, data || ''),
      warn: (msg, data) => console.warn(`[MarketingEngine] ${msg}`, data || '')
    };
  }

  async uploadToFacebookAdimages(base64Data) {
    const bytes = stripBase64Prefix(base64Data);

    const params = new URLSearchParams();
    params.append('bytes', bytes);
    params.append('access_token', META_ADS_TOKEN);

    const res = await fetch(
      `${FACEBOOK_GRAPH_URL}/act_${META_ACCOUNT_ID}/adimages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      }
    );

    const data = await res.json();
    if (data.error) {
      throw new Error(`Facebook adimages error: ${data.error.message}`);
    }

    const images = Object.values(data.images);
    if (!images.length) {
      throw new Error('Facebook adimages retornou resposta vazia');
    }

    return { hash: images[0].hash, url: images[0].url };
  }

  async uploadToImgur(base64Data) {
    if (!IMGUR_CLIENT_ID) return null;

    const bytes = stripBase64Prefix(base64Data);

    try {
      const res = await fetch('https://api.imgur.com/3/image', {
        method: 'POST',
        headers: {
          'Authorization': `Client-ID ${IMGUR_CLIENT_ID}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image: bytes, type: 'base64' })
      });

      const data = await res.json();
      if (data.success && data.data?.link) {
        return data.data.link;
      }
      this.logger.warn('Imgur upload failed', { error: data.data?.error });
      return null;
    } catch (e) {
      this.logger.warn('Imgur upload error', { error: e.message });
      return null;
    }
  }

  async criarCampanha(propertyId, options = {}) {
    const budget = options.budget || 20;
    const campaignDays = options.campaignDays || 14;
    const includeOrganic = options.includeOrganic !== false;
    const includeAds = options.includeAds !== false;

    this.logger.info('Iniciando campanha', { propertyId, budget, campaignDays, includeOrganic, includeAds });

    try {
      const property = await this.dataEngine.getPropertyById(propertyId);
      if (!property) {
        return { success: false, error: 'Imóvel não encontrado' };
      }

      if (!property.images || property.images.length === 0) {
        return { success: false, error: 'Imóvel não possui fotos' };
      }

      this.logger.info('Dados do imóvel obtidos', { title: property.title, imagesCount: property.images.length });

      const criativos = this.processarFotos(property);
      const copys = await this.gerarCopy(property);

      // Upload da primeira imagem para o Facebook (adimages)
      let fbImage = null;
      if (includeAds && META_ADS_TOKEN && META_ACCOUNT_ID && property.images[0]) {
        try {
          fbImage = await this.uploadToFacebookAdimages(property.images[0]);
          this.logger.info('Imagem enviada ao Facebook', { hash: fbImage.hash });
        } catch (e) {
          this.logger.error('Falha ao enviar imagem para Facebook', { error: e.message });
        }
      }

      // Gera URL pública da imagem via endpoint próprio
      let publicImageUrl = fbImage?.url || null;
      if (!publicImageUrl && property.images[0]) {
        publicImageUrl = `https://aimobil.onrender.com/api/properties/${property.id}/image`;
      }

      let campaignResult = null;
      if (includeAds && META_ADS_TOKEN && META_ACCOUNT_ID) {
        campaignResult = await this.criarCampanhaMeta(property, criativos, copys, budget, campaignDays, fbImage?.hash);
      } else if (!includeAds) {
        this.logger.info('Meta Ads desabilitado via includeAds=false');
        campaignResult = { status: 'SKIPPED', reason: 'Anúncios pagos desabilitados pelo corretor' };
      } else {
        this.logger.warn('Meta Ads não configurado (META_ADS_ACCESS_TOKEN ausente)');
        campaignResult = { status: 'SKIPPED', reason: 'Meta Ads token não configurado' };
      }

      let instagramResult = null;
      if (includeOrganic && INSTAGRAM_BUSINESS_ID) {
        instagramResult = await this.publicarInstagram(property, criativos[0], copys[0], publicImageUrl);
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

  processarFotos(property) {
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

    const limit = (s, n) => s ? s.substring(0, n) : '';

    const templates = [
      {
        headline: limit(`${property.type} em ${property.city || 'localização'}`, 25),
        primaryText: limit(`${property.bedrooms} dorm, ${property.bathrooms} ban, ${property.size}${property.sizeUnit || 'm²'}. ${property.neighborhood ? `Bairro ${property.neighborhood}.` : ''} Agende sua visita!`, 125),
        description: `R$ ${Number(property.price).toLocaleString('pt-BR')}`,
        cta: 'Agende sua visita'
      },
      {
        headline: limit(`O lar perfeito espera`, 25),
        primaryText: limit(`${property.title} — ${property.type} em ${property.city || 'região nobre'}. ${property.description ? property.description.substring(0, 60) : ''}`, 125),
        description: `R$ ${Number(property.price).toLocaleString('pt-BR')}`,
        cta: 'Fale com o corretor'
      },
      {
        headline: limit(`Não perca! ${property.type}`, 25),
        primaryText: limit(`${property.type} à venda em ${property.city || 'excelente localização'}. ${property.suites} suítes, ${property.parkingSpaces} vagas.`, 125),
        description: `R$ ${Number(property.price).toLocaleString('pt-BR')}`,
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
          - Headline máxima 25 caracteres (limite do Facebook)
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
              templates[i].headline = limit(headline.replace(/^\d+[\.\-\)]\s*/, ''), 25);
            }
          });
        }
      } catch (e) {
        this.logger.warn('Erro ao gerar copy com Gemini, usando templates', { error: e.message });
      }
    }

    return templates;
  }

  async criarCampanhaMeta(property, criativos, copys, budget, days, imageHash) {
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

      // Criar criativo — testa sem image_hash (igual ao original que funcionava)
      let creativeId = null;

      const spec = {
        name: `Criativo - ${property.type} - Feed`,
        object_story_spec: {
          page_id: pageId,
          link_data: {
            link: `${FRONTEND_URL}`,
            message: 'Confira este imóvel incrível!',
            name: 'Apartamento incrível',
            description: 'Ótima oportunidade',
            call_to_action: { type: 'LEARN_MORE' }
          }
        },
        access_token: META_ADS_TOKEN
      };

      const res = await fetch(`${FACEBOOK_GRAPH_URL}/act_${META_ACCOUNT_ID}/adcreatives`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(spec) });
      const data = await res.json();
      if (!data.error) { creativeId = data.id; }
      else {
        this.logger.warn('Creative falhou', { error: data.error, full: JSON.stringify(data), spec: JSON.stringify(spec).substring(0, 400) });
        return { status: 'PARTIAL', campaignId, adsetId, error: `Erro: ${data.error.message}`, fbResponse: data.error, specEnviado: JSON.stringify(spec).substring(0, 500) };
      }

      if (!creativeId) {
        return { status: 'PARTIAL', campaignId, adsetId, error: 'Erro ao criar criativo' };
      }

      const adResponse = await fetch(
        `${FACEBOOK_GRAPH_URL}/act_${META_ACCOUNT_ID}/ads`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `Anúncio - ${property.type} - ${property.city || ''}`,
            adset_id: adsetId,
            creative: { creative_id: creativeId },
            status: 'ACTIVE',
            access_token: META_ADS_TOKEN
          })
        }
      );

      const adData = await adResponse.json();

      this.logger.info('Campanha Meta Ads completa criada', { campaignId, adsetId, adId: adData.id, hasImage: !!imageHash, dailyBudget: budget, days });

      const result = {
        status: 'ACTIVE',
        id: campaignId,
        name: campaignName,
        dailyBudget: budget,
        duration: days,
        adsetId,
        adId: adData.id,
        creativeId,
        hasImage: !!imageHash,
        targeting: `${property.neighborhood || property.city || 'Raio 10km'}`
      };

      if (adData.error) {
        result.status = 'PARTIAL';
        result.error = adData.error.message;
      }

      return result;

    } catch (error) {
      this.logger.error('Erro ao criar campanha Meta Ads', { error: error.message });
      return { status: 'ERROR', error: error.message };
    }
  }

  async publicarInstagram(property, criativo, copy, imageUrl) {
    try {
      if (!INSTAGRAM_BUSINESS_ID) {
        return { status: 'SKIPPED', reason: 'INSTAGRAM_BUSINESS_ID não configurado' };
      }

      if (!imageUrl) {
        return { status: 'SKIPPED', reason: 'Nenhuma URL de imagem disponível. Configure IMGUR_CLIENT_ID no .env ou certifique-se que o Meta Ads está ativo para gerar URL pública.' };
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

      this.logger.info('Publicando no Instagram', { imageUrl: imageUrl.substring(0, 60) + '...' });

      const creationResponse = await fetch(
        `${FACEBOOK_GRAPH_URL}/${INSTAGRAM_BUSINESS_ID}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: imageUrl,
            caption: legenda,
            access_token: INSTAGRAM_TOKEN
          })
        }
      );

      const creationData = await creationResponse.json();

      if (creationData.error) {
        this.logger.warn('Erro ao criar media no Instagram', { error: creationData.error });
        return { status: 'DRAFT', error: creationData.error.message, apiResponse: creationData };
      }

      // Aguarda processamento da mídia
      await new Promise(r => setTimeout(r, 3000));

      const publishResponse = await fetch(
        `${FACEBOOK_GRAPH_URL}/${INSTAGRAM_BUSINESS_ID}/media_publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creation_id: creationData.id,
            access_token: INSTAGRAM_TOKEN
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
      instagramConfigured: !!INSTAGRAM_BUSINESS_ID && !!INSTAGRAM_TOKEN,
      geminiConfigured: !!GEMINI_API_KEY,
      imgurConfigured: !!IMGUR_CLIENT_ID,
      activeCampaigns: this.listActiveCampaigns().length,
      totalCampaigns: campaigns.size
    };
  }
}

module.exports = { MarketingEngine };
