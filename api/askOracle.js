import { authenticateRequest, getErrorStatus } from "./_lib/auth.js";
import { generateGeminiContent } from "./_lib/gemini.js";

export default async function handler(request, response) {
  try {
    await authenticateRequest(request);
  } catch (error) {
    return response.status(getErrorStatus(error)).json({ error: error.status === 401 ? "Unauthorized" : error.message });
  }

  const { question, context } = request.body;

  if (!question || !context) {
    return response.status(400).json({ error: "Missing question or context." });
  }

  try {
    const prompt = `
    You are "The Oracle," a wise, mystical, and highly intelligent AI analyst for a personal journal.
    
    Here is the user's recorded memory log (Journal Entries):
    ---------------------------------------------------------
    ${context}
    ---------------------------------------------------------

    USER QUESTION: "${question}"

    INSTRUCTIONS:
    1. Answer the user's question based ONLY on the provided journal entries.
    2. Be insightful. Connect dots between different entries.
    3. Cite specific dates or events to prove you know their history.
    4. If the answer isn't in the journals, say "The stars do not hold this answer."
    5. Keep the tone mystical but helpful.
    `;

    const answer = (await generateGeminiContent(prompt)).trim();

    return response.status(200).json({ answer });

  } catch (e) {
    console.error("Oracle Error:", e);
    return response.status(getErrorStatus(e, 502)).json({ error: e.message });
  }
}