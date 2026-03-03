import { Chat } from 'react-instantsearch';
import 'instantsearch.css/components/chat.css';
import { chatAgentId } from '../utilities/algolia';
import { useEvent } from '../context/EventContext';
import ChatItemComponent from './ChatItemComponent';

export default function ChatAgent() {
  const { eventConfig } = useEvent();
  const agentId = eventConfig?.agent_id || chatAgentId;

  return (
    <Chat
      agentId={agentId}
      itemComponent={ChatItemComponent}
    />
  );
}
