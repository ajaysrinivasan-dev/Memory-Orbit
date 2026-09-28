import { authenticateRequest, getErrorStatus } from "./_lib/auth.js";
import { generateGeminiContent } from "./_lib/gemini.js";

// --- Our list of standard emotions ---
const emotionList = [
  'Happy', 'Joyful', 'Grateful', 'Confident', 'Productive', // Positive
  'Sad', 'Anxious', 'Stressed', 'Angry', 'Tired',     // Negative
  'Calm', 'Reflective', 'Neutral'                     // Neutral
];

const parseJsonResponse = (text) => {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  return JSON.parse(cleaned);
};

const isValidResult = (result) => (
  result &&
  emotionList.includes(result.emotion) &&
  typeof result.summary === "string" &&
  typeof result.reply === "string" &&
  Array.isArray(result.keywords) &&
  result.keywords.every((keyword) => typeof keyword === "string") &&
  typeof result.sentiment_score === "number" &&
  Number.isFinite(result.sentiment_score) &&
  result.sentiment_score >= -1 &&
  result.sentiment_score <= 1
);

export default async function handler(request, response) {
  try {
    await authenticateRequest(request);
  } catch (error) {
    return response.status(getErrorStatus(error)).json({ error: error.status === 401 ? "Unauthorized" : error.message });
  }

  const { text } = request.body;

  if (!text) {
    return response.status(400).json({
      error: "Request must include 'text' field.",
    });
  }

  try {
    // --- PROMPT UPDATED FOR DEEPER PERSONALITY ---
    const prompt = `
      Analyze the following journal entry as a deeply empathetic and intelligent AI companion. 
      
      You must provide a JSON object with these five keys:

      1. 'emotion': You MUST choose ONE single, primary emotion from this exact list: [${emotionList}].
      2. 'summary': A one-sentence summary of the key event or feeling.
      3. 'reply': A warm, deeply personalized, and insightful paragraph (3-4 sentences). Do not just repeat what they said. Analyze specific details they mentioned, validate their feelings, and offer a unique perspective or gentle encouragement. Speak to them like a wise, close friend.
      4. 'keywords': An array of 3-5 key nouns or topics.
      5. 'sentiment_score': A number between -1.0 (very negative) and 1.0 (very positive), representing the overall sentiment.

      ENTRY: "${text}"

      JSON:
      `;
    // --- END OF UPDATE ---

    const aiJsonString = await generateGeminiContent(prompt);
    const validatedResult = parseJsonResponse(aiJsonString);

    if (!isValidResult(validatedResult)) {
      return response.status(502).json({ error: "Gemini returned an invalid analysis response." });
    }

    return response.status(200).json({ reply: JSON.stringify(validatedResult) });

  } catch (e) {
    console.error("An error occurred:", e);
    return response.status(getErrorStatus(e, 502)).json({
      error: `An error occurred: ${e.message}`,
    });
  }
}