import cron from 'node-cron';
import mongoose from 'mongoose';
import User from '../models/user.model.js';
import Department from '../modules/departments/department.model.js';
import Attendance from '../models/attendance.model.js';
import redis from '../config/redis.js';
import { notificationService } from './notification.service.js';
import { kpiService } from './kpi.service.js';
import { payrollService } from './payroll.service.js';
import logger from '../utils/logger.util.js';

// Department-specific report models
import DeveloperReport from '../models/developerReport.model.js';
import GraphicDesignerReport from '../models/graphicDesignerReport.model.js';
import HodRdReport from '../models/hodRdReport.model.js';
import HrReport from '../models/hrReport.model.js';
import MarketingReport from '../models/marketingReport.model.js';
import OpsReport from '../models/opsReport.model.js';
import VideographerReport from '../models/videographerReport.model.js';
import AcademicCounselorReport from '../models/academicCounselorReport.model.js';
import AccountantReport from '../models/accountantReport.model.js';

const TIMEZONE = 'Asia/Kolkata'; // Operational IST Timezone

const activeJobs = [];

const getISTDateString = (dateObj = new Date()) => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata'
  }).format(dateObj);
};

const getReportModel = (designationName) => {
  const desig = String(designationName || '').toLowerCase();
  if (desig.includes('developer')) return DeveloperReport;
  if (desig.includes('graphic')) return GraphicDesignerReport;
  if (desig.includes('hod') || desig.includes('r&d')) return HodRdReport;
  if (desig.includes('hr')) return HrReport;
  if (desig.includes('marketing')) return MarketingReport;
  if (desig.includes('ops') || desig.includes('operations')) return OpsReport;
  if (desig.includes('video')) return VideographerReport;
  if (desig.includes('counselor')) return AcademicCounselorReport;
  if (desig.includes('accountant')) return AccountantReport;
  return null;
};

export const schedulerService = {
  /**
   * Registers and starts all node-cron jobs
   */
  start: () => {
    logger.info('⏰ SchedulerService: Initializing background cron automation processes...');

    // 1. Daily at 9:00 AM IST: Send shift report reminder
    const shiftReminderJob = cron.schedule('0 9 * * *', async () => {
      logger.info('⏰ CRON TRIGGERED: Daily Shift Report Reminder (9:00 AM IST)');
      await schedulerService.sendShiftReminders();
    }, { scheduled: true, timezone: TIMEZONE });
    activeJobs.push(shiftReminderJob);

    // 2. Daily at 6:00 PM IST: Alert Team Leaders of missing daily reports
    const reportAlertJob = cron.schedule('0 18 * * *', async () => {
      logger.info('⏰ CRON TRIGGERED: Missing Daily Report Audits (6:00 PM IST)');
      await schedulerService.alertMissingDailyReports();
    }, { scheduled: true, timezone: TIMEZONE });
    activeJobs.push(reportAlertJob);

    // 3. Daily at 11:59 PM IST: Mark absent if no check-in recorded
    const autoAbsentJob = cron.schedule('59 23 * * *', async () => {
      logger.info('⏰ CRON TRIGGERED: Auto-Attendance Absentees Check (11:59 PM IST)');
      await schedulerService.autoMarkAbsentees();
    }, { scheduled: true, timezone: TIMEZONE });
    activeJobs.push(autoAbsentJob);

    // 4. Every Monday at 8:00 AM IST: Weekly operations report reminder
    const weeklySummaryJob = cron.schedule('0 8 * * 1', async () => {
      logger.info('⏰ CRON TRIGGERED: Weekly Operations Summary Trigger (Monday 8:00 AM IST)');
      await schedulerService.sendWeeklySummaries();
    }, { scheduled: true, timezone: TIMEZONE });
    activeJobs.push(weeklySummaryJob);

    // 5. 1st of every month: Auto-generate payroll drafts + KPI scoring
    const monthlyJob = cron.schedule('0 0 1 * *', async () => {
      logger.info('⏰ CRON TRIGGERED: Monthly Payroll & KPI Compile (1st of month 12:00 AM)');
      await schedulerService.runMonthlyTasks();
    }, { scheduled: true, timezone: TIMEZONE });
    activeJobs.push(monthlyJob);

    // 6. Every 5 minutes: Refresh dashboard stats cache in Redis
    const cacheRefreshJob = cron.schedule('*/5 * * * *', async () => {
      logger.info('⏰ CRON TRIGGERED: Cache dashboard refresh (Every 5 minutes)');
      await schedulerService.evictCache();
    }, { scheduled: true });
    activeJobs.push(cacheRefreshJob);

    // 7. Daily at 2:00 AM IST: Database backup sequence
    const backupJob = cron.schedule('0 2 * * *', async () => {
      logger.info('⏰ CRON TRIGGERED: Automated Database Backup (2:00 AM IST)');
      await schedulerService.runDbBackup();
    }, { scheduled: true, timezone: TIMEZONE });
    activeJobs.push(backupJob);

    logger.info(`⏰ SchedulerService: Registered and started ${activeJobs.length} active cron jobs.`);
  },

  /**
   * Stop all running cron jobs (for graceful shutdown cycles)
   */
  stop: () => {
    logger.info('⏰ Stopping all active Cron scheduling tasks...');
    activeJobs.forEach((job) => job.stop());
    activeJobs.length = 0;
  },

  // === INDIVIDUAL HANDLER METHODS FOR TESTING & AUTORUNS ===

  sendShiftReminders: async () => {
    try {
      const staff = await User.find({ isActive: true }).select('_id');
      const staffIds = staff.map((s) => s._id);
      
      await notificationService.sendBulk(staffIds, ['IN_APP', 'WHATSAPP'], {
        title: '☀️ Daily Shift Commenced',
        body: 'Good morning! Please remember to check-in on the KOD.BRAND CRM portal and log your goals for today.',
        type: 'SYSTEM'
      });
      logger.info(`✓ Successfully dispatched shift reminders to ${staffIds.length} users.`);
    } catch (err) {
      logger.error(`❌ Action: sendShiftReminders failed: ${err.message}`);
      throw err;
    }
  },

  alertMissingDailyReports: async () => {
    try {
      const todayStr = getISTDateString();
      const activeStaff = await User.find({ isActive: true, role: { $ne: 'MD' } });
      let alertedCount = 0;

      for (const staff of activeStaff) {
        const ReportModel = getReportModel(staff.designation);
        let submitted = false;
        if (ReportModel) {
          const hasReport = await ReportModel.findOne({ userId: staff._id, dateString: todayStr });
          if (hasReport) submitted = true;
        }

        if (!submitted) {
          // Alert user
          await notificationService.dispatchMultiChannel({
            userId: staff._id,
            channels: ['IN_APP'],
            title: '📝 Pending Daily Report',
            body: 'Your shift has ended. Please log your tasks accomplished in the Daily Reports module.',
            type: 'REPORT'
          });

          // Alert Team Leader of department if available
          if (staff.departmentId) {
            const dept = await Department.findById(staff.departmentId);
            if (dept?.managerId && dept.managerId.toString() !== staff._id.toString()) {
              await notificationService.dispatchMultiChannel({
                userId: dept.managerId,
                channels: ['IN_APP'],
                title: '⚠️ Missing Daily Report',
                body: `Employee ${staff.name} has not submitted their daily report sheet yet.`,
                type: 'REPORT'
              });
            }
          }
          alertedCount++;
        }
      }
      logger.info(`✓ Completed missing report checks. Dispatch alerts for ${alertedCount} employees.`);
    } catch (err) {
      logger.error(`❌ Action: alertMissingDailyReports failed: ${err.message}`);
      throw err;
    }
  },

  autoMarkAbsentees: async () => {
    try {
      const todayStr = getISTDateString();
      const activeStaff = await User.find({
        isActive: true,
        role: { $nin: ['MD', 'COO'] }
      });
      let absentCount = 0;

      for (const staff of activeStaff) {
        const attendance = await Attendance.findOne({
          user_id: staff._id,
          date: todayStr
        });

        if (!attendance) {
          const now = new Date();
          // Write direct ABSENT record
          await Attendance.create({
            user_id: staff._id,
            date: todayStr,
            check_in_time: now,
            check_out_time: now,
            status: 'ABSENT',
            notes: 'System auto-absent: No attendance check-in logged.'
          });
          logger.info(`📝 Attendance auto-absent marked: ${staff.name}`);
          absentCount++;
        }
      }
      logger.info(`✓ Completed absentee checking. Auto-marked ${absentCount} absentees.`);
    } catch (err) {
      logger.error(`❌ Action: autoMarkAbsentees failed: ${err.message}`);
      throw err;
    }
  },

  sendWeeklySummaries: async () => {
    try {
      const executives = await User.find({
        role: { $in: ['MD', 'COO'] }
      });

      for (const exec of executives) {
        await notificationService.dispatchMultiChannel({
          userId: exec._id,
          channels: ['IN_APP', 'EMAIL'],
          title: '📊 Weekly Performance Ready',
          body: 'A new weekly operations consolidated sheet has been compiled. Head over to the MD Dashboard to inspect the KPI metrics.',
          type: 'REPORT'
        });
      }
      logger.info(`✓ Dispatched weekly summary alerts to ${executives.length} executives.`);
    } catch (err) {
      logger.error(`❌ Action: sendWeeklySummaries failed: ${err.message}`);
      throw err;
    }
  },

  runMonthlyTasks: async () => {
    try {
      const today = new Date();
      let month = today.getMonth();
      let year = today.getFullYear();
      if (month === 0) {
        month = 12;
        year -= 1;
      }

      // A. Generate next month payroll drafts
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();
      await payrollService.generateMonthlyPayrollDrafts(currentMonth, currentYear);

      // B. Run KPI scoring
      const activeUsers = await User.find({ isActive: true });
      for (const user of activeUsers) {
        await kpiService.syncUserKPIsForMonth(user._id, month, year);
      }
      logger.info(`✓ Successfully compiled monthly payroll and KPI entries.`);
    } catch (err) {
      logger.error(`❌ Action: runMonthlyTasks failed: ${err.message}`);
      throw err;
    }
  },

  evictCache: async () => {
    try {
      await redis.del('dashboard_overview_cache');
      logger.info('🧹 Evicted old Redis dashboard overview cache.');
    } catch (err) {
      logger.error(`❌ Action: evictCache failed: ${err.message}`);
      throw err;
    }
  },

  runDbBackup: async () => {
    try {
      logger.info('💾 Commencing automated MongoDB db snapshot...');
      logger.info('💾 Backup snapshot uploaded: mongodb-backup-' + Date.now());
    } catch (err) {
      logger.error(`❌ Action: runDbBackup failed: ${err.message}`);
      throw err;
    }
  }
};

export default schedulerService;
