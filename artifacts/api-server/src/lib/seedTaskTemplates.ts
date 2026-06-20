import { db, creativeLaborTaskTemplatesTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

const TASKS = [
  {
    slug: "lipogram-writing",
    type: "writing",
    title: "Lipogram Challenge",
    description: "Write a short essay of at least 150 words without using the letter 'E'. Every word matters when your vocabulary is constrained.",
    instructions: `Write a paragraph or short essay of at least 150 words on any topic you choose — but you may NOT use the letter "E" anywhere (uppercase or lowercase). This is a lipogram, a form of constrained writing that forces creative word choice and deep vocabulary recall.`,
    evaluationCriteria: `Check that:
1. The letter 'e' (case-insensitive) does not appear anywhere in the submission
2. The submission is at least 100 words long
3. The text is coherent, readable, and on a clear topic
4. The writing shows genuine effort (not just random words)
If any 'e' appears, fail immediately regardless of other quality. Award full tokens for excellent constraint compliance + coherent content, partial for decent effort with minor issues.`,
    gaReward: 3,
  },
  {
    slug: "logic-puzzle-steps",
    type: "logic",
    title: "Step-by-Step Reasoning",
    description: "Solve a logic puzzle by writing out every reasoning step. Show your work — conclusions without reasoning earn nothing.",
    instructions: `Solve this puzzle by writing out each reasoning step explicitly:

A farmer has a fox, a chicken, and a bag of grain. He needs to cross a river with a boat that can only carry him and one other item. If left alone, the fox will eat the chicken, and the chicken will eat the grain.

How does the farmer get all three across safely? Write out every step of your solution and explain WHY each step is necessary — not just what you do, but your reasoning for each move.`,
    evaluationCriteria: `Check that:
1. The solution actually works (farmer, fox, chicken, and grain all cross safely)
2. The user explains the reasoning for EACH step — not just lists moves
3. The explanation shows understanding of WHY certain combinations are dangerous
4. The answer is complete and reaches the end state
Award full tokens for a correct solution with thorough step-by-step reasoning. Partial tokens for correct solution with incomplete reasoning. Zero for wrong solution or listing moves without explanation.`,
    gaReward: 2,
  },
  {
    slug: "brainstorm-10-ideas",
    type: "brainstorming",
    title: "10 Unique Ideas with Rationale",
    description: "Generate 10 genuinely different product concepts for a given prompt. Each idea needs a one-sentence rationale explaining its unique value.",
    instructions: `Generate exactly 10 unique product or service concepts for this prompt:

**"Tools that help remote workers feel less isolated"**

Rules:
- Each idea must be genuinely different (no variations of the same concept)
- Each idea needs a title AND a 1–2 sentence rationale explaining its unique angle
- Ideas should span different formats (app, physical product, service, community, etc.)
- No generic ideas — each should have a specific hook or differentiation`,
    evaluationCriteria: `Check that:
1. There are exactly 10 ideas (penalize if fewer than 8)
2. Ideas are genuinely distinct — not just slight variations of each other
3. Each idea has a clear title AND a rationale (not just a name)
4. The rationales explain what's unique, not just what the idea does
5. Ideas span different categories/formats (not all apps, not all events, etc.)
6. Ideas are specific, not vague ("an app for connection" is too generic)
Award full tokens for 10 well-differentiated ideas with strong rationales. Partial for good effort with some generic entries. Zero for obvious AI-generated lists with no rationale or fewer than 5 real ideas.`,
    gaReward: 2,
  },
];

export async function seedTaskTemplates() {
  try {
    for (const task of TASKS) {
      await db
        .insert(creativeLaborTaskTemplatesTable)
        .values(task)
        .onConflictDoUpdate({
          target: creativeLaborTaskTemplatesTable.slug,
          set: {
            title: sql`excluded.title`,
            description: sql`excluded.description`,
            instructions: sql`excluded.instructions`,
            evaluationCriteria: sql`excluded.evaluation_criteria`,
            gaReward: sql`excluded.ga_reward`,
          },
        });
    }
    logger.info({ count: TASKS.length }, "Task templates seeded");
  } catch (err) {
    logger.error({ err }, "Failed to seed task templates");
  }
}
