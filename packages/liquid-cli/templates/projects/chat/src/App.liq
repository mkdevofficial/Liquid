--- logic
import { chatStore } from './store.js';
import Header from './components/Header.liq';
import ConversationList from './components/ConversationList.liq';
import MessageBubble from './components/MessageBubble.liq';
import ChatInput from './components/ChatInput.liq';

--- style
.container {
  display: flex;
  flex-direction: column;
  padding: 16px;
  background-color: #f8fafc;
  min-height: 100%;
}
.feed {
  display: flex;
  flex-direction: column;
  flex: 1;
  background-color: #f1f5f9;
  border-radius: 12px;
  padding: 16px;
  min-height: 280px;
}
.typing-indicator {
  font-size: 12px;
  color: #64748b;
  font-style: italic;
  margin-top: 4px;
}

--- ui
div.container
  Header

  ConversationList

  div.feed
    each chatStore.getActiveConversation().messages as msg (msg.id)
      MessageBubble msg={msg}

    if chatStore.isTyping
      span.typing-indicator {chatStore.getActiveConversation().name} is typing...

  ChatInput
