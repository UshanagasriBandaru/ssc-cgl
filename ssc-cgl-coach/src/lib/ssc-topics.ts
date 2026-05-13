export type TopicWeightage = "highest" | "high" | "medium" | "low";

export type SubjectId = "quant" | "reasoning" | "english" | "gk";

export type Topic = {
  slug: string;
  name: string;
  subject: SubjectId;
  weightage: TopicWeightage;
  pyqNote?: string;
};

export const SUBJECT_LABELS: Record<SubjectId, string> = {
  quant: "Quantitative Aptitude",
  reasoning: "General Intelligence & Reasoning",
  english: "English Comprehension",
  gk: "General Awareness",
};

/** Starter syllabus slice — extend as you build content. */
export const SSC_CGL_TOPICS: Topic[] = [
  {
    slug: "percentage",
    name: "Percentage",
    subject: "quant",
    weightage: "highest",
    pyqNote: "Very frequent in Tier-I; ties to DI and arithmetic.",
  },
  {
    slug: "ratio-proportion",
    name: "Ratio & Proportion",
    subject: "quant",
    weightage: "highest",
  },
  {
    slug: "profit-loss",
    name: "Profit & Loss",
    subject: "quant",
    weightage: "high",
  },
  {
    slug: "time-work",
    name: "Time & Work",
    subject: "quant",
    weightage: "high",
  },
  {
    slug: "speed-time-distance",
    name: "Speed, Time & Distance",
    subject: "quant",
    weightage: "high",
  },
  {
    slug: "algebra",
    name: "Algebra",
    subject: "quant",
    weightage: "high",
  },
  {
    slug: "geometry",
    name: "Geometry",
    subject: "quant",
    weightage: "medium",
  },
  {
    slug: "trigonometry",
    name: "Trigonometry",
    subject: "quant",
    weightage: "medium",
  },
  {
    slug: "simplification",
    name: "Simplification / BODMAS",
    subject: "quant",
    weightage: "high",
  },
  {
    slug: "number-system",
    name: "Number System",
    subject: "quant",
    weightage: "medium",
  },
  {
    slug: "mensuration",
    name: "Mensuration",
    subject: "quant",
    weightage: "medium",
  },
  {
    slug: "data-interpretation",
    name: "Data Interpretation",
    subject: "quant",
    weightage: "high",
    pyqNote: "Often paired with percentage/ratio.",
  },
  {
    slug: "seating-arrangement",
    name: "Seating Arrangement",
    subject: "reasoning",
    weightage: "highest",
  },
  {
    slug: "puzzles",
    name: "Puzzles",
    subject: "reasoning",
    weightage: "high",
  },
  {
    slug: "coding-decoding",
    name: "Coding–Decoding",
    subject: "reasoning",
    weightage: "medium",
  },
  {
    slug: "syllogism",
    name: "Syllogism",
    subject: "reasoning",
    weightage: "medium",
  },
  {
    slug: "reading-comprehension",
    name: "Reading Comprehension",
    subject: "english",
    weightage: "highest",
  },
  {
    slug: "cloze-test",
    name: "Cloze Test",
    subject: "english",
    weightage: "high",
  },
  {
    slug: "grammar",
    name: "Grammar & Error Detection",
    subject: "english",
    weightage: "high",
  },
  {
    slug: "vocabulary",
    name: "Vocabulary (synonyms/antonyms/idioms)",
    subject: "english",
    weightage: "high",
  },
  {
    slug: "science",
    name: "Science (Phy/Chem/Bio)",
    subject: "gk",
    weightage: "high",
  },
  {
    slug: "polity",
    name: "Indian Polity",
    subject: "gk",
    weightage: "high",
  },
  {
    slug: "history",
    name: "History",
    subject: "gk",
    weightage: "medium",
  },
  {
    slug: "geography",
    name: "Geography",
    subject: "gk",
    weightage: "medium",
  },
  {
    slug: "economics",
    name: "Economics / Budget",
    subject: "gk",
    weightage: "medium",
  },
  {
    slug: "current-affairs",
    name: "Current Affairs",
    subject: "gk",
    weightage: "highest",
    pyqNote: "Keep last ~6–12 months rotating revision.",
  },
];

export function topicBySlug(slug: string): Topic | undefined {
  return SSC_CGL_TOPICS.find((t) => t.slug === slug);
}

export function topicsBySubject(subject: SubjectId): Topic[] {
  return SSC_CGL_TOPICS.filter((t) => t.subject === subject);
}
