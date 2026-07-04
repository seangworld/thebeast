import type { LearningOnboardingStep } from "./types";

export const learningOnboardingSteps: LearningOnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to BeastLearning",
    prompt: "Set up a calm daily learning command center.",
    options: ["Start setup", "Skip for now"],
    skippable: true,
  },
  {
    id: "future-self",
    title: "What do you want to become?",
    prompt: "Choose the future role or capability that matters most.",
    options: ["Certified professional", "Stronger student", "Career changer", "Skilled maker"],
    skippable: true,
  },
  {
    id: "interests",
    title: "Interests",
    prompt: "Pick subjects BeastLearning should keep close.",
    options: ["Cybersecurity", "Math", "Languages", "Trades"],
    skippable: true,
  },
  {
    id: "education-level",
    title: "Current education level",
    prompt: "Choose the starting context.",
    options: ["Middle school", "High school", "College", "Adult learner"],
    skippable: true,
  },
  {
    id: "learning-style",
    title: "Learning style",
    prompt: "Choose the study format that feels easiest to start.",
    options: ["Read then practice", "Watch then do", "Quiz first", "Project based"],
    skippable: true,
  },
  {
    id: "study-availability",
    title: "Study availability",
    prompt: "How much time can you protect most days?",
    options: ["15 min", "30 min", "45 min", "60 min"],
    skippable: true,
  },
  {
    id: "preferred-pace",
    title: "Preferred pace",
    prompt: "Choose a rhythm that will not burn you out.",
    options: ["Light", "Steady", "Focused", "Intensive"],
    skippable: true,
  },
  {
    id: "initial-goals",
    title: "Initial goals",
    prompt: "Pick the first goal to place on your dashboard.",
    options: ["Security+", "College Algebra", "Spanish I", "Woodworking"],
    skippable: true,
  },
  {
    id: "starter-dashboard",
    title: "Starter learning dashboard",
    prompt: "Open the daily mission and continue from one clear next action.",
    options: ["Open dashboard"],
    skippable: false,
  },
];
