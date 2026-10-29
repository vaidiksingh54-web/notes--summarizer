const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

async function listAllModels() {
  const key = process.env.GEMINI_API_KEY?.trim();
  const client = new GoogleGenAI({ apiKey: key });
  try {
    const list = await client.models.list();
    console.log('Available models:');
    for await (const m of list) {
      if (m.name.includes('gemini') || m.name.includes('flash')) {
        console.log(' -', m.name);
      }
    }
  } catch (err) {
    console.error('List models error:', err.message || err);
  }
}

listAllModels();

