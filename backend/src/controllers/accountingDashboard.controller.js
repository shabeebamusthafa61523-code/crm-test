import Income from '../models/income.model.js';
import Expense from '../models/expense.model.js';
import Purchase from '../models/purchase.model.js';
import EmployeeSalary from '../models/employeeSalary.model.js';
import Invoice from '../models/invoice.model.js';
import { sendSuccess, sendError } from '../utils/response.helper.js';

export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // YTD Dates
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

    // 1. Fetch Incomes
    const incomes = await Income.find({ deleted: { $ne: true }, status: 'Active' });
    const ytdIncome = incomes
      .filter(i => new Date(i.date) >= startOfYear)
      .reduce((sum, i) => sum + i.amount, 0);
    const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);

    // 2. Fetch Expenses (excluding salaries since salaries are tracked in payroll)
    const expenses = await Expense.find({ deleted: { $ne: true }, status: 'Paid' });
    const ytdExpenses = expenses
      .filter(e => new Date(e.expenseDate) >= startOfYear)
      .reduce((sum, e) => sum + e.totalAmount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.totalAmount, 0);

    // 3. Fetch Purchases
    const purchases = await Purchase.find({ deleted: { $ne: true }, status: 'Paid' });
    const ytdPurchases = purchases
      .filter(p => new Date(p.purchaseDate) >= startOfYear)
      .reduce((sum, p) => sum + p.totalAmount, 0);
    const totalPurchases = purchases.reduce((sum, p) => sum + p.totalAmount, 0);

    // 4. Fetch Salaries
    const salaries = await EmployeeSalary.find({ deleted: { $ne: true }, status: 'Paid' });
    const ytdSalaries = salaries
      .filter(s => new Date(s.salaryMonth) >= startOfYear)
      .reduce((sum, s) => sum + s.netSalary, 0);
    const totalSalaries = salaries.reduce((sum, s) => sum + s.netSalary, 0);

    // 5. Invoices
    const invoices = await Invoice.find({ deleted: { $ne: true } });
    const pendingInvoices = invoices.filter(i => ['Pending', 'Overdue'].includes(i.status));
    const paidInvoices = invoices.filter(i => i.status === 'Paid');

    const pendingCount = pendingInvoices.length;
    const pendingAmount = pendingInvoices.reduce((sum, i) => sum + i.grandTotal, 0);
    const paidCount = paidInvoices.length;
    const paidAmount = paidInvoices.reduce((sum, i) => sum + i.grandTotal, 0);

    // 6. Net Profit calculations
    const netProfitYTD = ytdIncome - ytdExpenses - ytdPurchases - ytdSalaries;
    const netProfitTotal = totalIncome - totalExpenses - totalPurchases - totalSalaries;

    // 7. Calculate Monthly Trends (past 6 months)
    const monthlyTrends = [];
    const categoryBreakdown = {};

    // Generate past 6 months intervals
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const monthLabel = d.toLocaleString('default', { month: 'short' });

      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

      // Filter local lists
      const monthIncomes = incomes.filter(inc => {
        const date = new Date(inc.date);
        return date >= startOfMonth && date <= endOfMonth;
      });
      const monthExpenses = expenses.filter(exp => {
        const date = new Date(exp.expenseDate);
        return date >= startOfMonth && date <= endOfMonth;
      });
      const monthPurchases = purchases.filter(pur => {
        const date = new Date(pur.purchaseDate);
        return date >= startOfMonth && date <= endOfMonth;
      });
      const monthSalaries = salaries.filter(sal => {
        const date = new Date(sal.salaryMonth);
        return date >= startOfMonth && date <= endOfMonth;
      });

      const incSum = monthIncomes.reduce((sum, item) => sum + item.amount, 0);
      const expSum = monthExpenses.reduce((sum, item) => sum + item.totalAmount, 0);
      const purSum = monthPurchases.reduce((sum, item) => sum + item.totalAmount, 0);
      const salSum = monthSalaries.reduce((sum, item) => sum + item.netSalary, 0);

      monthlyTrends.push({
        month: monthLabel,
        income: incSum,
        expense: expSum,
        purchase: purSum,
        salary: salSum,
        netProfit: incSum - expSum - purSum - salSum,
        employeeCount: monthSalaries.length
      });
    }

    // Expense Category aggregations
    expenses.forEach(e => {
      categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + e.totalAmount;
    });
    // Add salaries as a category too
    if (totalSalaries > 0) {
      categoryBreakdown['Employee Salary'] = totalSalaries;
    }

    const categoriesFormatted = Object.entries(categoryBreakdown).map(([category, amount]) => ({
      category,
      amount
    }));

    return sendSuccess(res, 'Accounting dashboard metrics calculated', {
      kpis: {
        totalIncome: ytdIncome,
        totalExpenses: ytdExpenses,
        totalPurchases: ytdPurchases,
        salaryExpenses: ytdSalaries,
        netProfit: netProfitYTD,
        pendingInvoices: { count: pendingCount, amount: pendingAmount },
        paidInvoices: { count: paidCount, amount: paidAmount }
      },
      monthlyTrends,
      categoryBreakdown: categoriesFormatted
    });

  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
