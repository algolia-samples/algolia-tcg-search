import PropTypes from 'prop-types';
import { Chat } from 'react-instantsearch';
import 'instantsearch.css/components/chat.css';
import ChatItemComponent from './ChatItemComponent';

export default function ChatAgent({ agentId, initialMessage }) {
  const initialMessages = initialMessage
    ? [{ id: 'scan-initial', role: 'user', content: initialMessage }]
    : [];

  return (
    <Chat
      agentId={agentId}
      itemComponent={ChatItemComponent}
      {...(initialMessages.length && {
        messages: initialMessages,
        sendAutomaticallyWhen: ({ messages }) =>
          messages.length === 1 && messages[0].role === 'user',
      })}
    />
  );
}

ChatAgent.propTypes = {
  agentId: PropTypes.string.isRequired,
  initialMessage: PropTypes.string,
};
