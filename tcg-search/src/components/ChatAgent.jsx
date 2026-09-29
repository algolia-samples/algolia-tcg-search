import PropTypes from 'prop-types';
import {
  Chat,
  ChatSidePanelLayout,
  DisplayResultsToolType,
  GroupedResultsToolType,
} from 'react-instantsearch';
import 'instantsearch.css/components/chat.css';
import ChatItemComponent from './ChatItemComponent';
import { createGroupedResultsTool } from './ChatGroupedResultsTool';

// One instance, built outside the component: the factory creates the tool's
// renderer, so rebuilding it per render would remount the carousel mid-stream.
const groupedResultsTool = createGroupedResultsTool(ChatItemComponent);

// Registered under both names on purpose. Agents migrated to the production tool
// emit `algolia_grouped_results`; those still on the beta name emit
// `algolia_display_results`, and instantsearch.js aliases the two to one
// renderer. Overriding only the new name would silently drop our View All on any
// event that has not been re-published yet. Drop the legacy key once the whole
// fleet is migrated.
const CHAT_TOOLS = {
  [GroupedResultsToolType]: groupedResultsTool,
  [DisplayResultsToolType]: groupedResultsTool,
};

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
  return (
    <Chat
      agentId={agentId}
      layoutComponent={ChatSidePanelLayout}
      itemComponent={ChatItemComponent}
      emptyComponent={ChatGreeting}
      tools={CHAT_TOOLS}
      // These kiosks are shared: several people use one screen in sequence. The
      // library persists messages and open state to sessionStorage by default,
      // which would reopen the panel replaying the previous visitor's chat.
      persistence={false}
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
