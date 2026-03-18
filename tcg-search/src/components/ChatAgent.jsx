import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Chat, useInstantSearch } from 'react-instantsearch';
import 'instantsearch.css/components/chat.css';
import ChatItemComponent from './ChatItemComponent';

function ChatAutoSend({ message }) {
  const { indexRenderState } = useInstantSearch();
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;
    const chat = indexRenderState.chat;
    if (!chat?.sendMessage) return;
    sentRef.current = true;
    chat.setOpen(true);
    chat.sendMessage({ text: message });
  }, [indexRenderState, message]);

  return null;
}

ChatAutoSend.propTypes = {
  message: PropTypes.string.isRequired,
};

export default function ChatAgent({ agentId, initialMessage }) {
  return (
    <>
      <Chat agentId={agentId} itemComponent={ChatItemComponent} />
      {initialMessage && <ChatAutoSend message={initialMessage} />}
    </>
  );
}

ChatAgent.propTypes = {
  agentId: PropTypes.string.isRequired,
  initialMessage: PropTypes.string,
};
