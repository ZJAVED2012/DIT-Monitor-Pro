
import { GoogleGenAI } from "@google/genai";
import { Device } from "../types";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getSystemInsights = async (devices: Device[]) => {
  // Always create a fresh instance to ensure up-to-date API key usage
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  // Summarize critical info for the prompt to keep token count low
  const summary = devices.map(d => ({
    name: d.name,
    status: d.status,
    cpu: Math.round(d.metrics[d.metrics.length - 1]?.cpu || 0),
    ram: Math.round(d.metrics[d.metrics.length - 1]?.ram || 0)
  }));

  const prompt = `
    You are an expert systems administrator. Analyze this system state:
    ${JSON.stringify(summary)}
    
    Provide a professional summary of health. 
    Identify bottlenecks or anomalies.
    Suggest 3 actionable optimizations.
    Limit to 150 words.
  `;

  let retries = 0;
  const maxRetries = 3;
  let baseDelay = 2000;

  while (retries < maxRetries) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          temperature: 0.7,
          topP: 0.95,
        },
      });

      return response.text;
    } catch (error: any) {
      const isRateLimit = error?.message?.includes('429') || error?.status === 429;
      
      if (isRateLimit && retries < maxRetries - 1) {
        retries++;
        const delay = baseDelay * Math.pow(2, retries);
        console.warn(`Gemini rate limit hit. Retrying in ${delay}ms... (Attempt ${retries}/${maxRetries})`);
        await sleep(delay);
        continue;
      }

      console.error("Gemini Insights Error:", error);
      
      if (isRateLimit) {
        return "QUOTA_EXHAUSTED: System analysis is currently at capacity. Please try again in a few minutes.";
      }
      
      return "Unable to generate insights at this moment. Please check network connectivity.";
    }
  }
};
