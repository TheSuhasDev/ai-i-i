import { createContext } from "react";

export const SUGGESTED_QUESTIONS = [
  "Which products should I reorder today?",
  "Which suppliers have the most delays?",
  "Which products are overstocked?",
  "What happens if demand increases by 20%?",
  "Why is the USB Hub marked as critical?",
];

export const AssistantChatContext = createContext(null);
