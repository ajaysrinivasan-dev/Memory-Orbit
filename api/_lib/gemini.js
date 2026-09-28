import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_NAME = "gemini-3.5-flash-lite";
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS = [1000, 2000, 4000];

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const getStatus = (error) => Number(error?.status || error?.response?.status);

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export const generateGeminiContent = async (prompt) => {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  let attempt = 0;

  while (true) {
    try {
      const result = await model.generateContent(prompt);
      return (await result.response).text();
    } catch (error) {
      const status = getStatus(error);
      if (!RETRYABLE_STATUSES.has(status) || attempt >= RETRY_DELAYS.length) {
        throw error;
      }

      const delay = RETRY_DELAYS[attempt];
      attempt += 1;
      console.warn(`[Gemini] Retry ${attempt}/${RETRY_DELAYS.length} after HTTP ${status} in ${delay}ms`);
      await wait(delay);
    }
  }
};
