import { eq, desc } from "drizzle-orm";
import { db, chsSnapshotsTable } from "@workspace/db";

export type ChsFactors = {
  complexity: number;
  originality: number;
  depth: number;
  effort: number;
};

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function blend(prev: number, next: number, weight = 0.3): number {
  return clamp(prev * (1 - weight) + next * weight);
}

/**
 * Heuristically score a piece of text on 4 cognitive dimensions.
 * All dimensions return 0–100.
 */
export function scoreText(text: string): ChsFactors & { overall: number } {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  if (wordCount === 0) {
    return { complexity: 0, originality: 0, depth: 0, effort: 0, overall: 0 };
  }

  const lower = trimmed.toLowerCase();
  const uniqueWords = new Set(words.map((w) => w.toLowerCase().replace(/[^a-z]/g, "")));
  const lexDiversity = uniqueWords.size / wordCount;

  // Complexity — rich vocabulary + substantial length
  const lengthFactor = Math.min(wordCount / 200, 1);
  const complexity = clamp(lexDiversity * 65 + lengthFactor * 35);

  // Depth — analytical/critical phrase markers
  const depthMarkers = [
    "because", "therefore", "however", "although", "whereas",
    "critique", "counterargument", "why ", "reason", "analyze",
    "consider", "implication", "evidence", "argument", "trade-off",
    "alternatively", "on the other hand", "nonetheless", "by contrast",
    "perspective", "nuance", "leads to", "caused by", "as a result",
  ];
  const depthHits = depthMarkers.filter((m) => lower.includes(m)).length;
  const depth = clamp(depthHits * 13 + Math.min(wordCount / 80, 1) * 35);

  // Originality — avg word complexity, lexical diversity, low filler reliance
  const fillerPhrases = [
    "i think", "i feel", "i believe", "in my opinion",
    "basically", "just ", "very ", "really ",
  ];
  const fillerHits = fillerPhrases.filter((p) => lower.includes(p)).length;
  const avgWordLen =
    [...uniqueWords].reduce((s, w) => s + w.length, 0) / Math.max(uniqueWords.size, 1);
  const originality = clamp(
    lexDiversity * 55 + Math.min(avgWordLen / 8, 1) * 35 - fillerHits * 6 + 10
  );

  // Effort — total length + sentence variety
  const sentenceCount = (trimmed.match(/[.!?]+/g) ?? []).length || 1;
  const avgSentLen = wordCount / sentenceCount;
  const effort = clamp(
    Math.min(wordCount / 250, 1) * 55 +
      Math.min(sentenceCount / 12, 1) * 25 +
      Math.min(avgSentLen / 30, 1) * 20
  );

  const overall = clamp((complexity + depth + originality + effort) / 4);

  return { complexity, originality, depth, effort, overall };
}

/**
 * Score a text interaction and persist a new CHS snapshot for the user.
 * Uses EWMA blending (weight=0.3) with the previous snapshot so a single
 * bad interaction cannot crater the score, and a single good one cannot
 * inflate it.
 */
export async function recordInteraction(
  userId: string,
  text: string,
  context?: string
): Promise<{ score: number; factors: ChsFactors }> {
  const fullText = context ? `${context}\n\n${text}` : text;
  const scored = scoreText(fullText);

  const [latest] = await db
    .select()
    .from(chsSnapshotsTable)
    .where(eq(chsSnapshotsTable.userId, userId))
    .orderBy(desc(chsSnapshotsTable.createdAt))
    .limit(1);

  const prev = (latest?.factorsJson as ChsFactors | undefined) ?? {
    complexity: 50,
    originality: 50,
    depth: 50,
    effort: 50,
  };
  const prevScore = latest?.score ?? 50;

  const newFactors: ChsFactors = {
    complexity: blend(prev.complexity, scored.complexity),
    originality: blend(prev.originality, scored.originality),
    depth: blend(prev.depth, scored.depth),
    effort: blend(prev.effort, scored.effort),
  };
  const newScore = blend(prevScore, scored.overall);

  await db.insert(chsSnapshotsTable).values({
    userId,
    score: newScore,
    factorsJson: newFactors,
  });

  return { score: newScore, factors: newFactors };
}
