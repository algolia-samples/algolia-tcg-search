import PropTypes from 'prop-types';
import { Chat } from 'react-instantsearch';
import 'instantsearch.css/components/chat.css';
import ChatItemComponent from './ChatItemComponent';

export default function ChatAgent({ agentId }) {
  return (
    <Chat
      agentId={agentId}
      itemComponent={ChatItemComponent}
    />
  );
}

ChatAgent.propTypes = {
  agentId: PropTypes.string.isRequired,
};
