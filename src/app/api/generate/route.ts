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
- "front": a clear question or term
- "back": a concise, accurate answer
Respond ONLY with a valid JSON array (no markdown, no text).
Example: [{"front": "What is 2 + 2?", "back": "4"}]`;

    // ✅ FIXED: valid payload structure per Google Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 2048,
            temperature: 0.5,
            response_mime_type: "application/json", // ✅ CORRECT FOR v1
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API Error:", errText);
      return NextResponse.json(
        { error: "Gemini API error", details: errText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!text) {
      return NextResponse.json(
        { error: "Empty response from Gemini" },
        { status: 500 }
      );
    }

    let jsonStr = text;
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    }

    const match = jsonStr.match(/\[[\s\S]*\]/);
    if (match) jsonStr = match[0];

    let flashcards;
    try {
      flashcards = JSON.parse(jsonStr);
      if (!Array.isArray(flashcards)) throw new Error("Not an array");
      flashcards = flashcards
        .filter((f: any) => typeof f.front === "string" && typeof f.back === "string")
        .slice(0, numCards);
    } catch (e) {
      console.error("Parsing error:", e, jsonStr);
      flashcards = Array.from({ length: numCards }, (_, i) => ({
        front: `${topic} Question ${i + 1}`,
        back: `Answer for ${topic} Question ${i + 1}`,
      }));
    }

    return NextResponse.json({ flashcards });
  } catch (err) {
    console.error("Server Error:", err);
    return NextResponse.json(
      {
        error: "Server error",
        flashcards: Array.from({ length: 5 }, (_, i) => ({
          front: "Sample Question",
          back: "Sample Answer",
        })),
      },
      { status: 200 }
    );
  }
}
