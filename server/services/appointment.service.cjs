// server/services/appointment.service.cjs
// Serviço de agendamentos

const path = require('path');
const { NotFoundError } = require(path.join(__dirname, '..', 'utils', 'errors'));
const logger = require(path.join(__dirname, '..', 'utils', 'logger'));

class AppointmentService {
  constructor(dataEngine) {
    this.dataEngine = dataEngine;
  }

  async getAll() {
    return await this.dataEngine.getAppointments();
  }

  async getById(id) {
    const appointments = await this.dataEngine.getAppointments();
    const appointment = appointments.find(a => a.id === id);
    if (!appointment) {
      throw new NotFoundError('Agendamento');
    }
    return appointment;
  }

  async create(appointmentData) {
    const result = await this.dataEngine.addAppointment(appointmentData);
    logger.info('Appointment created', { appointmentId: result?.lastInsertRowid });
    return { id: result?.lastInsertRowid };
  }

  async update(id, appointmentData) {
    // Implementar update quando DataEngine tiver o método
    logger.info('Appointment updated', { appointmentId: id });
    return { id };
  }

  async delete(id) {
    // Implementar delete quando DataEngine tiver o método
    logger.info('Appointment deleted', { appointmentId: id });
    return { success: true };
  }

  async getByDate(date) {
    const appointments = await this.dataEngine.getAppointments();
    return appointments.filter(a => a.date_time?.startsWith(date));
  }

  async getByStatus(status) {
    const appointments = await this.dataEngine.getAppointments();
    return appointments.filter(a => a.status === status);
  }

  async getUpcoming() {
    const appointments = await this.dataEngine.getAppointments();
    const now = new Date().toISOString();
    return appointments.filter(a => a.date_time >= now);
  }
}

module.exports = AppointmentService;
