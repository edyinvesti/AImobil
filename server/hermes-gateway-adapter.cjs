require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

class HermesGateway {
  constructor() {
    this.model = 'gemini-2.0-flash-001';
  }

  async processMessage(userMessage, context = {}) {
    if (!GEMINI_API_KEY) {
      return { 
        success: false, 
        response: "IA não configurada. Configure GEMINI_API_KEY." 
      };
    }

    try {
      const systemPrompt = `Você é o Hermes, assistente inteligente da IAmobil - plataforma de gestão imobiliária. 
Ajude o usuário com:
- Informações sobre imóveis
- Agendamento de visitas
- Consulta de leads
- Dúvidas sobre o sistema

Seja breve, helpful e professional.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: userMessage }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024,
            }
          })
        }
      );

      const data = await response.json();
      
      if (data.error) {
        return { success: false, response: `Erro: ${data.error.message}` };
      }

      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                    "Desculpe, não consegui processar sua solicitação.";

      return { success: true, response: reply };
    } catch (e) {
      return { success: false, response: `Erro ao processar: ${e.message}` };
    }
  }

  getStatus() {
    return {
      status: 'online',
      geminiConfigured: !!GEMINI_API_KEY,
      model: this.model
    };
  }
}

module.exports = { HermesGateway };