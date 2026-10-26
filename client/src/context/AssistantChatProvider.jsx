import { AssistantChatContext } from "./assistantChatContext";
import useAssistantChat from "../hooks/useAssistantChat";

export default function AssistantChatProvider({ children }) {
  const chat = useAssistantChat();

  return (
    <AssistantChatContext.Provider value={chat}>
      {children}
    </AssistantChatContext.Provider>
  );
}
