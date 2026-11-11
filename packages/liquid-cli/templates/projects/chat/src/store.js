import { createStore } from 'liquid';

const initialConversations = [
  {
    id: 1,
    name: 'Sarah Connor',
    avatar: '👩‍💻',
    status: 'online',
    lastMessage: 'Let me know once the mobile build is verified!',
    time: '10:42 AM',
    messages: [
      { id: 101, sender: 'them', text: 'Hey, how is Liquid performing on device?', time: '10:40 AM' },
      { id: 102, sender: 'me', text: 'Amazingly fast! Pure native views and zero WebView.', time: '10:41 AM' },
      { id: 103, sender: 'them', text: 'Let me know once the mobile build is verified!', time: '10:42 AM' }
    ]
  },
  {
    id: 2,
    name: 'Dev Bot',
    avatar: '🤖',
    status: 'online',
    lastMessage: 'Type any message and I will reply automatically.',
    time: '09:15 AM',
    messages: [
      { id: 201, sender: 'them', text: 'Hello! I am your reactive development assistant. Type any message and I will reply automatically.', time: '09:15 AM' }
    ]
  },
  {
    id: 3,
    name: 'Liquid Support',
    avatar: '🫟',
    status: 'offline',
    lastMessage: 'Welcome to the official Liquid community.',
    time: 'Yesterday',
    messages: [
      { id: 301, sender: 'them', text: 'Welcome to the official Liquid community. Need assistance with templates or signals?', time: 'Yesterday' }
    ]
  }
];

export const chatStore = createStore({
  conversations: initialConversations,
  activeChatId: 1,
  inputText: '',
  isTyping: false,

  getActiveConversation() {
    return this.conversations.find(c => c.id === this.activeChatId) || this.conversations[0];
  },

  setActiveChat(id) {
    this.activeChatId = id;
    this.inputText = '';
  },

  sendMessage(text) {
    const content = (text || this.inputText).trim();
    if (!content) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = {
      id: Date.now(),
      sender: 'me',
      text: content,
      time
    };

    const convId = this.activeChatId;
    this.conversations = this.conversations.map(c => {
      if (c.id === convId) {
        return {
          ...c,
          lastMessage: content,
          time,
          messages: [...c.messages, userMsg]
        };
      }
      return c;
    });
    this.inputText = '';

    // Simulate auto-reply from contact/bot
    this.isTyping = true;
    setTimeout(() => {
      const active = this.conversations.find(c => c.id === convId);
      const replyText = convId === 2
        ? `Bot Echo: "${content}" received! All systems reactive and operational.`
        : `Got it! Thanks for the update on "${content.slice(0, 20)}..."`;
      const replyMsg = {
        id: Date.now() + 1,
        sender: 'them',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      this.conversations = this.conversations.map(c => {
        if (c.id === convId) {
          return {
            ...c,
            lastMessage: replyText,
            time: replyMsg.time,
            messages: [...c.messages, replyMsg]
          };
        }
        return c;
      });
      this.isTyping = false;
    }, 400);
  }
});
