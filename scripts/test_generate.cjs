const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

async function testGenerate() {
  const key = process.env.GEMINI_API_KEY?.trim();
  const client = new GoogleGenAI({ apiKey: key });
  
  for (const m of ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-2.5-flash']) {
    try {
      const start = Date.now();
      const res = await client.models.generateContent({
        model: m,
        contents: 'Say hello in 3 words'
      });
      console.log(`SUCCESS [${m}] in ${Date.now() - start}ms:`, res.text?.trim());
      break;
    } catch (e) {
      console.log(`FAIL [${m}]:`, e.status || e.message);
    }
  }
}

testGenerate();

