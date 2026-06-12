const path = require('path');
const { getDataEngine } = require(path.join(__dirname, 'db/index.cjs'));

const META_ADS_TOKEN = process.env.META_ADS_ACCESS_TOKEN;
const META_ACCOUNT_ID = (process.env.META_ADS_AD_ACCOUNT_ID || '').replace(/^act_/, '');
const INSTAGRAM_BUSINESS_ID = process.env.INSTAGRAM_BUSINESS_ID;
const INSTAGRAM_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN || META_ADS_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID;

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://aimobil.onrender.com';
const API_URL = (process.env.VITE_API_URL || FRONTEND_URL || 'http://localhost:10002').replace(/\/$/, '');
const FACEBOOK_GRAPH_URL = 'https://graph.facebook.com/v22.0';

const campaigns = new Map();

function stripBase64Prefix(data) {
  return data.replace(/^data:image\/\w+;base64,/, '');
}

class MarketingEngine {
  constructor(cloudinaryInstance = null) {
    this.dataEngine = null;
    this.cloudinary = cloudinaryInstance;
    this.logger = {
      info: (msg, data) => console.log(`[MarketingEngine] ${msg}`, data || ''),
      error: (msg, data) => console.error(`[MarketingEngine] ${msg}`, data || ''),
      warn: (msg, data) => console.warn(`[MarketingEngine] ${msg}`, data || '')
    };
  }

  async getDataEngine() {
    if (!this.dataEngine) {
      this.dataEngine = await getDataEngine();
    }
    return this.dataEngine;
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

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Facebook adimages HTTP ${res.status}: ${errorText.substring(0, 200)}`);
    }

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
    const includeStories = options.includeStories !== false;
    const includeAds = options.includeAds !== false;

    this.logger.info('Iniciando campanha', { propertyId, budget, campaignDays, includeOrganic, includeAds });

    try {
      const property = await (await this.getDataEngine()).getPropertyById(propertyId);
      if (!property) {
        return { success: false, error: 'Imóvel não encontrado' };
      }

      let videoUrl = property.videoUrl || property.video_url || null;

      // Se tem video_data (base64) mas não tem video_url, faz upload pro Cloudinary
      if (!videoUrl && property.videoData) {
        try {
          this.logger.info('Fazendo upload de video_data para Cloudinary...');
          const base64 = property.videoData.toString().replace(/^data:video\/\w+;base64,/, '');
          const buffer = Buffer.from(base64, 'base64');
          videoUrl = await new Promise((resolve, reject) => {
            const stream = this.cloudinary.uploader.upload_stream({
              resource_type: 'video',
              folder: 'aimobil',
              public_id: `property_${property.id}`,
              overwrite: true,
              format: 'mp4'
            }, (error, result) => {
              if (error) reject(error);
              else resolve(result.secure_url);
            });
            stream.end(buffer);
          });
          await (await this.getDataEngine()).updatePropertyVideo(property.id, videoUrl);
          this.logger.info('Video base64 enviado ao Cloudinary', { videoUrl });
        } catch (e) {
          this.logger.warn('Falha ao fazer upload de video_data para Cloudinary', { error: e.message });
        }
      }

      const hasVideo = videoUrl && videoUrl.startsWith('http');

      if (!hasVideo && (!property.images || property.images.length === 0)) {
        return { success: false, error: 'Imóvel não possui fotos nem vídeo para publicar' };
      }

      this.logger.info('Dados do imóvel obtidos', { title: property.title, imagesCount: property.images?.length || 0, hasVideo });

      let broker = null;
      const brokerLogin = property.brokerLogin || property.broker_login || '';
      if (brokerLogin) {
        try {
          const user = await (await this.getDataEngine()).validateBroker(brokerLogin);
          if (user) {
            broker = { name: user.name, phone: user.phone, email: user.email, photo: user.photo };
          }
        } catch (e) {
          this.logger.warn('Erro ao buscar dados do corretor', { error: e.message });
        }
      }

      const copys = await this.gerarCopy(property, broker);

      let criativos = [];
      let fbImage = null;

      let publicImageUrl = null;

      if (!hasVideo) {
        criativos = this.processarFotos(property);

        if (includeAds && META_ADS_TOKEN && META_ACCOUNT_ID && property.images?.[0]) {
          try {
            fbImage = await this.uploadToFacebookAdimages(property.images[0]);
            this.logger.info('Imagem enviada ao Facebook', { hash: fbImage.hash });
          } catch (e) {
            this.logger.error('Falha ao enviar imagem para Facebook', { error: e.message });
          }
        }

        publicImageUrl = fbImage?.url || null;
        if (!publicImageUrl && property.images?.[0]) {
          publicImageUrl = `${API_URL}/api/properties/${property.id}/image`;
        }
      }

      let campaignResult = null;
      if (criativos.length > 0 && includeAds && META_ADS_TOKEN && META_ACCOUNT_ID) {
        campaignResult = await this.criarCampanhaMeta(property, criativos, copys, budget, campaignDays, fbImage?.hash);
      } else if (!includeAds) {
        this.logger.info('Meta Ads desabilitado via includeAds=false');
        campaignResult = { status: 'SKIPPED', reason: 'Anúncios pagos desabilitados pelo corretor' };
      } else if (!criativos.length) {
        this.logger.info('Meta Ads desabilitado (sem fotos para anúncio)');
        campaignResult = { status: 'SKIPPED', reason: 'Sem fotos para criar anúncio no Meta Ads' };
      } else {
        this.logger.warn('Meta Ads não configurado (META_ADS_ACCESS_TOKEN ausente)');
        campaignResult = { status: 'SKIPPED', reason: 'Meta Ads token não configurado' };
      }

      let instagramResult = null;
      let storyResult = null;
      if (includeOrganic && INSTAGRAM_BUSINESS_ID) {
        if (hasVideo) {
          this.logger.info('Publicando Reels com vídeo do Cloudinary', { videoUrl });
          instagramResult = await this.publicarInstagramReel(property, copys[0], videoUrl);
        } else if (publicImageUrl) {
          const imageUrls = [publicImageUrl];
          for (let i = 1; i < Math.min(property.images?.length || 1, 10); i++) {
            imageUrls.push(`${API_URL}/api/properties/${property.id}/image?index=${i}`);
          }
          instagramResult = await this.publicarInstagram(property, copys[0], imageUrls);
        } else {
          this.logger.warn('Nenhuma mídia disponível para Instagram');
          instagramResult = { status: 'SKIPPED', reason: 'Nenhuma mídia disponível' };
        }
      } else if (includeOrganic) {
        this.logger.warn('Instagram Business ID não configurado');
        instagramResult = { status: 'SKIPPED', reason: 'Instagram Business ID não configurado' };
      } else {
        this.logger.info('Postagem orgânica (Feed/Reels) desabilitada pelo usuário');
        instagramResult = { status: 'SKIPPED', reason: 'Postagem no Feed desativada na interface' };
      }

      // Stories (independente do feed — pode postar só Story mesmo sem feed)
      if (includeStories && INSTAGRAM_BUSINESS_ID) {
        if (hasVideo && videoUrl) {
          this.logger.info('Publicando Story com vídeo...');
          storyResult = await this.publicarInstagramStory(property, copys[0], videoUrl, 'video');
        } else if (publicImageUrl) {
          this.logger.info('Publicando Story com foto...');
          storyResult = await this.publicarInstagramStory(property, copys[0], publicImageUrl, 'image');
        } else {
          this.logger.warn('Nenhuma mídia disponível para Story');
        }
      }

      const result = {
        success: true,
        propertyId,
        propertyTitle: property.title,
        campaign: campaignResult,
        instagram: instagramResult,
        story: storyResult,
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

      // Calcula a legenda final e mídia para salvar no draft
      const mainCopy = copys[0];
      const draftCaption = mainCopy
        ? `${mainCopy.headline || property.title}\n\n${mainCopy.primaryText || ''}\n\n💰 ${mainCopy.description || `R$ ${Number(property.price).toLocaleString('pt-BR')}`}\n${mainCopy.whatsapp ? `📱 ${mainCopy.whatsapp}\n` : ''}${mainCopy.engagement ? `\n💭 ${mainCopy.engagement}\n` : ''}\n${(mainCopy.hashtags || []).map(t => `#${t}`).join(' ')}`.trim()
        : '';

      const draftMediaUrls = hasVideo
        ? [videoUrl]
        : [publicImageUrl, ...Array.from({ length: Math.min((property.images?.length || 1) - 1, 9) }, (_, i) => `${API_URL}/api/properties/${property.id}/image?index=${i + 1}`)].filter(Boolean);

      const campaignId = `camp_${Date.now()}`;
      campaigns.set(campaignId, { ...result, status: 'WAITING_APPROVAL' });
      campaigns.set(propertyId, { campaignId, status: 'WAITING_APPROVAL' });

      // Salva no banco como AGUARDANDO APROVAÇÃO (draft)
      try {
        await (await this.getDataEngine()).saveCampaign({
          id: campaignId,
          property_id: propertyId,
          property_title: property.title || '',
          instagram_status: 'WAITING_APPROVAL',
          instagram_post_id: '',
          instagram_url: '',
          campaign_status: campaignResult?.status || 'SKIPPED',
          campaign_id: campaignResult?.id || '',
          has_carousel: draftMediaUrls.length > 1,
          created_at: Date.now(),
          ai_copy: draftCaption,
          media_urls: draftMediaUrls,
          is_video: hasVideo ? 1 : 0
        });
      } catch (dbErr) {
        this.logger.warn('Erro ao salvar campanha draft no banco', { error: dbErr.message });
      }

      this.logger.info('Campanha salva como DRAFT aguardando aprovação do corretor', { campaignId });
      return { ...result, campaignId, status: 'WAITING_APPROVAL', draftCaption };

    } catch (error) {
      this.logger.error('Erro ao criar campanha', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  // Publicar campanha aprovada pelo corretor
  async publishApprovedCampaign(campaignId, finalCaption) {
    try {
      const dataEngine = await this.getDataEngine();
      const campaigns = await dataEngine.getCampaigns();
      const camp = campaigns.find(c => c.id === campaignId);
      if (!camp) return { success: false, error: 'Campanha não encontrada' };
      if (camp.instagram_status !== 'WAITING_APPROVAL') return { success: false, error: 'Campanha já foi processada' };

      const property = await dataEngine.getPropertyById(camp.property_id);
      if (!property) return { success: false, error: 'Imóvel não encontrado' };

      // Monta um copy object simples a partir do texto editado pelo corretor
      const approvedCopy = { primaryText: finalCaption, headline: property.title, hashtags: [], whatsapp: '' };

      let instagramResult = null;
      const mediaUrls = Array.isArray(camp.media_urls) ? camp.media_urls : [];

      if (camp.is_video && mediaUrls[0]) {
        instagramResult = await this.publicarInstagramReel(property, approvedCopy, mediaUrls[0], finalCaption);
      } else if (mediaUrls.length > 0) {
        instagramResult = await this.publicarInstagram(property, approvedCopy, mediaUrls, finalCaption);
      } else {
        return { success: false, error: 'Sem mídia para publicar' };
      }

      // Atualiza camp no banco com resultado final
      await dataEngine.saveCampaign({
        ...camp,
        instagram_status: instagramResult?.status || 'DRAFT',
        instagram_post_id: instagramResult?.postId || '',
        instagram_url: instagramResult?.url || '',
        ai_copy: finalCaption
      });

      return { success: true, instagram: instagramResult };
    } catch (e) {
      this.logger.error('Erro ao publicar campanha aprovada', { error: e.message });
      return { success: false, error: e.message };
    }
  }

  async postarNoInstagram(propertyId, options = {}) {
    try {
      const property = await (await this.getDataEngine()).getPropertyById(propertyId);
      if (!property) {
        return { success: false, error: 'Imóvel não encontrado' };
      }

      if (!INSTAGRAM_BUSINESS_ID) {
        return { success: false, error: 'Instagram Business ID não configurado' };
      }

      let videoUrl = property.videoUrl || property.video_url || null;

      if (!videoUrl && property.videoData) {
        try {
          this.logger.info('postarNoInstagram: Fazendo upload de video_data para Cloudinary...');
          const base64 = property.videoData.toString().replace(/^data:video\/\w+;base64,/, '');
          const buffer = Buffer.from(base64, 'base64');
          videoUrl = await new Promise((resolve, reject) => {
            const stream = this.cloudinary.uploader.upload_stream({
              resource_type: 'video',
              folder: 'aimobil',
              public_id: `property_${property.id}`,
              overwrite: true,
              format: 'mp4'
            }, (error, result) => {
              if (error) reject(error);
              else resolve(result.secure_url);
            });
            stream.end(buffer);
          });
          await (await this.getDataEngine()).updatePropertyVideo(property.id, videoUrl);
          this.logger.info('postarNoInstagram: Video base64 enviado ao Cloudinary', { videoUrl });
        } catch (e) {
          this.logger.warn('postarNoInstagram: Falha ao fazer upload de video_data', { error: e.message });
        }
      }

      const copys = await this.gerarCopy(property, null);
      const publicImageUrl = `${API_URL}/api/properties/${property.id}/image`;

      if (videoUrl && videoUrl.startsWith('http')) {
        this.logger.info('Postando Reels no Instagram', { propertyId, videoUrl });
        const result = await this.publicarInstagramReel(property, copys[0], videoUrl);
        if (result?.status === 'PUBLISHED') {
          this.logger.info('Postando Story com o vídeo...');
          await this.publicarInstagramStory(property, copys[0], videoUrl, 'video');
        }
        return result;
      }

      const imageUrls = [publicImageUrl];
      for (let i = 1; i < Math.min(property.images?.length || 1, 5); i++) {
        imageUrls.push(`${API_URL}/api/properties/${property.id}/image?index=${i}`);
      }
      this.logger.info('Postando imagens no Instagram', { propertyId, imagesCount: imageUrls.length });
      const result = await this.publicarInstagram(property, copys[0], imageUrls);
      if (result?.status === 'PUBLISHED') {
        this.logger.info('Postando Story com a primeira foto...');
        await this.publicarInstagramStory(property, copys[0], publicImageUrl, 'image');
      }
      return result;

    } catch (error) {
      this.logger.error('Erro ao postar no Instagram', { error: error.message });
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

  gerarHashtags(property) {
    const tags = ['iamobil', 'imoveis'];
    if (property.city) tags.push(...property.city.toLowerCase().split(/\s+/));
    if (property.neighborhood) tags.push(...property.neighborhood.toLowerCase().split(/\s+/).map(s => s.replace(/[^a-z0-9]/g, '')));
    if (property.type) tags.push(property.type.toLowerCase());
    if (property.bedrooms) tags.push(`${property.bedrooms}quartos`);
    if (property.suites) tags.push(`${property.suites}suite`);
    if (property.parkingSpaces) tags.push(`${property.parkingSpaces}vagas`);
    tags.push('corretordeimoveis', 'imovelavenda', 'imobiliaria');
    const seen = new Set();
    return tags.filter(t => { if (seen.has(t)) return false; seen.add(t); return t.length > 0; }).slice(0, 15);
  }

  gerarPerguntaEngajamento(property) {
    const perguntas = [
      `Qual cômodo você mais gostou?`,
      `Já pensou em morar em ${property.neighborhood || property.city || 'um lugar assim'}?`,
      `Você prefere ${property.bedrooms > 1 ? `${property.bedrooms} quartos` : 'um quarto'} ou maior?`,
      `O que você acha do valor?`,
      `Qual seria a primeira coisa que você faria nesse espaço?`,
      `Você se vive morando aqui?`,
    ];
    return perguntas[Math.floor(Math.random() * perguntas.length)];
  }

  gerarWhatsAppLink(broker, property) {
    if (!broker?.phone) return null;
    const phone = broker.phone.replace(/\D/g, '');
    const msg = encodeURIComponent(
      `Olá! Tenho interesse no imóvel: ${property.title || ''} (${property.type || ''}) - ` +
      `R$ ${Number(property.price).toLocaleString('pt-BR')}`
    );
    return `https://wa.me/55${phone}?text=${msg}`;
  }

  montarLegendaCompleta({ headline, primaryText, description, cta, style, hashtags, engagement, whatsapp }) {
    const separador = '\n\n. . . . .\n\n';
    const emojis = {
      professional: { title: '🏡', price: '💰', cta: '📞' },
      emotional: { title: '💛', price: '✨', cta: '🔑' },
      urgency: { title: '⚡', price: '🔥', cta: '📲' },
      question: { title: '🤔', price: '💰', cta: '💬' },
    };
    const e = emojis[style] || emojis.professional;

    let legenda =
      `${e.title} ${headline}\n\n` +
      `${primaryText}\n\n` +
      `${e.price} ${description}\n`;

    if (cta) legenda += `\n📌 ${cta}`;
    if (whatsapp) legenda += `\n📱 Fale comigo: ${whatsapp}`;
    legenda += separador;
    if (engagement) legenda += `💭 ${engagement}\n\n`;
    legenda += hashtags.map(t => `#${t}`).join(' ');
    return legenda;
  }

  stylesConfig() {
    return [
      {
        id: 'professional',
        label: 'Profissional',
        emoji: '🏡',
        headlineFn: (p) => `${p.type} em ${p.city || p.neighborhood || 'localização'}`,
        primaryFn: (p) => `${p.bedrooms} dorm • ${p.bathrooms} ban • ${p.size}${p.sizeUnit || 'm²'}` +
          (p.suites ? ` • ${p.suites} suítes` : '') +
          (p.parkingSpaces ? ` • ${p.parkingSpaces} vagas` : '') +
          `. ${p.neighborhood ? `Bairro ${p.neighborhood}.` : ''} Agende sua visita!`,
        cta: 'Agende sua visita'
      },
      {
        id: 'emotional',
        label: 'Emocional',
        emoji: '💛',
        headlineFn: (p) => `Seu novo lar te espera`,
        primaryFn: (p) => `${p.title} — um ${p.type} pensado para você e sua família. ` +
          (p.description ? p.description.substring(0, 80) : `${p.bedrooms} quartos aconchegantes em ${p.city || 'localização privilegiada'}.`) +
          ` Venha se apaixonar!`,
        cta: 'Agende uma visita'
      },
      {
        id: 'urgency',
        label: 'Urgência',
        emoji: '⚡',
        headlineFn: (p) => `Não perca! ${p.type}`,
        primaryFn: (p) => `Oportunidade imperdível! ${p.type} em ${p.city || 'ótima localização'} — ` +
          `${p.bedrooms} dormitórios${p.suites ? `, ${p.suites} suítes` : ''}, ${p.parkingSpaces} vagas. ` +
          `Preço especial. Corra antes que alguém veja antes de você!`,
        cta: 'Fale com o corretor'
      },
      {
        id: 'question',
        label: 'Pergunta',
        emoji: '🤔',
        headlineFn: (p) => `Já pensou em morar aqui?`,
        primaryFn: (p) => `Imagina acordar todos os dias em um ${p.type} incrível em ${p.city || 'um lugar especial'}. ` +
          `${p.bedrooms} quartos, área de ${p.size}${p.sizeUnit || 'm²'}. ` +
          `${p.neighborhood ? `No bairro ${p.neighborhood}. ` : ''}O que está esperando?`,
        cta: 'Saiba mais'
      }
    ];
  }

  async gerarCopy(property, broker = null) {
    const limit = (s, n) => s ? s.substring(0, n) : '';
    const styles = this.stylesConfig();
    const hashtags = this.gerarHashtags(property);
    const engagement = this.gerarPerguntaEngajamento(property);
    const whatsappLink = this.gerarWhatsAppLink(broker, property);

    const copys = styles.map(s => {
      const headline = limit(s.headlineFn(property), 25);
      const primaryText = limit(s.primaryFn(property), 125);
      const description = `R$ ${Number(property.price).toLocaleString('pt-BR')}`;

      const copy = {
        style: s.id,
        headline,
        primaryText,
        description,
        cta: s.cta,
        hashtags,
        engagement,
        whatsapp: whatsappLink,
        fullCaption: '',
      };
      copy.fullCaption = this.montarLegendaCompleta(copy);
      return copy;
    });

    if (GEMINI_API_KEY) {
      try {
        const prompt = `Você é um copywriter especializado em marketing imobiliário.
Crie 4 versões de legenda COMPLETA para Instagram/Facebook anunciando este imóvel.
Cada versão deve ter um estilo diferente: Profissional, Emocional, Urgência e Pergunta.

Dados do imóvel:
- Tipo: ${property.type}
- Título: ${property.title}
- Preço: R$ ${Number(property.price).toLocaleString('pt-BR')}
- Cidade: ${property.city || 'N/I'}
- Bairro: ${property.neighborhood || 'N/I'}
- Quartos: ${property.bedrooms}
- Suítes: ${property.suites || 0}
- Banheiros: ${property.bathrooms}
- Vagas: ${property.parkingSpaces || 0}
- Área: ${property.size}${property.sizeUnit || 'm²'}
- Descrição: ${property.description || ''}
${whatsappLink ? `- WhatsApp do corretor: ${whatsappLink}` : ''}

Regras para cada legenda:
1. Máximo 2000 caracteres
2. Incluir headline curta (max 25 chars)
3. Descrição persuasiva do imóvel
4. O preço formatado
5. Emojis relevantes
6. ${whatsappLink ? 'Incluir link do WhatsApp para contato' : 'Incluir CTA para contato'}
7. Terminar com uma pergunta de engajamento
8. Incluir hashtags: ${hashtags.map(t => '#' + t).join(' ')}

Formato de resposta (para cada estilo):
---{estilo}---
Headline: ...
Texto: ...
---fim---`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.8, maxOutputTokens: 1024 }
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const blocks = rawText.split('---');
          blocks.forEach(block => {
            if (!block.includes('Headline:')) return;
            const lines = block.split('\n').filter(l => l.trim());
            let estilo = '';
            let headline = '';
            let texto = '';
            for (const line of lines) {
              if (line.startsWith('Headline:')) headline = line.replace('Headline:', '').trim();
              else if (line.startsWith('Texto:')) texto = line.replace('Texto:', '').trim();
              else if (block.includes(line)) {
                const match = line.match(/\{(\w+)\}/);
                if (match) estilo = match[1];
              }
            }
            if (headline || texto) {
              const idx = styles.findIndex(s => s.id === estilo);
              if (idx >= 0 && copys[idx]) {
                if (headline) copys[idx].headline = limit(headline, 25);
                if (texto) {
                  copys[idx].primaryText = limit(texto, 125);
                  copys[idx].fullCaption = this.montarLegendaCompleta(copys[idx]);
                }
              }
            }
          });
        }
      } catch (e) {
        this.logger.warn('Erro ao gerar copy com Gemini, usando templates', { error: e.message });
      }
    }

    return copys;
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

      if (!campaignResponse.ok) {
        const errorText = await campaignResponse.text();
        this.logger.error('Erro Meta Ads HTTP ao criar campanha', { status: campaignResponse.status, error: errorText.substring(0, 300) });
        return { status: 'ERROR', error: `HTTP ${campaignResponse.status}: ${errorText.substring(0, 200)}` };
      }

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

      if (!adsetResponse.ok) {
        const errorText = await adsetResponse.text();
        return { status: 'PARTIAL', campaignId, error: `HTTP ${adsetResponse.status}: ${errorText.substring(0, 200)}`, campaign: { id: campaignId, name: campaignName } };
      }

      const adsetData = await adsetResponse.json();
      if (adsetData.error) {
        return { status: 'PARTIAL', campaignId, error: adsetData.error.message, campaign: { id: campaignId, name: campaignName } };
      }

      const adsetId = adsetData.id;
      if (!pageId) {
        this.logger.info('Campanha criada sem page_id. Configure META_FACEBOOK_PAGE_ID para criar anúncios.');
        return { status: 'NO_PAGE', campaignId, name: campaignName, adsetId, dailyBudget: budget, duration: days, message: 'Conjunto criado. Configure META_FACEBOOK_PAGE_ID no .env para gerar os anúncios.' };
      }

      // Criar criativo com dados reais do imóvel
      let creativeId = null;

      const copyAtual = copys?.[0] || {};
      const propertyLink = `${FRONTEND_URL}/imovel/${property.id}`;
      const headline = copyAtual.headline || property.type || 'Imóvel';
      const primaryText = (copyAtual.primaryText || property.description || 'Confira este imóvel incrível!').substring(0, 125);
      const description = copyAtual.description || `R$ ${Number(property.price).toLocaleString('pt-BR')}`;

      const spec = {
        name: `Criativo - ${property.type} - ${property.city || 'Feed'}`,
        object_story_spec: {
          page_id: pageId,
          link_data: {
            link: propertyLink,
            message: primaryText,
            name: headline,
            description: description,
            call_to_action: { type: 'LEARN_MORE' }
          }
        },
        access_token: META_ADS_TOKEN
      };

      if (imageHash) {
        spec.object_story_spec.link_data.image_hash = imageHash;
      }

      const res = await fetch(`${FACEBOOK_GRAPH_URL}/act_${META_ACCOUNT_ID}/adcreatives`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(spec) });
      if (!res.ok) {
        const errorText = await res.text();
        this.logger.warn('Creative falhou', { status: res.status, error: errorText });
        return { status: 'PARTIAL', campaignId, adsetId, error: `HTTP ${res.status}: ${errorText.substring(0, 200)}` };
      }
      const data = await res.json();
      if (!data.error) { creativeId = data.id; }
      else {
        this.logger.warn('Creative falhou', { error: data.error, spec: JSON.stringify(spec).substring(0, 400) });
        return { status: 'PARTIAL', campaignId, adsetId, error: `Erro: ${data.error.message}`, fbResponse: data.error };
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

      if (!adResponse.ok) {
        const errorText = await adResponse.text();
        this.logger.error('Erro Meta Ads ao criar anúncio', { status: adResponse.status, error: errorText.substring(0, 300) });
        return { status: 'PARTIAL', campaignId, adsetId, creativeId, error: `HTTP ${adResponse.status}: ${errorText.substring(0, 200)}` };
      }

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

  gerarLegendaStorytelling(property, copy, slideIndex, totalSlides) {
    const price = `R$ ${Number(property.price).toLocaleString('pt-BR')}`;
    const hashtags = copy?.hashtags?.map(t => `#${t}`).join(' ') || '#iamobil';
    const stories = [
      {
        title: `📍 A Localização`,
        text: `${property.neighborhood ? `Bairro ${property.neighborhood}, ` : ''}${property.city || 'região nobre'}. ` +
          `${property.type} perfeito para quem busca conforto e praticidade.`
      },
      {
        title: `🛏️ Os Ambientes`,
        text: `${property.bedrooms} quartos • ${property.bathrooms} banheiros • ${property.size}${property.sizeUnit || 'm²'}` +
          (property.suites ? ` • ${property.suites} suítes` : '') +
          (property.parkingSpaces ? ` • ${property.parkingSpaces} vagas` : '')
      },
      {
        title: `💰 Oportunidade`,
        text: `Tudo isso por ${price}. ${property.description ? property.description.substring(0, 80) : 'Agende já sua visita e venha conferir pessoalmente!'}`
      },
      {
        title: `💛 Seu Novo Lar`,
        text: `${copy?.headline || property.title}. Não deixe essa oportunidade passar!`
      },
      {
        title: `📞 Fale Conosco`,
        text: `Clique no link da bio ou me chame no direct para mais informações!` +
          (copy?.whatsapp ? `\n📱 WhatsApp: ${copy.whatsapp}` : '')
      }
    ];
    const s = stories[Math.min(slideIndex, stories.length - 1)];
    return `${s.title}\n\n${s.text}\n\n. . . . .\n\n${hashtags}`;
  }

  async publicarInstagram(property, copy, imageUrls) {
    try {
      if (!INSTAGRAM_BUSINESS_ID) {
        return { status: 'SKIPPED', reason: 'INSTAGRAM_BUSINESS_ID não configurado' };
      }

      if (!imageUrls || imageUrls.length === 0) {
        return { status: 'SKIPPED', reason: 'Nenhuma URL de imagem disponível.' };
      }

      const legenda = copy?.fullCaption || this.montarLegendaCompleta({
        headline: copy?.headline || property.title,
        primaryText: copy?.primaryText || property.description || '',
        description: copy?.description || `R$ ${Number(property.price).toLocaleString('pt-BR')}`,
        cta: copy?.cta || 'Saiba mais',
        style: copy?.style || 'professional',
        hashtags: copy?.hashtags || this.gerarHashtags(property),
        engagement: copy?.engagement || this.gerarPerguntaEngajamento(property),
        whatsapp: copy?.whatsapp
      });

      this.logger.info('Publicando no Instagram', { totalImages: imageUrls.length, style: copy?.style || 'auto' });

      if (imageUrls.length === 1) {
        // Post único — legenda completa rica
        const creationResponse = await fetch(
          `${FACEBOOK_GRAPH_URL}/${INSTAGRAM_BUSINESS_ID}/media`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_url: imageUrls[0], caption: legenda, access_token: INSTAGRAM_TOKEN })
          }
        );

        if (!creationResponse.ok) {
          const errorText = await creationResponse.text();
          this.logger.warn('Erro HTTP ao criar media no Instagram', { status: creationResponse.status, error: errorText.substring(0, 200) });
          return { status: 'DRAFT', error: `HTTP ${creationResponse.status}`, apiResponse: errorText.substring(0, 200) };
        }

        const creationData = await creationResponse.json();
        if (creationData.error) {
          this.logger.warn('Erro ao criar media no Instagram', { error: creationData.error });
          return { status: 'DRAFT', error: creationData.error.message, apiResponse: creationData };
        }

        await new Promise(r => setTimeout(r, 3000));

        const publishResponse = await fetch(
          `${FACEBOOK_GRAPH_URL}/${INSTAGRAM_BUSINESS_ID}/media_publish`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ creation_id: creationData.id, access_token: INSTAGRAM_TOKEN })
          }
        );

        if (!publishResponse.ok) {
          const errorText = await publishResponse.text();
          this.logger.warn('Erro HTTP ao publicar no Instagram', { status: publishResponse.status, error: errorText.substring(0, 200) });
          return { status: 'DRAFT', error: `HTTP ${publishResponse.status}`, apiResponse: errorText.substring(0, 200) };
        }

        const publishData = await publishResponse.json();
        const mediaId = publishData.id || creationData.id;
        this.logger.info('Post Instagram publicado', { mediaId });

        let shortcode = null;
        try {
          const mediaRes = await fetch(
            `${FACEBOOK_GRAPH_URL}/${mediaId}?fields=shortcode&access_token=${INSTAGRAM_TOKEN}`
          );
          if (mediaRes.ok) {
            const mediaData = await mediaRes.json();
            shortcode = mediaData.shortcode || null;
          }
        } catch (e) {
          this.logger.warn('Erro ao buscar shortcode', { error: e.message });
        }

        return {
          status: 'PUBLISHED',
          postId: mediaId,
          url: shortcode
            ? `https://instagram.com/p/${shortcode}`
            : `https://instagram.com/p/${mediaId}`,
          caption: legenda.substring(0, 100),
          carousel: false
        };
      }

      // CARROSSEL: storytelling — legenda diferente por slide
      const childrenIds = [];
      for (let i = 0; i < imageUrls.length; i++) {
        const captionSlide = this.gerarLegendaStorytelling(property, copy, i, imageUrls.length);
        const childRes = await fetch(
          `${FACEBOOK_GRAPH_URL}/${INSTAGRAM_BUSINESS_ID}/media`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image_url: imageUrls[i],
              is_carousel_item: true,
              caption: captionSlide,
              access_token: INSTAGRAM_TOKEN
            })
          }
        );

        if (!childRes.ok) {
          const errorText = await childRes.text();
          this.logger.warn('Erro HTTP ao criar item do carrossel', { status: childRes.status, index: i, error: errorText.substring(0, 200) });
          return { status: 'DRAFT', error: `Item ${i}: HTTP ${childRes.status}`, apiResponse: errorText.substring(0, 200) };
        }

        const childData = await childRes.json();
        if (childData.error) {
          this.logger.warn('Erro ao criar item do carrossel', { error: childData.error, index: i });
          return { status: 'DRAFT', error: `Item ${i}: ${childData.error.message}`, apiResponse: childData };
        }
        childrenIds.push(childData.id);
        await new Promise(r => setTimeout(r, 1000));
      }

      // Legenda principal do carrossel (aparece no feed)
      const legendaCarrossel =
        `${copy?.headline || property.title}\n\n` +
        `${copy?.primaryText || property.description || ''}\n\n` +
        `💰 ${copy?.description || `R$ ${Number(property.price).toLocaleString('pt-BR')}`}\n` +
        (copy?.whatsapp ? `📱 Fale comigo: ${copy.whatsapp}\n` : '') +
        `\n. . . . .\n\n` +
        (copy?.engagement ? `💭 ${copy.engagement}\n\n` : '') +
        `👆 Deslize para ver mais fotos!\n\n` +
        (copy?.hashtags?.map(t => `#${t}`).join(' ') || '#iamobil');

      const carouselRes = await fetch(
        `${FACEBOOK_GRAPH_URL}/${INSTAGRAM_BUSINESS_ID}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            media_type: 'CAROUSEL',
            children: childrenIds.join(','),
            caption: legendaCarrossel,
            access_token: INSTAGRAM_TOKEN
          })
        }
      );

      if (!carouselRes.ok) {
        const errorText = await carouselRes.text();
        this.logger.warn('Erro HTTP ao criar carrossel', { status: carouselRes.status, error: errorText.substring(0, 200) });
        return { status: 'DRAFT', error: `HTTP ${carouselRes.status}`, apiResponse: errorText.substring(0, 200) };
      }

      const carouselData = await carouselRes.json();
      if (carouselData.error) {
        this.logger.warn('Erro ao criar carrossel', { error: carouselData.error });
        return { status: 'DRAFT', error: carouselData.error.message, apiResponse: carouselData };
      }

      await new Promise(r => setTimeout(r, 3000));

      const publishRes = await fetch(
        `${FACEBOOK_GRAPH_URL}/${INSTAGRAM_BUSINESS_ID}/media_publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creation_id: carouselData.id, access_token: INSTAGRAM_TOKEN })
        }
      );

      if (!publishRes.ok) {
        const errorText = await publishRes.text();
        this.logger.warn('Erro HTTP ao publicar carrossel', { status: publishRes.status, error: errorText.substring(0, 200) });
        return { status: 'DRAFT', error: `HTTP ${publishRes.status}`, apiResponse: errorText.substring(0, 200) };
      }

      const publishData = await publishRes.json();
      const mediaId = publishData.id || carouselData.id;

      let shortcode = null;
      try {
        const mediaRes = await fetch(
          `${FACEBOOK_GRAPH_URL}/${mediaId}?fields=shortcode&access_token=${INSTAGRAM_TOKEN}`
        );
        if (mediaRes.ok) {
          const mediaData = await mediaRes.json();
          shortcode = mediaData.shortcode || null;
        }
      } catch (e) {
        this.logger.warn('Erro ao buscar shortcode do carrossel', { error: e.message });
      }

      this.logger.info('Carrossel Instagram com storytelling publicado', { mediaId, images: imageUrls.length, shortcode });

      return {
        status: 'PUBLISHED',
        postId: mediaId,
        url: shortcode
          ? `https://instagram.com/p/${shortcode}`
          : `https://instagram.com/p/${mediaId}`,
        caption: legendaCarrossel.substring(0, 100),
        carousel: true,
        imagesCount: imageUrls.length
      };

    } catch (error) {
      this.logger.error('Erro ao publicar no Instagram', { error: error.message });
      return { status: 'ERROR', error: error.message };
    }
  }

  async publicarInstagramReel(property, copy, videoUrl) {
    try {
      if (!INSTAGRAM_BUSINESS_ID) {
        return { status: 'SKIPPED', reason: 'INSTAGRAM_BUSINESS_ID n\u00e3o configurado' };
      }

      if (!videoUrl || !videoUrl.startsWith('http')) {
        return { status: 'SKIPPED', reason: 'URL p\u00fablica do v\u00eddeo n\u00e3o dispon\u00edvel. Fa\u00e7a upload do v\u00eddeo pelo formul\u00e1rio.' };
      }

      this.logger.info('Publicando Reels no Instagram via Cloudinary', { videoUrl });

      const hashtags = copy?.hashtags?.map(t => `#${t}`).join(' ') || '#iamobil';
      const legenda =
        `${copy?.headline || property.title}\n\n` +
        `${copy?.primaryText || property.description || ''}\n\n` +
        `\uD83D\uDCB0 ${copy?.description || `R$ ${Number(property.price).toLocaleString('pt-BR')}`}\n` +
        (copy?.whatsapp ? `\uD83D\uDCF1 Fale comigo: ${copy.whatsapp}\n` : '') +
        `\n. . . . .\n\n` +
        (copy?.engagement ? `\uD83D\uDCAD ${copy.engagement}\n\n` : '') +
        hashtags;

      const creationResponse = await fetch(
        `${FACEBOOK_GRAPH_URL}/${INSTAGRAM_BUSINESS_ID}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            media_type: 'REELS',
            video_url: videoUrl,
            caption: legenda,
            access_token: INSTAGRAM_TOKEN
          })
        }
      );

      if (!creationResponse.ok) {
        const errorText = await creationResponse.text();
        this.logger.warn('Erro HTTP ao criar Reels', { status: creationResponse.status, error: errorText.substring(0, 200) });
        return { status: 'DRAFT', error: `HTTP ${creationResponse.status}: ${errorText.substring(0, 200)}` };
      }

      const creationData = await creationResponse.json();
      if (creationData.error) {
        this.logger.warn('Erro ao criar Reels', { error: creationData.error });
        return { status: 'DRAFT', error: creationData.error.message, apiResponse: creationData };
      }

      // Reels pode levar mais tempo para processar o vídeo
      this.logger.info('Reels criado, aguardando processamento do vídeo...', { creationId: creationData.id });
      let fetchStatus = 'IN_PROGRESS';
      let attempts = 0;
      while (fetchStatus !== 'FINISHED' && attempts < 30) {
        await new Promise(r => setTimeout(r, 6000)); // wait 6s
        try {
          const statusRes = await fetch(`${FACEBOOK_GRAPH_URL}/${creationData.id}?fields=status_code&access_token=${INSTAGRAM_TOKEN}`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            fetchStatus = statusData.status_code || fetchStatus;
            this.logger.info(`Status do processamento: ${fetchStatus}`);
            if (fetchStatus === 'ERROR') {
              return { status: 'DRAFT', error: 'O Instagram rejeitou o formato deste vídeo.' };
            }
          }
        } catch (err) {
          this.logger.warn('Falha ao verificar status do Reels', { error: err.message });
        }
        attempts++;
      }

      // Retry publish até 3x em caso de erro transitório do servidor do Instagram
      let publishData = null;
      let publishError = null;
      for (let publishAttempt = 1; publishAttempt <= 3; publishAttempt++) {
        const publishResponse = await fetch(
          `${FACEBOOK_GRAPH_URL}/${INSTAGRAM_BUSINESS_ID}/media_publish`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ creation_id: creationData.id, access_token: INSTAGRAM_TOKEN })
          }
        );

        if (!publishResponse.ok) {
          const errorText = await publishResponse.text();
          const isTransient = publishResponse.status === 500 || publishResponse.status === 503;
          this.logger.warn(`Erro HTTP ao publicar Reels (tentativa ${publishAttempt}/3)`, { status: publishResponse.status, error: errorText.substring(0, 200) });
          publishError = `HTTP ${publishResponse.status}: ${errorText.substring(0, 200)}`;
          if (isTransient && publishAttempt < 3) {
            this.logger.info(`Erro transitório do Instagram — tentando novamente em 30s...`);
            await new Promise(r => setTimeout(r, 30000));
            continue;
          }
          return { status: 'DRAFT', error: publishError };
        }

        publishData = await publishResponse.json();

        // Se o Instagram retornar um erro no payload mesmo com status 200
        if (publishData.error) {
          const isTransient = publishData.error.is_transient;
          this.logger.warn(`Erro no payload ao publicar Reels (tentativa ${publishAttempt}/3)`, { error: publishData.error });
          publishError = publishData.error.message;
          if (isTransient && publishAttempt < 3) {
            this.logger.info(`Erro transitório do Instagram — tentando novamente em 30s...`);
            await new Promise(r => setTimeout(r, 30000));
            publishData = null;
            continue;
          }
          return { status: 'DRAFT', error: publishError };
        }

        break; // Sucesso — sai do loop
      }

      if (!publishData) {
        return { status: 'DRAFT', error: publishError || 'Falha desconhecida ao publicar' };
      }
      const mediaId = publishData.id || creationData.id;
      this.logger.info('Reels publicado com sucesso', { mediaId });

      let shortcode = null;
      try {
        const mediaRes = await fetch(
          `${FACEBOOK_GRAPH_URL}/${mediaId}?fields=shortcode&access_token=${INSTAGRAM_TOKEN}`
        );
        if (mediaRes.ok) {
          const mediaData = await mediaRes.json();
          shortcode = mediaData.shortcode || null;
        }
      } catch (e) {
        this.logger.warn('Erro ao buscar shortcode do Reels', { error: e.message });
      }

      return {
        status: 'PUBLISHED',
        postId: mediaId,
        url: shortcode
          ? `https://instagram.com/reel/${shortcode}`
          : `https://instagram.com/reel/${mediaId}`,
        caption: legenda.substring(0, 100),
        reel: true
      };

    } catch (error) {
      this.logger.error('Erro ao publicar Reels', { error: error.message });
      return { status: 'ERROR', error: error.message };
    }
  }

  async publicarInstagramStory(property, copy, mediaUrl, mediaType = 'video') {
    try {
      if (!INSTAGRAM_BUSINESS_ID) {
        return { status: 'SKIPPED', reason: 'INSTAGRAM_BUSINESS_ID n\u00e3o configurado' };
      }

      if (!mediaUrl || !mediaUrl.startsWith('http')) {
        return { status: 'SKIPPED', reason: 'URL da m\u00eddia n\u00e3o dispon\u00edvel para Story' };
      }

      this.logger.info('Publicando Story no Instagram', { mediaUrl, mediaType });

      const creationResponse = await fetch(
        `${FACEBOOK_GRAPH_URL}/${INSTAGRAM_BUSINESS_ID}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            media_type: 'STORIES',
            [mediaType === 'video' ? 'video_url' : 'image_url']: mediaUrl,
            access_token: INSTAGRAM_TOKEN
          })
        }
      );

      if (!creationResponse.ok) {
        const errorText = await creationResponse.text();
        this.logger.warn('Erro HTTP ao criar Story', { status: creationResponse.status, error: errorText.substring(0, 200) });
        return { status: 'DRAFT', error: `HTTP ${creationResponse.status}: ${errorText.substring(0, 200)}` };
      }

      const creationData = await creationResponse.json();
      if (creationData.error) {
        this.logger.warn('Erro ao criar Story', { error: creationData.error });
        return { status: 'DRAFT', error: creationData.error.message, apiResponse: creationData };
      }

      this.logger.info('Story criada, aguardando processamento...', { creationId: creationData.id });
      await new Promise(r => setTimeout(r, 5000));

      const publishResponse = await fetch(
        `${FACEBOOK_GRAPH_URL}/${INSTAGRAM_BUSINESS_ID}/media_publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creation_id: creationData.id, access_token: INSTAGRAM_TOKEN })
        }
      );

      if (!publishResponse.ok) {
        const errorText = await publishResponse.text();
        this.logger.warn('Erro HTTP ao publicar Story', { status: publishResponse.status, error: errorText.substring(0, 200) });
        return { status: 'DRAFT', error: `HTTP ${publishResponse.status}: ${errorText.substring(0, 200)}` };
      }

      const publishData = await publishResponse.json();
      const mediaId = publishData.id || creationData.id;
      this.logger.info('Story publicada com sucesso', { mediaId });

      return {
        status: 'PUBLISHED',
        storyId: mediaId,
        story: true
      };

    } catch (error) {
      this.logger.error('Erro ao publicar Story', { error: error.message });
      return { status: 'ERROR', error: error.message };
    }
  }

  getCampaignStatus(propertyId) {
    const entry = campaigns.get(propertyId);
    if (!entry) return null;
    if (entry.campaignId) {
      return campaigns.get(entry.campaignId) || entry;
    }
    return entry;
  }

  listActiveCampaigns() {
    const active = [];
    const seen = new Set();
    campaigns.forEach((value, key) => {
      if (seen.has(key)) return;
      const isActive = value.status === 'ACTIVE' || value.campaign?.status === 'ACTIVE';
      if (isActive && value.propertyId) {
        seen.add(key);
        active.push({ campaignKey: key, ...value });
      }
    });
    return active;
  }

  async listAllCampaigns() {
    return await (await this.getDataEngine()).getCampaigns();
  }

  async getCampaignStats() {
    try {
      const rows = await (await this.getDataEngine()).getCampaigns();
      const published = rows.filter(r => r.instagram_status === 'PUBLISHED').length;
      const adsActive = rows.filter(r => r.campaign_status === 'ACTIVE').length;
      const failed = rows.filter(r =>
        r.instagram_status !== 'PUBLISHED' && r.instagram_status !== '' &&
        r.campaign_status !== 'ACTIVE' && r.campaign_status !== ''
      ).length;
      return {
        total: rows.length,
        published,
        adsActive,
        failed,
        carousel: rows.filter(r => r.has_carousel).length
      };
    } catch (e) {
      this.logger?.error?.('Erro ao obter stats de campanhas', { error: e.message });
      return { total: 0, published: 0, adsActive: 0, failed: 0, carousel: 0 };
    }
  }

  async deletarDoInstagram(mediaId) {
    if (!INSTAGRAM_BUSINESS_ID || !INSTAGRAM_TOKEN) {
      return { success: false, error: 'Instagram não configurado' };
    }
    try {
      const res = await fetch(`${FACEBOOK_GRAPH_URL}/${mediaId}?access_token=${INSTAGRAM_TOKEN}`, {
        method: 'DELETE'
      });
      if (!res.ok && res.status !== 404) {
        const errorText = await res.text();
        this.logger.warn('Erro HTTP ao deletar do Instagram', { status: res.status, error: errorText.substring(0, 200) });
        return { success: false, error: `HTTP ${res.status}: ${errorText.substring(0, 200)}` };
      }
      if (res.status === 404) {
        this.logger.warn('Post Instagram já foi removido', { mediaId });
        return { success: true, alreadyDeleted: true };
      }
      const data = await res.json();
      if (data.error) {
        this.logger.warn('Erro ao deletar do Instagram', { error: data.error });
        return { success: false, error: data.error.message };
      }
      this.logger.info('Post deletado do Instagram', { mediaId });
      return { success: true };
    } catch (e) {
      this.logger.error('Erro ao deletar do Instagram', { error: e.message });
      return { success: false, error: e.message };
    }
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
