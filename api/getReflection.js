import { authenticateRequest, getErrorStatus } from "./_lib/auth.js";
import { generateGeminiContent } from "./_lib/gemini.js";

export default async function handler(request, response) {
  try {
    await authenticateRequest(request);
  } catch (error) {
    return response.status(getErrorStatus(error)).json({ error: error.status === 401 ? "Unauthorized" : error.message });
  }

  // Get the ORIGINAL entry text from the request
  const { entryText } = request.body;

  if (!entryText) {
    return response.status(400).json({
      error: "Request must include 'entryText' field.",
    });
  }

  try {
    // --- NEW PROMPT for Reflection ---
    const prompt = `
    Based *only* on the following journal entry, ask the user one single, gentle, open-ended, and insightful question to encourage deeper self-reflection about the feelings or events described. Do not give advice or opinions. Frame the question directly to the user (e.g., "What makes you feel..." or "How did you...").

    JOURNAL ENTRY:
    "${entryText}"

    REFLECTIVE QUESTION:
    `;
    // --- END OF NEW PROMPT ---

    const reflectionQuestion = (await generateGeminiContent(prompt)).trim();

    // Send just the question string back
    return response.status(200).json({ question: reflectionQuestion });

  } catch (e) {
    console.error("Reflection error:", e);
    return response.status(getErrorStatus(e, 502)).json({
      error: `An error occurred generating reflection: ${e.message}`,
    });
  }
}