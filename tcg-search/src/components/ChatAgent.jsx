import { Chat } from 'react-instantsearch';
import 'instantsearch.css/components/chat.css';
import ChatItemComponent from './ChatItemComponent';

export default function ChatAgent() {
  const agentId = process.env.REACT_APP_ALGOLIA_CHAT_AGENT_ID || '58bbdc94-6755-40ca-a7e0-5ece59adeb73';

  if (!process.env.REACT_APP_ALGOLIA_CHAT_AGENT_ID) {
    console.warn('REACT_APP_ALGOLIA_CHAT_AGENT_ID is not set, using default agent ID');
  }

  return (
    <Chat
      agentId={agentId}
      itemComponent={ChatItemComponent}
    />
  );
}
