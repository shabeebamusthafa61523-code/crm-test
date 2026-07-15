export const kpiService = {
  syncUserKPIsForMonth: async (userId, month, year) => {
    console.log(`[KPI Service] Mock synced KPIs for User ${userId} for ${month}/${year}`);
    return true;
  }
};
