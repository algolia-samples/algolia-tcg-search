import { Chat } from 'react-instantsearch';
import 'instantsearch.css/components/chat.css';
import { chatAgentId } from '../utilities/algolia';
import ChatItemComponent from './ChatItemComponent';

export default function ChatAgent() {
  return (
    <Chat
      agentId={chatAgentId}
      itemComponent={ChatItemComponent}
    />
  );
}
