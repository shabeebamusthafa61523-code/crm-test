import Task from '../models/task.model.js';
import User from '../models/user.model.js';
import DeveloperReport from '../models/developerReport.model.js';
import HrReport from '../models/hrReport.model.js';
import MarketingReport from '../models/marketingReport.model.js';
import OpsReport from '../models/opsReport.model.js';
import GraphicDesignerReport from '../models/graphicDesignerReport.model.js';
import VideographerReport from '../models/videographerReport.model.js';
import HodRdReport from '../models/hodRdReport.model.js';
import AccountantReport from '../models/accountantReport.model.js';
import AcademicCounselorReport from '../models/academicCounselorReport.model.js';
import { generateAIReport, generateAIChat } from '../services/ai.service.js';
import AiReportCache from '../models/aiReportCache.model.js';

const getLatestDbUpdateTime = async (departmentId, checkReports = false) => {
  const taskQuery = {};
  const reportQuery = {};
  if (departmentId && departmentId !== 'all') {
    const usersInDept = await User.find({ departmentId });
    const userIds = usersInDept.map(u => u._id);
    taskQuery.assigned_to = { $in: userIds };
    reportQuery.userId = { $in: userIds };
  }

  const latestTask = await Task.findOne(taskQuery).sort({ updatedAt: -1 }).select('updatedAt').lean();
  let latestTime = latestTask ? new Date(latestTask.updatedAt).getTime() : 0;

  if (checkReports) {
    const promises = [
      DeveloperReport.findOne(reportQuery).sort({ updatedAt: -1 }).select('updatedAt').lean(),
      HrReport.findOne(reportQuery).sort({ updatedAt: -1 }).select('updatedAt').lean(),
      MarketingReport.findOne(reportQuery).sort({ updatedAt: -1 }).select('updatedAt').lean(),
      OpsReport.findOne(reportQuery).sort({ updatedAt: -1 }).select('updatedAt').lean(),
      GraphicDesignerReport.findOne(reportQuery).sort({ updatedAt: -1 }).select('updatedAt').lean(),
      VideographerReport.findOne(reportQuery).sort({ updatedAt: -1 }).select('updatedAt').lean(),
      HodRdReport.findOne(reportQuery).sort({ updatedAt: -1 }).select('updatedAt').lean(),
      AccountantReport.findOne(reportQuery).sort({ updatedAt: -1 }).select('updatedAt').lean(),
      AcademicCounselorReport.findOne(reportQuery).sort({ updatedAt: -1 }).select('updatedAt').lean()
    ];
    const results = await Promise.all(promises);
    const times = results.filter(r => r && r.updatedAt).map(r => new Date(r.updatedAt).getTime());
    if (times.length > 0) {
      latestTime = Math.max(latestTime, ...times);
    }
  }

  return latestTime;
};

const fetchAllReports = async (query) => {
    const promises = [
        DeveloperReport.find(query).populate('userId', 'name').lean(),
        HrReport.find(query).populate('userId', 'name').lean(),
        MarketingReport.find(query).populate('userId', 'name').lean(),
        OpsReport.find(query).populate('userId', 'name').lean(),
        GraphicDesignerReport.find(query).populate('userId', 'name').lean(),
        VideographerReport.find(query).populate('userId', 'name').lean(),
        HodRdReport.find(query).populate('userId', 'name').lean(),
        AccountantReport.find(query).populate('userId', 'name').lean(),
        AcademicCounselorReport.find(query).populate('userId', 'name').lean()
    ];
    const results = await Promise.all(promises);
    return results.flat();
};

export const getDailyReport = async (req, res) => {
  try {
    const { department, force } = req.query;
    const deptId = department || 'all';
    const isForce = force === 'true';

    // 1. Check Cache
    if (!isForce) {
      const cached = await AiReportCache.findOne({ type: 'daily', departmentId: deptId });
      if (cached) {
        const latestUpdate = await getLatestDbUpdateTime(deptId, false);
        if (latestUpdate <= new Date(cached.lastGenerated).getTime()) {
          console.log("⚡ Returning cached Daily AI Report!");
          return res.status(200).json({
            success: true,
            report: cached.report,
            stats: cached.stats,
            cached: true
          });
        }
      }
    }
    
    const taskQuery = {};
    
    // Filter users by department if requested
    let validUserIds = null;
    if (department && department !== 'all') {
       const usersInDept = await User.find({ departmentId: department });
       validUserIds = usersInDept.map(u => u._id);
       taskQuery.assigned_to = { $in: validUserIds };
    }

    const allTasks = await Task.find(taskQuery).populate('assigned_to', 'name');

    // Aggregate stats representing the entire board state
    const taskStats = {
      done: allTasks.filter(t => t.status === 'done').length,
      pending: allTasks.filter(t => t.status === 'pending').length,
      current: allTasks.filter(t => t.status === 'current').length,
      preview: allTasks.filter(t => t.status === 'preview').length,
      total: allTasks.length
    };

    // Extract basic details of only today's active/updated tasks for text summary context
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const recentTasks = allTasks
      .filter(t => t.updatedAt >= today || t.status !== 'done')
      .map(t => ({
        title: t.title || 'Untitled Task',
        status: t.status,
        assignee: t.assigned_to ? t.assigned_to.name : 'Unassigned'
      }));

    const prompt = `You are an expert Company Operations & HR Analyst. I am providing you with today's task statistics and specific task details for our entire company across all departments (including Development, Design, Marketing, Operations, HODs, and HR). 
Please generate a report.
You MUST analyze and overview all tasks in the company, regardless of who created or assigned them, ensuring you cover all departments and not just HR-related tasks.
You MUST respond with a JSON object matching this schema:
{
  "summary": "A short 1-sentence summary of today's status across all departments",
  "teamVibe": "A status representing the team's vibe today (e.g. '🔥 High Efficiency', '⚡ Focused', '🐢 Slow Progress', '☕ Steady')",
  "employeeOfTheMonth": {
     "name": "N/A",
     "reason": "Today is a daily report, so leave this as N/A"
  },
  "markdownReport": "The full, professional Daily Status Report summarizing the day's highlights, what specific tasks were worked on across all departments, and any potential bottlenecks, written in Markdown. Do not include placeholders."
}
Here is the data: ${JSON.stringify({ stats: taskStats, recentTasks: recentTasks })}`;

    const reportRaw = await generateAIReport(prompt, null, true);
    
    let reportData;
    try {
      reportData = JSON.parse(reportRaw);
    } catch(e) {
      reportData = {
        summary: "Daily analysis complete. Review the report below.",
        teamVibe: "⚡ Focused",
        employeeOfTheMonth: { name: "N/A", reason: "" },
        markdownReport: reportRaw
      };
    }

    // 2. Save or update cache
    const cachedStats = {
      summary: reportData.summary,
      teamVibe: reportData.teamVibe,
      employeeOfTheMonth: reportData.employeeOfTheMonth
    };

    await AiReportCache.findOneAndUpdate(
      { type: 'daily', departmentId: deptId },
      {
        report: reportData.markdownReport,
        stats: cachedStats,
        lastGenerated: new Date()
      },
      { upsert: true, new: true }
    );

    res.status(200).json({ 
      success: true, 
      report: reportData.markdownReport,
      stats: cachedStats
    });
  } catch (error) {
    console.error("Error generating daily AI report:", error);
    res.status(500).json({ success: false, message: "Failed to generate report." });
  }
};

export const getMonthlyReport = async (req, res) => {
  try {
    const { department, force } = req.query;
    const deptId = department || 'all';
    const isForce = force === 'true';

    // 1. Check Cache
    if (!isForce) {
      const cached = await AiReportCache.findOne({ type: 'monthly', departmentId: deptId });
      if (cached) {
        const latestUpdate = await getLatestDbUpdateTime(deptId, true);
        if (latestUpdate <= new Date(cached.lastGenerated).getTime()) {
          console.log("⚡ Returning cached Monthly AI Report!");
          return res.status(200).json({
            success: true,
            report: cached.report,
            stats: cached.stats,
            cached: true
          });
        }
      }
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    let validUserIds = null;
    const taskQuery = {};
    const reportQuery = { createdAt: { $gte: startOfMonth } };

    if (department && department !== 'all') {
       const usersInDept = await User.find({ departmentId: department });
       validUserIds = usersInDept.map(u => u._id);
       taskQuery.assigned_to = { $in: validUserIds };
       reportQuery.userId = { $in: validUserIds };
    }

    // Parallel fetch tasks and written reports
    const [allTasks, writtenReports] = await Promise.all([
        Task.find(taskQuery).populate('assigned_to', 'name'),
        fetchAllReports(reportQuery)
    ]);

    const employeeStats = {};

    // 1. Process Task Data
    allTasks.forEach(task => {
      if (!task.assigned_to) return;
      const userName = task.assigned_to.name;
      if (!employeeStats[userName]) {
        employeeStats[userName] = { total: 0, done: 0, pending: 0, reportsSubmitted: 0, selfEvaluations: [] };
      }
      employeeStats[userName].total += 1;
      if(employeeStats[userName][task.status] !== undefined) {
          employeeStats[userName][task.status] += 1;
      } else {
          employeeStats[userName][task.status] = 1;
      }
    });

    // 2. Process Qualitative Report Data (Reading what they submitted)
    writtenReports.forEach(report => {
        if (!report.userId) return;
        const userName = report.userId.name;
        if (!employeeStats[userName]) {
            employeeStats[userName] = { total: 0, done: 0, pending: 0, reportsSubmitted: 0, selfEvaluations: [] };
        }
        
        employeeStats[userName].reportsSubmitted += 1;
        
        // Extract critical textual data to evaluate their actual performance and challenges
        const evaluationStr = [];
        if (report.performanceTracker) {
            evaluationStr.push(`Performance: ${JSON.stringify(report.performanceTracker)}`);
        }
        if (report.challengesFaced) {
            evaluationStr.push(`Challenges: ${report.challengesFaced}`);
        }
        if (report.internRemarks || report.dailyTaskSummary) {
            evaluationStr.push(`Summary: Submitted detailed logs`);
        }
        
        if (evaluationStr.length > 0 && employeeStats[userName].selfEvaluations.length < 5) {
             // Cap to prevent token overflow for large companies
            employeeStats[userName].selfEvaluations.push(evaluationStr.join(" | "));
        }
    });

    const prompt = `You are an expert Company Operations & HR Director evaluating the entire company's monthly performance data across all departments (including Development, Design, Marketing, Operations, HODs, and HR).
I am providing you with task completion statistics and self-evaluation data for each employee in the company.
Please generate the monthly insights.
You MUST analyze all tasks and reports in the system, regardless of who created or assigned them, to give a true overview of the entire company, not just HR-assigned tasks.
You MUST select exactly ONE (1) "Employee of the Month" from any department based on their performance and explain why they won by analyzing BOTH their task numbers AND reading the specific challenges/performance data they submitted in their own reports.
You MUST respond with a JSON object matching this schema:
{
  "summary": "A short 1-sentence summary of this month's status across all departments",
  "teamVibe": "A status representing the team's vibe this month (e.g. '🚀 Peak Performance', '📈 Growing', '⚠️ Under Pressure')",
  "employeeOfTheMonth": {
     "name": "Name of the single employee selected as Employee of the Month",
     "reason": "A 1-sentence explanation of why they won, analyzing their task numbers and report data"
  },
  "markdownReport": "The full Monthly Performance Insights report. Provide a short Monthly Overview of the rest of the team's performance, highlights, and any bottlenecks across all departments. Format in Markdown. Do not include placeholders."
}
Here is the data: ${JSON.stringify({ employeeStats })}`;

    const reportRaw = await generateAIReport(prompt, { employeeStats }, true);

    let reportData;
    try {
      reportData = JSON.parse(reportRaw);
    } catch(e) {
      reportData = {
        summary: "Monthly analysis complete. Review the performance insights below.",
        teamVibe: "🚀 Stable",
        employeeOfTheMonth: { name: "System Admin", reason: "Maintained baseline task completion." },
        markdownReport: reportRaw
      };
    }

    // 2. Save or update cache
    const cachedStats = {
      summary: reportData.summary,
      teamVibe: reportData.teamVibe,
      employeeOfTheMonth: reportData.employeeOfTheMonth
    };

    await AiReportCache.findOneAndUpdate(
      { type: 'monthly', departmentId: deptId },
      {
        report: reportData.markdownReport,
        stats: cachedStats,
        lastGenerated: new Date()
      },
      { upsert: true, new: true }
    );

    res.status(200).json({ 
      success: true, 
      report: reportData.markdownReport,
      stats: cachedStats
    });
  } catch (error) {
    console.error("Error generating monthly AI report:", error);
    res.status(500).json({ success: false, message: "Failed to generate report." });
  }
};

export const chatWithAi = async (req, res) => {
    try {
        const { messages, context } = req.body;
        
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ success: false, message: "Invalid messages format." });
        }

        const reply = await generateAIChat(messages, context);
        res.status(200).json({ success: true, reply });
    } catch(error) {
        console.error("Chat error:", error);
        res.status(500).json({ success: false, message: "Failed to process chat." });
    }
}
