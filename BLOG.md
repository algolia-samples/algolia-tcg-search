# Programmatically Injecting a Message into the Algolia InstantSearch Chat Widget

## The Problem

We built a Pokemon card scanner that uses Google Cloud Vision OCR to read text off a physical card. The natural next step was to pass that OCR text directly to our Algolia AI Agent — already configured with search tools — rather than maintaining a brittle regex parser and a waterfall of fallback searches.

The plan was simple: when the scan completes, open the chat widget and auto-send a prompt containing the OCR text. The agent handles parsing, searching, and fallbacks conversationally.

The challenge: **the `<Chat>` component from `react-instantsearch` has no documented API for this**. There's no `initialMessage`, `defaultValue`, or `autoSubmit` prop.

## What We Investigated

**The `<Chat>` component props** — We started by reading the component source at `node_modules/react-instantsearch/dist/es/widgets/Chat.js`. The accepted props are documented in the `_excluded` array at the top. Nothing for pre-populating or auto-sending a message.

**The InstantSearch team** — We asked directly. The advice from the team:

> "With the `renderState` you can access from `useInstantSearch`, you can use `openChat` and `sendMessage`. Check how we implemented prompt suggestions."

**`connectChat` in `instantsearch.js`** — We read `node_modules/instantsearch.js/es/connectors/chat/connectChat.js` to understand what the connector exposes. The `getWidgetRenderState` method returns the full chat state, including `sendMessage`, `setOpen`, `setInput`, and `messages`. The state is keyed under `'chat'` in the render state (the `type` parameter defaults to `'chat'`).

**`useInstantSearch` in `react-instantsearch-core`** — We read `useInstantSearch.js` and `useSearchState.js` to confirm that `indexRenderState.chat` is the right path: `renderState[indexId]` gives you the current index's render state, and the chat widget registers itself there as `chat`.

## The Solution

Create a small companion component that lives inside the same `<InstantSearch>` context as `<Chat>`. On mount, it reads `indexRenderState.chat` and calls `setOpen` + `sendMessage`. A ref guards against double-sends on re-renders.

```jsx
import { useEffect, useRef } from 'react';
import { useInstantSearch } from 'react-instantsearch';

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
```

In our `ChatAgent` component, we render `<ChatAutoSend>` alongside `<Chat>` when an initial message is present:

```jsx
export default function ChatAgent({ agentId, initialMessage }) {
  return (
    <>
      <Chat agentId={agentId} itemComponent={ChatItemComponent} />
      {initialMessage && <ChatAutoSend message={initialMessage} />}
    </>
  );
}
```

The parent `Search` component reads the message from React Router location state — captured in `useState` immediately so it survives InstantSearch's routing rewrite on mount:

```jsx
const [initialChatMessage] = useState(location.state?.initialChatMessage ?? null);

// ...

<ChatAgent agentId={agentId} initialMessage={initialChatMessage} />
```

And the card scanner navigates with the OCR text as state:

```js
const prompt = `I photographed a Pokemon card. The text scanned from the card is:\n\n${data.text}\n\nSearch for this card now.`;
navigate(`/${eventId}`, { replace: true, state: { initialChatMessage: prompt } });
```

## What We'd Like to See Next

The solution works, but it relies on internals that aren't part of the public API contract. Two additions to the `<Chat>` component would make this pattern first-class:

**1. A `userMessageComponent` prop** — analogous to the existing `itemComponent` for search results. Right now there are `userMessageLeadingComponent` and `userMessageFooterComponent` for decorating messages, but no way to replace the message rendering itself. A full `userMessageComponent` would let you implement fold/expand for long messages, replace the OCR dump with a compact "📷 Card scan" label, or add any other custom treatment — all in clean React state without touching the DOM.

**2. An `initialMessage` prop (or `onMount` callback)** — a documented, stable way to send a message on widget mount. The internal `sendMessage` and `setOpen` functions work, but accessing them through `indexRenderState` is undocumented and subject to change. Something like:

```jsx
<Chat
  agentId={agentId}
  initialMessage="Search for Pikachu 25/102"
/>
```

would cover the majority of "bring context into the chat" use cases without requiring consumers to dig into connector internals.
