import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { topic, grade, numCards } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY in environment" },
        { status: 500 }
      );
    }

    const prompt = `You are a helpful teacher. Generate exactly ${numCards} flashcards for grade ${grade} on "${topic}".
Each flashcard must have:
- "front": a clear question or term (suitable for grade ${grade})
- "back": a concise, accurate answer
Respond ONLY with a valid JSON array. Do not add any other text, markdown, or explanation.
Example: [{"front": "What is 2 + 2?", "back": "4"}]`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 800,
            temperature: 0.7,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Gemini API Error:", errorData);
      return NextResponse.json(
        {
          error: "Gemini API error",
          status: response.status,
          details: errorData.error?.message || "Unknown error",
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!content) {
      return NextResponse.json(
        { error: "Empty response from Gemini" },
        { status: 500 }
      );
    }

    let jsonStr = content;

    // Remove markdown formatting if Gemini wraps JSON
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    }

    // Extract only the JSON array
    const match = jsonStr.match(/\[.*\]/s);
    if (match) jsonStr = match[0];

    let flashcards;
    try {
      flashcards = JSON.parse(jsonStr);
      if (!Array.isArray(flashcards)) throw new Error("Not an array");
    } catch (e) {
      console.error("Parsing error:", e, jsonStr);
      return NextResponse.json(
        { error: "Invalid JSON from Gemini", raw: content },
        { status: 500 }
      );
    }

    return NextResponse.json({ flashcards });
  } catch (err: any) {
    console.error("Server Error:", err);
    return NextResponse.json(
      { error: err.message || "Unknown server error" },
      { status: 500 }
    );
  }
}
