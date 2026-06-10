// server/services/ai.service.cjs
// Serviço de IA com fallback: Mistral → Groq → Gemini

const path = require('path');
const { ExternalServiceError } = require(path.join(__dirname, '..', 'utils', 'errors'));
const logger = require(path.join(__dirname, '..', 'utils', 'logger'));

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_PROMPT = `Você é o Hermes, assistente inteligente da IAmobil - plataforma de gestão imobiliária. 
Ajude o usuário com:
- Informações sobre imóveis
- Agendamento de visitas
- Consulta de leads
- Dúvidas sobre o sistema

Seja breve, profissional e responda sempre em português brasileiro.
Evite usar markdown complexo que possa causar erros de parsing.`;

class AIService {
  constructor() {
    this.providers = [
      { name: 'mistral', key: MISTRAL_API_KEY, fn: this.processWithMistral.bind(this) },
      { name: 'groq', key: GROQ_API_KEY, fn: this.processWithGroq.bind(this) },
      { name: 'gemini', key: GEMINI_API_KEY, fn: this.processWithGemini.bind(this) }
    ].filter(p => !!p.key);
  }

  async process(message, context = {}) {
    if (this.providers.length === 0) {
      return "IA não configurada. Contacte o administrador.";
    }

    for (const provider of this.providers) {
      try {
        const result = await provider.fn(message, SYSTEM_PROMPT);
        if (result && !result.startsWith('Erro:')) {
          return result;
        }
        logger.warn(`AI provider ${provider.name} failed`, { result });
      } catch (e) {
        logger.error(`AI provider ${provider.name} error`, { error: e.message });
      }
    }

    return "Desculpe, não consegui processar sua solicitação no momento.";
  }

  async processWithMistral(message, systemPrompt) {
    const response = await fetch(
      'https://api.mistral.ai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MISTRAL_API_KEY}`
        },
        body: JSON.stringify({
          model: 'mistral-small-latest',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          temperature: 0.7,
          max_tokens: 1024
        })
      }
    );

    const data = await response.json();
    
    if (data.error) {
      throw new ExternalServiceError('Mistral', data.error.message);
    }

    return data.choices?.[0]?.message?.content || null;
  }

  async processWithGroq(message, systemPrompt) {
    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          temperature: 0.7,
          max_tokens: 1024
        })
      }
    );

    const data = await response.json();
    
    if (data.error) {
      throw new ExternalServiceError('Groq', data.error.message);
    }

    return data.choices?.[0]?.message?.content || null;
  }

  async processWithGemini(message, systemPrompt) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: message }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          }
        })
      }
    );

    const data = await response.json();
    
    if (data.error) {
      throw new ExternalServiceError('Gemini', data.error.message);
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  }

  getAvailableProviders() {
    return this.providers.map(p => p.name);
  }
}

module.exports = AIService;
