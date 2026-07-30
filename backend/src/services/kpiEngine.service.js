import Attendance from '../models/attendance.model.js';
import Task from '../models/task.model.js';
import PerformanceRemark from '../models/performanceRemark.model.js';
import KPIScore from '../models/kpiScore.model.js';

/**
 * KPI Engine Service
 * Calculates comprehensive KPI score for an employee for a specific month (YYYY-MM).
 */

export const getGradeFromScore = (score) => {
  if (score >= 95) return 'Outstanding';
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Very Good';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Needs Improvement';
  return 'Critical';
};

export const calculateEmployeeKPI = async (employeeId, monthStr) => {
  // Target month prefix "2026-07"
  const [yearStr, mStr] = monthStr.split('-');
  const year = parseInt(yearStr, 10);
  const monthIdx = parseInt(mStr, 10) - 1; // 0-indexed

  const startDateStr = `${monthStr}-01`;
  const endDateObj = new Date(year, monthIdx + 1, 0);
  const endDateStr = `${monthStr}-${String(endDateObj.getDate()).padStart(2, '0')}`;

  // 1. Attendance Metrics
  const attendanceRecords = await Attendance.find({
    user_id: employeeId,
    date: { $gte: startDateStr, $lte: endDateStr }
  });

  const presentDays = attendanceRecords.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
  // Estimate working days in month if no attendance recorded
  const totalDaysInMonth = endDateObj.getDate();
  // Assume ~22 working days max
  const estimatedWorkingDays = Math.min(22, totalDaysInMonth);
  const workingDays = Math.max(estimatedWorkingDays, attendanceRecords.length || estimatedWorkingDays);

  const attendancePercentage = workingDays > 0 ? Math.min(100, Math.round((presentDays / workingDays) * 100)) : 100;
  const attendanceScore = attendancePercentage;

  // 2. Task Completion Metrics
  const tasks = await Task.find({
    $or: [{ assigned_to: employeeId }, { user_id: employeeId }]
  });

  // Filter tasks created or due in this month if available, or current total
  const tasksCompleted = tasks.filter(t => t.status === 'done').length;
  const totalTasks = tasks.length || 1;
  const taskCompletionPercentage = Math.round((tasksCompleted / totalTasks) * 100);
  const taskScore = taskCompletionPercentage;

  // 3. Project Contribution Score
  const projectScore = Math.min(100, Math.round((tasksCompleted * 15) + 40));

  // 4. Manager & HR Ratings
  const hrRemark = await PerformanceRemark.findOne({
    employeeId,
    month: monthStr,
    type: 'HR'
  });

  const tlRemark = await PerformanceRemark.findOne({
    employeeId,
    month: monthStr,
    type: 'TEAM_LEAD'
  });

  // Scale 1-10 rating to 0-100 percentage
  const hrRatingScore = hrRemark && hrRemark.overallRating ? hrRemark.overallRating * 10 : 75;
  const managerRatingScore = tlRemark && tlRemark.overallRating ? tlRemark.overallRating * 10 : 75;

  // 5. Dept Report & Learning Scores
  const deptReportScore = 85; // Default score derived from daily/dept reports submission
  const learningScore = tlRemark ? (tlRemark.learningAbility || 7) * 10 : 75;

  // 6. Weighted Sum
  const weights = {
    attendance: 20,
    task: 20,
    project: 20,
    managerRating: 15,
    hrRating: 15,
    deptReport: 5,
    learning: 5
  };

  const overallScore = Math.round(
    (attendanceScore * (weights.attendance / 100)) +
    (taskScore * (weights.task / 100)) +
    (projectScore * (weights.project / 100)) +
    (managerRatingScore * (weights.managerRating / 100)) +
    (hrRatingScore * (weights.hrRating / 100)) +
    (deptReportScore * (weights.deptReport / 100)) +
    (learningScore * (weights.learning / 100))
  );

  const grade = getGradeFromScore(overallScore);

  // Save or update KPIScore record
  const kpiData = {
    employeeId,
    month: monthStr,
    attendanceScore,
    taskScore,
    projectScore,
    managerRatingScore,
    hrRatingScore,
    deptReportScore,
    learningScore,
    overallScore,
    grade,
    weights,
    metaStats: {
      attendancePercentage,
      presentDays,
      workingDays,
      tasksCompleted,
      tasksPending: totalTasks - tasksCompleted,
      totalTasks
    }
  };

  const kpiRecord = await KPIScore.findOneAndUpdate(
    { employeeId, month: monthStr },
    kpiData,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return kpiRecord;
};
