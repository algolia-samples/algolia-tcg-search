import PropTypes from 'prop-types';
import { Chat, ChatSidePanelLayout } from 'react-instantsearch';
import 'instantsearch.css/components/chat.css';
import ChatItemComponent from './ChatItemComponent';

function ChatGreeting() {
  return (
    <div className="ais-ChatGreeting">
      <h2 className="ais-ChatGreeting-heading">
        I&apos;m the Algolia TCG Card Vending Machine
      </h2>
      <p className="ais-ChatGreeting-subheading">
        Ask me what cards are inside, find out what they&apos;re worth, or claim the card you just received.
      </p>
    </div>
  );
}

export default function ChatAgent({ agentId }) {
  return (
    <Chat
      agentId={agentId}
      layoutComponent={ChatSidePanelLayout}
      itemComponent={ChatItemComponent}
      emptyComponent={ChatGreeting}
      feedback
    />
  );
}

ChatAgent.propTypes = {
  agentId: PropTypes.string.isRequired,
};
