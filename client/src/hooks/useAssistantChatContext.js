import { useContext } from "react";
import { AssistantChatContext } from "../context/assistantChatContext";

export default function useAssistantChatContext() {
  const context = useContext(AssistantChatContext);
  if (!context) throw new Error("useAssistantChatContext must be used inside AssistantChatProvider");
  return context;
}
