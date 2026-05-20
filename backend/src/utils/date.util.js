/**
 * Get start and end dates for a specific calendar day in UTC/local ISO bounds
 */
export const getDayBounds = (dateInput = new Date()) => {
  const date = new Date(dateInput);
  
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return { startOfDay, endOfDay };
};

/**
 * Get start and end dates for a specific month
 */
export const getMonthBounds = (month, year) => {
  // month parameter is 1-indexed (1 = January, 12 = December)
  const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
  
  // Go to 0th day of next month to get end of current month
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  return { startOfMonth, endOfMonth };
};

/**
 * Calculate dates range for last week (Monday to Sunday)
 */
export const getLastWeekRange = () => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 (Sun) to 6 (Sat)
  
  // Calculate diff to previous Monday
  const distanceToMonday = (dayOfWeek + 6) % 7;
  const lastMonday = new Date(today);
  lastMonday.setDate(today.getDate() - distanceToMonday - 7);
  lastMonday.setHours(0, 0, 0, 0);

  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  lastSunday.setHours(23, 59, 59, 999);

  return { start: lastMonday, end: lastSunday };
};
