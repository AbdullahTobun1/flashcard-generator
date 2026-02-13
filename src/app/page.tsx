"use client";

import { useState } from "react";
import ReactCardFlip from "react-card-flip";
import jsPDF from "jspdf";

export default function Home() {
  const [topic, setTopic] = useState("");
  const [grade, setGrade] = useState("");
  const [numCards, setNumCards] = useState("");
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [flipped, setFlipped] = useState<boolean[]>([]);
  const [cardsPerPage, setCardsPerPage] = useState<number>(8);

  const handleGenerate = async () => {
    if (!topic || !grade || !numCards) {
      alert("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setFlashcards([]);
    setFlipped([]);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          grade,
          numCards: Number(numCards),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Server error");
        return;
      }

      if (!Array.isArray(data.flashcards)) {
        alert("Invalid response from server.");
        return;
      }

      setFlashcards(data.flashcards);
      setFlipped(new Array(data.flashcards.length).fill(false));
    } catch (err: any) {
      alert("Request failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFlip = (index: number) => {
    setFlipped((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const gridLayouts: Record<number, { rows: number; cols: number }> = {
    4: { rows: 2, cols: 2 },
    6: { rows: 2, cols: 3 },
    8: { rows: 2, cols: 4 },
    12: { rows: 3, cols: 4 },
  };

  const layout = gridLayouts[cardsPerPage] ?? gridLayouts[8];
  const { rows, cols } = layout;

  const downloadPDF = () => {
    if (!flashcards.length) {
      alert("No flashcards to print.");
      return;
    }

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const margin = 40;
    const gap = 10;

    const cardWidth =
      (pageWidth - margin * 2 - gap * (cols - 1)) / cols;
    const cardHeight =
      (pageHeight - margin * 2 - gap * (rows - 1)) / rows;

    const pagesCount = Math.ceil(
      flashcards.length / cardsPerPage
    );

    for (let pageIndex = 0; pageIndex < pagesCount; pageIndex++) {
      const pageCards = flashcards.slice(
        pageIndex * cardsPerPage,
        (pageIndex + 1) * cardsPerPage
      );

      // FRONT
      pageCards.forEach((card, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const x = margin + col * (cardWidth + gap);
        const y = margin + row * (cardHeight + gap);

        pdf.rect(x, y, cardWidth, cardHeight);
        pdf.text(card.front || "", x + cardWidth / 2, y + cardHeight / 2, {
          maxWidth: cardWidth - 20,
          align: "center",
        });
      });

      pdf.addPage();

      // BACK (mirrored)
      pageCards.forEach((card, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const reversedCol = cols - 1 - col;

        const x = margin + reversedCol * (cardWidth + gap);
        const y = margin + row * (cardHeight + gap);

        pdf.rect(x, y, cardWidth, cardHeight);
        pdf.text(card.back || "", x + cardWidth / 2, y + cardHeight / 2, {
          maxWidth: cardWidth - 20,
          align: "center",
        });
      });

      if (pageIndex < pagesCount - 1) {
        pdf.addPage();
      }
    }

    pdf.save("flashcards.pdf");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-yellow-50 p-4">
      <div className="w-full max-w-5xl rounded-2xl bg-white p-6 shadow-lg">
        <h1 className="mb-4 text-2xl font-bold text-purple-700">
          Flashcard Generator 🚀
        </h1>

        {/* NO FORM — prevents accidental GET */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">
              Topic
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="mt-1 w-full rounded-md border p-2 text-black"
              placeholder="e.g. Multiplication"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">
              Grade
            </label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="mt-1 w-full rounded-md border p-2 text-black"
            >
              <option value="">Select grade</option>
              {[1, 2, 3, 4, 5, 6].map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">
              Number of Flashcards
            </label>
            <input
              type="number"
              value={numCards}
              onChange={(e) => setNumCards(e.target.value)}
              className="mt-1 w-full rounded-md border p-2 text-black"
              min={1}
              max={50}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">
              Cards per Page
            </label>
            <select
              value={cardsPerPage}
              onChange={(e) =>
                setCardsPerPage(parseInt(e.target.value))
              }
              className="mt-1 w-full rounded-md border p-2 text-black"
            >
              {[4, 6, 8, 12].map((n) => (
                <option key={n} value={n}>
                  {n} cards per page
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="w-full rounded-lg bg-purple-600 py-2 font-semibold text-white hover:bg-purple-700"
          >
            {loading ? "Generating..." : "Generate"}
          </button>
        </div>

        {flashcards.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 text-lg font-bold">
              Flashcards Preview
            </h2>

            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              }}
            >
              {flashcards.map((card, i) => (
                <div
                  key={i}
                  className="h-40 cursor-pointer"
                  onClick={() => handleFlip(i)}
                >
                  <ReactCardFlip
                    isFlipped={Boolean(flipped[i])}
                    flipDirection="horizontal"
                  >
                    <div className="h-full rounded-xl shadow-lg flex items-center justify-center text-center p-4 bg-yellow-100 font-semibold">
                      {card.front}
                    </div>
                    <div className="h-full rounded-xl shadow-lg flex items-center justify-center text-center p-4 bg-blue-100 font-semibold">
                      {card.back}
                    </div>
                  </ReactCardFlip>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={downloadPDF}
                className="rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white hover:bg-purple-700"
              >
                Download PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
