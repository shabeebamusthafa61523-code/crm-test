import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

async function listModels() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Since listModels isn't always exposed in the JS SDK depending on version,
    // we will just try to fetch a URL using native fetch
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    console.log(JSON.stringify(data.models.map(m => m.name), null, 2));
  } catch (error) {
    console.error("Error listing models:", error);
  }
}

listModels();
