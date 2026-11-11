import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chatStore } from '../src/store.js';

test('Chat Template - sends messages, switches conversations, and receives simulated replies', async () => {
  assert.equal(chatStore.activeChatId, 1);
  const activeConv = chatStore.getActiveConversation();
  const initialCount = activeConv.messages.length;

  // Send message
  chatStore.sendMessage('Testing automated reply feature');
  const updatedConv = chatStore.getActiveConversation();
  assert.equal(updatedConv.messages.length, initialCount + 1);
  const lastUserMsg = updatedConv.messages[updatedConv.messages.length - 1];
  assert.equal(lastUserMsg.text, 'Testing automated reply feature');
  assert.equal(lastUserMsg.sender, 'me');

  // Switch conversation
  chatStore.setActiveChat(2);
  assert.equal(chatStore.activeChatId, 2);
  assert.equal(chatStore.getActiveConversation().name, 'Dev Bot');

  // Wait for reply timeout
  await new Promise(r => setTimeout(r, 500));
  const conv1 = chatStore.conversations.find(c => c.id === 1);
  assert.ok(conv1.messages.length >= initialCount + 2);
  const reply = conv1.messages[conv1.messages.length - 1];
  assert.equal(reply.sender, 'them');
});
