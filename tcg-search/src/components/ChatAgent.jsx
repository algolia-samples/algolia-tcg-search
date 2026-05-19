import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Chat } from 'react-instantsearch';
import 'instantsearch.css/components/chat.css';
import ChatItemComponent from './ChatItemComponent';
import { makeInventoryTool } from './chat/tools/inventoryTool';

export default function ChatAgent({ agentId, eventId }) {
  const tools = useMemo(() => ({
    check_card_inventory: makeInventoryTool(eventId),
  }), [eventId]);

  return (
    <Chat
      agentId={agentId}
      resume={true}
      itemComponent={ChatItemComponent}
      tools={tools}
    />
  );
}

ChatAgent.propTypes = {
  agentId: PropTypes.string.isRequired,
  eventId: PropTypes.string.isRequired,
};
