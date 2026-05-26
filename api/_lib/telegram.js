export async function sendMessage(chatId, text, keyboard = null) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  const body = { chat_id: chatId, text: String(text).slice(0, 4096) };
  if (keyboard) body.reply_markup = keyboard;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export const mainKeyboard = {
  keyboard: [
    [{ text: '🏠 Meus Imóveis' }, { text: '👥 Meus Leads' }],
    [{ text: '📅 Agendamentos' }, { text: '📊 Dashboard' }],
    [{ text: '❓ Ajuda' }]
  ],
  resize_keyboard: true
};

export async function processWithAI(message) {
  const systemPrompt = 'Você é o assistente inteligente da IAmobil - plataforma de gestão imobiliária. Seja breve e profissional em português brasileiro.';

  if (process.env.GROQ_API_KEY) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
          max_tokens: 512
        })
      });
      const data = await r.json();
      if (!data.error) return data.choices?.[0]?.message?.content;
    } catch (e) {}
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: message }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 512 }
          })
        }
      );
      const data = await r.json();
      if (!data.error) return data.candidates?.[0]?.content?.parts?.[0]?.text;
    } catch (e) {}
  }

  return 'Desculpe, não consegui processar sua mensagem.';
}
