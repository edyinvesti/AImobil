// server/services/lead.service.cjs
// Serviço de leads (CRUD)

const path = require('path');
const { NotFoundError } = require(path.join(__dirname, '..', 'utils', 'errors.cjs'));

const logger = require(path.join(__dirname, '..', 'utils', 'logger.cjs'));
class LeadService {
  constructor(dataEngine) {
    this.dataEngine = dataEngine;
  }

  async getAll() {
    return await this.dataEngine.getLeads();
  }

  async getById(id) {
    const leads = await this.dataEngine.getLeads();
    const lead = leads.find(l => l.id === id);
    if (!lead) {
      throw new NotFoundError('Lead');
    }
    return lead;
  }

  async create(leadData) {
    const result = await this.dataEngine.addLead(leadData);
    logger.info('Lead created', { leadId: result?.lastInsertRowid });
    return { id: result?.lastInsertRowid };
  }

  async update(id, leadData) {
    await this.dataEngine.updateLead(id, leadData);
    logger.info('Lead updated', { leadId: id });
    return { id };
  }

  async delete(id) {
    await this.dataEngine.deleteLead(id);
    logger.info('Lead deleted', { leadId: id });
    return { success: true };
  }

  async getByStatus(status) {
    const leads = await this.dataEngine.getLeads();
    return leads.filter(l => l.status === status);
  }

  async getByProperty(propertyId) {
    const leads = await this.dataEngine.getLeads();
    return leads.filter(l => l.property_id === propertyId);
  }

  async updateScore(id, score) {
    await this.dataEngine.updateLead(id, { score });
    logger.info('Lead score updated', { leadId: id, score });
    return { id, score };
  }

  async updateStatus(id, status) {
    await this.dataEngine.updateLead(id, { status });
    logger.info('Lead status updated', { leadId: id, status });
    return { id, status };
  }
}

module.exports = LeadService;
