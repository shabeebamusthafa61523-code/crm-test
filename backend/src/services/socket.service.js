import { getSocketIO } from '../config/socket.js';
import logger from '../utils/logger.util.js';

export const socketService = {
  /**
   * Broadcast real-time MD dashboard stats to all connected executives (MD & COO)
   * Namespace: /dashboard, Event: dashboard:stats_update
   */
  broadcastStatsUpdate: (stats) => {
    try {
      const io = getSocketIO();
      io.of('/dashboard').to('md-coo-hq').emit('dashboard:stats_update', stats);
      logger.debug('🔌 WebSockets: Broadcasted dashboard stats update successfully.');
    } catch (error) {
      logger.warn(`🔌 WS Broadcast failed (Server likely offline or uninitialized): ${error.message}`);
    }
  },

  /**
   * Notify executives instantly when a new invoice, payroll, or leave requires MD/COO approval
   * Namespace: /dashboard, Event: dashboard:new_approval
   */
  emitNewApproval: (approvalDetails) => {
    try {
      const io = getSocketIO();
      io.of('/dashboard').to('md-coo-hq').emit('dashboard:new_approval', approvalDetails);
      logger.info(`🔌 WebSockets: Dispatched live approval request alert (Type: ${approvalDetails.type}).`);
    } catch (error) {
      logger.warn(`🔌 WS Live Approval alert skipped: ${error.message}`);
    }
  },

  /**
   * Dispatches critical security or system anomalies to MD/COO (e.g. failed login spikes)
   * Namespace: /dashboard, Event: dashboard:alert
   */
  emitCriticalAlert: (alertDetails) => {
    try {
      const io = getSocketIO();
      io.of('/dashboard').to('md-coo-hq').emit('dashboard:alert', alertDetails);
      logger.warn(`🔌 WebSockets: Broadcasted CRITICAL security alert packet.`);
    } catch (error) {
      logger.warn(`🔌 WS Security alert skipped: ${error.message}`);
    }
  },

  /**
   * Broadcasts counts of active online personnel on the dashboard
   * Namespace: /dashboard, Event: dashboard:staff_online_count
   */
  emitStaffOnlineCount: (count) => {
    try {
      const io = getSocketIO();
      io.of('/dashboard').to('md-coo-hq').emit('dashboard:staff_online_count', { onlineCount: count });
      logger.debug(`🔌 WebSockets: Broadcasted active staff count: ${count}`);
    } catch (error) {
      logger.warn(`🔌 WS Staff count alert skipped: ${error.message}`);
    }
  },

  /**
   * Streams a real-time card alert of staff checking-in/out to managers
   * Namespace: /attendance, Event: attendance:checkin
   */
  emitAttendanceClockIn: (attendanceDetails) => {
    try {
      const io = getSocketIO();
      io.of('/attendance').to('management-feed').emit('attendance:checkin', attendanceDetails);
      logger.info(`🔌 WebSockets: Broadcasted live clock-in card for employee ${attendanceDetails.userName}`);
    } catch (error) {
      logger.warn(`🔌 WS Attendance live feed alert skipped: ${error.message}`);
    }
  },

  /**
   * Broadcasts a new employee onboarding event to all connected admins
   * Namespace: /dashboard, Event: dashboard:new_employee
   */
  emitNewEmployee: (employeeDetails) => {
    try {
      const io = getSocketIO();
      io.of('/dashboard').to('md-coo-hq').emit('dashboard:new_employee', employeeDetails);
      logger.info(`🔌 WebSockets: Broadcasted new employee onboarding event (${employeeDetails.name}).`);
    } catch (error) {
      logger.warn(`🔌 WS New employee broadcast skipped: ${error.message}`);
    }
  }
};

export default socketService;
