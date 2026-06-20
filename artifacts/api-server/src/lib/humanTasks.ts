export type HumanTaskType = "sensory_scan" | "close_observation" | "mindful_pause";

export interface HumanTask {
  type: HumanTaskType;
  title: string;
  description: string;
  instructions: string;
  placeholder: string;
  evaluationCriteria: string;
  gaBonus: number;
  /** false = no timer; number = seconds for countdown */
  timed: false | number;
}

export const HUMAN_TASKS: Record<HumanTaskType, HumanTask> = {
  sensory_scan: {
    type: "sensory_scan",
    title: "Sensory Scan",
    description: "Engage your full auditory awareness before proceeding.",
    instructions:
      "Stop what you're doing. Close your eyes if you can. Listen carefully for 60 seconds. " +
      "Then describe 5 distinct sounds you can hear right now — including their character, " +
      "distance, rhythm, and any patterns you notice. Be specific.",
    placeholder:
      "Sound 1: ...\nSound 2: ...\nSound 3: ...\nSound 4: ...\nSound 5: ...",
    evaluationCriteria:
      "Evaluate if the response identifies 5 genuinely distinct sounds with meaningful, specific " +
      "description beyond simply naming them. Reward: sensory specificity, attention to texture, " +
      "timing, distance, rhythm, or emotional quality. Reject: vague lists (e.g. 'traffic, birds, wind') " +
      "with no elaboration, responses that are too short, or obvious fabrications.",
    gaBonus: 10,
    timed: false,
  },

  close_observation: {
    type: "close_observation",
    title: "Close Observation",
    description: "Prove your powers of direct, unmediated perception.",
    instructions:
      "Pick any object within arm's reach. Describe it in 5 or more sentences as if explaining " +
      "it to someone who has never seen anything like it — include texture, color variations, " +
      "weight, any imperfections or wear, how light interacts with it, and any smell or sound it might make.",
    placeholder: "The object I'm observing is...",
    evaluationCriteria:
      "Evaluate if the response describes a specific real object with genuine perceptual detail across " +
      "5+ sentences. Reward: tactile, visual, or olfactory specificity; observations of imperfections, " +
      "shadows, material grain, or unexpected details. Reject: generic descriptions that could apply to " +
      "any object of that category, very short responses, or clearly template-filled answers.",
    gaBonus: 10,
    timed: false,
  },

  mindful_pause: {
    type: "mindful_pause",
    title: "Mindful Pause",
    description: "Two minutes of breath focus before you continue.",
    instructions:
      "A 2-minute countdown will begin. During this time, focus only on your breathing — " +
      "the sensation of air entering and leaving your body. Notice what arises. " +
      "When the timer ends, write 3 or more sentences about what you noticed: " +
      "what physical sensations, thoughts, or shifts in awareness occurred?",
    placeholder: "During the pause I noticed...",
    evaluationCriteria:
      "Evaluate if the response reflects genuine mindful observation during a short break. " +
      "Reward: honest and specific reflection on physical sensation, thoughts that arose, or " +
      "shifts in mental clarity. Reject: one-sentence answers, clearly generic responses " +
      "(e.g. 'I felt calm'), or responses that don't reference any specific experience.",
    gaBonus: 8,
    timed: 120,
  },
};

const TASK_POOL: HumanTaskType[] = [
  "sensory_scan",
  "close_observation",
  "sensory_scan",
  "close_observation",
  "mindful_pause",
];

export function pickRandomTask(): HumanTaskType {
  return TASK_POOL[Math.floor(Math.random() * TASK_POOL.length)];
}

export const SESSION_SPEND_THRESHOLD = 50;
export const SESSION_MINUTES_LIMIT = 60;
export const UNLOCK_DURATION_MINUTES = 30;
