// A ROTA DE PROPERTIES
app.post('/api/partner/properties', upload.single('image'), async (req, res) => {
  if (!DataEngine) return res.status(503).json({ error: 'DataEngine não disponível' });
  try {
    const property = req.body;
    if (req.file) {
      property.thumbnail = `/uploads/${req.file.filename}`;
    }
    if (!property.id) property.id = `prop_${Date.now()}`;
    await DataEngine.addProperty(property);
    logger.info('Property created with image', { propertyId: property.id });
    res.status(201).json({ success: true, propertyId: property.id, imageUrl: property.thumbnail });
  } catch (e) {
    logger.error('Partner property creation error', { error: e.message });
    res.status(500).json({ error: 'Erro ao salvar imóvel' });
  }
});

// ... (Restante do seu código original aqui) ...

// DEFINIÇÃO DA PORTA E INICIALIZAÇÃO DO SERVIDOR (APENAS UMA VEZ)
const PORT = process.env.PORT || 10000;

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Servidor IAmobil rodando na porta ${PORT}`);
});