/**
 * Notification Service
 * Handles email, SMS, or internal system alerts
 */

export const sendNotification = async (userId, message, type = 'info') => {
  // Mocking the notification logic so your user controller functions safely
  console.log(`[Notification Service] Target User: ${userId} | Type: ${type} | Message: ${message}`);
  return { success: true, timestamp: new Date() };
};

export const sendEmail = async (to, subject, body) => {
  console.log(`[Notification Service] Sending Email to ${to} | Subject: ${subject}`);
  return { success: true };
};

// Create a default export object containing the functions to satisfy both import styles
const notificationService = {
  sendNotification,
  sendEmail
};

export default notificationService;