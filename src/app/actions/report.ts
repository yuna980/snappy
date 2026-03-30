"use server";

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PRIVATE_GEMINI_API_KEY || "");

export async function generateMonthlyReport(monthStr: string, snapsData: { keyword: string, date: string }[]) {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            title: { type: SchemaType.STRING },
            tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            fullText: { type: SchemaType.STRING },
            theme: { type: SchemaType.STRING }
          },
          required: ["title", "tags", "fullText", "theme"]
        }
      }
    });

    const dataPrompt = snapsData.map(s => `- ${s.date}: ${s.keyword}`).join('\n');

    const prompt = `
      You are an AI analyst for 'Snappy', a life observation app.
      A user has captured these moments in ${monthStr}:
      ${dataPrompt}

      Task: Generate a personalized 'title' (personality nickname), 2 'tags' (summary traits), and a short 'fullText' (analysis message).
      The analysis should be warm, observant, and encouraging. Focus on the common themes, colors, or vibes in their observation record.
      
      Response Format (JSON):
      {
        "title": "A poetic title for the user based on their observations (e.g., 'Silent Morning Explorer')",
        "tags": ["2 traits or percentage analysis like 'Night Activity 70%', 'Warm Color Preference'"],
        "fullText": "A 1-2 sentence deep analysis of the user's observation style for the month.",
        "theme": "A color theme matching the vibe (orange | blue | purple | green)"
      }
      
      Respond only in JSON.
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Report Generation Error:", error);
    // Fallback Mock if AI fails
    return {
      title: "따뜻한 시선의 관찰자",
      tags: ["기록의 가치", "매일의 발견"],
      fullText: "전달된 데이터가 부족하거나 분석 중 오류가 발생했습니다. 하지만 당신의 기록은 그 자체로 충분히 특별합니다.",
      theme: "orange"
    };
  }
}

export async function getAIDailyMission(dateStr: string) {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            prefix: { type: SchemaType.STRING },
            keyword: { type: SchemaType.STRING }
          },
          required: ["prefix", "keyword"]
        }
      }
    });

    const prompt = `
      You are a creative writer for 'Snappy', a daily life observation app.
      Today is ${dateStr}. 
      
      Your goal is to generate a 'Mission' that encourages deep, emotional, and sensory observation of mundane things.
      The mission must have two parts:
      1. prefix: A short, poetic phrase (e.g., 'Even though you pass it every day', 'Something that feels unusually...')
      2. keyword: A specific target of observation (e.g., 'the texture of a wall', 'the shadow of your favorite cup')

      The tone should be 'Pretendard' style (warm, modern, somewhat abstract but clear).
      Ensure the keyword is physically observable today.
      
      Respond only in JSON:
      {
        "prefix": "오늘 하루 내 시선에 우연히 머문",
        "keyword": "가장 낮은 곳의 무늬"
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Mission Generation Error:", error);
    return {
      prefix: "오늘 내 시야에 들어온",
      keyword: "가장 선명한 영감"
    };
  }
}
