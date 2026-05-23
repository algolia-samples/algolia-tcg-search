import { useEffect } from 'react';
import PropTypes from 'prop-types';
import { Chat, ChatSidePanelLayout } from 'react-instantsearch';
import 'instantsearch.css/components/chat.css';
import ChatItemComponent from './ChatItemComponent';
import { scrollToSearchBox } from '../utilities/dom';

const PROMPT_SUGGESTIONS = [
  'What are your most valuable cards?',
  'Do you have any Charizard cards?',
  'Show me your top chase cards',
  "What's your best water type card?",
  'How do I get a card?',
];

function ChatGreeting({ sendMessage }) {
  return (
    <div className="ais-ChatGreeting">
      <h2 className="ais-ChatGreeting-heading">
        I&apos;m the Algolia TCG Card Vending Machine
      </h2>
      <p className="ais-ChatGreeting-subheading">
        Ask me what cards are inside, find out what they&apos;re worth, or claim the card you just received.
      </p>
      <div className="chat-greeting-suggestions">
        {PROMPT_SUGGESTIONS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="chat-greeting-suggestion"
            onClick={() => sendMessage({ text: prompt })}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ChatAgent({ agentId }) {
  useEffect(() => {
    const handleViewAll = (e) => {
      if (e.target.closest('.ais-ChatToolSearchIndexCarouselHeaderViewAll')) {
        scrollToSearchBox();
      }
    };
    document.addEventListener('click', handleViewAll);
    return () => document.removeEventListener('click', handleViewAll);
  }, []);

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

ChatGreeting.propTypes = {
  sendMessage: PropTypes.func.isRequired,
};

ChatAgent.propTypes = {
  agentId: PropTypes.string.isRequired,
};
