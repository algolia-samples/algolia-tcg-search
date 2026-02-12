import React from 'react';
import { Chat } from 'react-instantsearch';
import 'instantsearch.css/components/chat.css';
import ChatItemComponent from './ChatItemComponent';

export default function ChatAgent() {
  return (
    <Chat
      agentId="58bbdc94-6755-40ca-a7e0-5ece59adeb73"
      itemComponent={ChatItemComponent}
    />
  );
}
