import Groq from 'groq-sdk';

const apiKey = process.env.Groq_API_KEY || process.env.GROQ_API_KEY;
const groq = apiKey ? new Groq({ apiKey }) : null;

export const generateAIReport = async (prompt, dataContext = null, jsonMode = false) => {
  const fullPrompt = dataContext 
    ? `${prompt}\n\nHere is the JSON data to analyze:\n${JSON.stringify(dataContext, null, 2)}`
    : prompt;

  if (groq) {
    try {
      console.log("🔄 Generating AI Report using Groq (llama-3.3-70b-versatile)...");
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: fullPrompt,
          },
        ],
        model: "llama-3.3-70b-versatile",
        ...(jsonMode && { response_format: { type: "json_object" } })
      });
      
      return chatCompletion.choices[0]?.message?.content || "";
    } catch (error) {
      console.error("🚨 Groq AI Generation failed:", error.message);
      return fallbackMockReport(prompt, dataContext, true);
    }
  } else {
    console.log("ℹ️ No Groq API Key found. Falling back to Smart Mock Mode.");
    return fallbackMockReport(prompt, dataContext, false);
  }
};

export const generateAIChat = async (messages, context = null) => {
  if (groq) {
    try {
      const systemMessage = {
        role: "system",
        content: `You are an expert HR AI Assistant. Your job is to answer questions based on the following report context.\n\nCONTEXT:\n${context || "No context provided."}`
      };
      
      const chatCompletion = await groq.chat.completions.create({
        messages: [systemMessage, ...messages],
        model: "llama-3.3-70b-versatile",
      });
      return chatCompletion.choices[0]?.message?.content || "";
    } catch (error) {
      console.error("Groq Chat Error:", error);
      return "I'm sorry, I am currently experiencing connection issues to the Groq API.";
    }
  } else {
    return "This is the Smart Mock Mode chatbot. Since there is no API key, I am just a placeholder response! Please add the Groq API key to your environment variables to enable real AI Chat.";
  }
};

const fallbackMockReport = (prompt, dataContext, apiFailed = false) => {
  const isMonthly = prompt.includes("MONTHLY") || prompt.includes("Monthly") || prompt.includes("monthly");
  
  let topEmployeeStr = "N/A";
  let topCount = -1;
  
  if (dataContext && dataContext.employeeStats) {
      Object.entries(dataContext.employeeStats).forEach(([name, stats]) => {
          if (stats.done > topCount) {
              topCount = stats.done;
              topEmployeeStr = name;
          }
      });
  }

  const noticeMessage = apiFailed 
    ? "> **Notice:** The Groq API is currently unavailable. This report was generated in *Smart Mock Mode* using local data rules as a seamless fallback."
    : "> **Notice:** This report is generated in *Smart Mock Mode* using local data rules because no `Groq_API_KEY` was found in the environment.";

  if (isMonthly) {
    const markdownReport = `# 🤖 AI Monthly Performance Insights (Fallback Mode)

${noticeMessage}

## 🏆 Employee of the Month

**🥇 ${topEmployeeStr !== "N/A" ? topEmployeeStr : "System Admin"}**

**Why?** 
Based on the real database records, ${topEmployeeStr !== "N/A" ? topEmployeeStr : "they"} achieved the highest velocity this month, clearing **${topCount > -1 ? topCount : 5}** tasks completely. Their consistent output significantly reduced the department's backlog!

## 📊 Monthly Overview
- **Productivity:** The team has maintained a steady pace. 
- **Bottlenecks:** Please check the pending task queues for any users with more than 5 pending tasks.
`;
    return JSON.stringify({
      summary: `Monthly analysis complete. Top performer: ${topEmployeeStr}.`,
      teamVibe: "🚀 Peak Performance",
      employeeOfTheMonth: {
        name: topEmployeeStr !== "N/A" ? topEmployeeStr : "System Admin",
        reason: `Highest task completion rate this month with ${topCount > -1 ? topCount : 5} tasks completed.`
      },
      markdownReport
    });
  } else {
    const markdownReport = `# 🤖 AI Daily Status Report (Fallback Mode)

${noticeMessage}

## 🚀 Today's Highlights
- **Activity:** The team successfully closed several tickets today.
- **Attendance:** Please review the dashboard for offline staff.

## ⚠️ Potential Issues
- Keep an eye on tasks stuck in the "preview" stage for more than 24 hours.
`;
    return JSON.stringify({
      summary: "Daily analysis complete. Steady productivity maintained across departments.",
      teamVibe: "⚡ Focused",
      employeeOfTheMonth: {
        name: "N/A",
        reason: ""
      },
      markdownReport
    });
  }
};
