# Programmatically Injecting a Message into the Algolia InstantSearch Chat Widget

## The Problem

I built a Pokemon card scanner that uses Google Cloud Vision OCR to read text off a physical card. The natural next step was to pass that OCR text directly to an Algolia AI Agent — already configured with search tools — rather than maintaining a brittle regex parser and a waterfall of fallback searches.

The plan felt straightforward: when the scan completes, open the chat widget and auto-send a prompt containing the OCR text. The agent handles parsing, searching, and fallbacks conversationally.

Then I hit a wall. **The `<Chat>` component from `react-instantsearch` has no documented API for this.** There's no `initialMessage`, `defaultValue`, or `autoSubmit` prop. The docs don't cover it. I was going to have to dig.

## What I Investigated

The first stop was the component source itself — `node_modules/react-instantsearch/dist/es/widgets/Chat.js`. The accepted props are listed in the `_excluded` array at the top of the file. Nothing there for pre-populating or auto-sending a message.

I reached out to the InstantSearch team directly. The tip I got back:

> "With the `renderState` you can access from `useInstantSearch`, you can use `openChat` and `sendMessage`. Check how we implemented prompt suggestions."

That was enough to go on. I opened `node_modules/instantsearch.js/es/connectors/chat/connectChat.js` and read through `getWidgetRenderState` — the method that describes everything the connector exposes. It returns the full chat state: `sendMessage`, `setOpen`, `setInput`, `messages`, and more. Crucially, this state is keyed under `'chat'` in the render state object (the `type` parameter in the connector defaults to `'chat'`).

From there I traced through `useInstantSearch.js` and `useSearchState.js` in `react-instantsearch-core` to confirm the path: `renderState[indexId]` gives you the current index's render state, so `indexRenderState.chat` is where the chat widget registers itself.

## The Solution

The approach is a small companion component that lives inside the same `<InstantSearch>` context as `<Chat>`. On mount, it reads `indexRenderState.chat` and calls `setOpen` + `sendMessage`. A ref guards against double-sends on re-renders.

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

In my `ChatAgent` component, I render `<ChatAutoSend>` alongside `<Chat>` when an initial message is present:

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

## What I'd Like to See Next

The solution works, but it relies on internals that aren't part of the public API contract — which means it could break with any minor release. Two additions to the `<Chat>` component would make this pattern first-class:

**1. A `userMessageComponent` prop** — analogous to the existing `itemComponent` for search results. Right now there are `userMessageLeadingComponent` and `userMessageFooterComponent` for decorating messages, but no way to replace the message rendering itself. A full `userMessageComponent` would let you implement fold/expand for long messages, swap out a raw OCR dump for a compact "📷 Card scan" label, or add any other custom treatment — all in clean React state without touching the DOM.

**2. An `initialMessage` prop (or `onMount` callback)** — a documented, stable way to send a message on widget mount. The internal `sendMessage` and `setOpen` functions work fine, but surfacing them through `indexRenderState` is undocumented and subject to change. Something like:

```jsx
<Chat
  agentId={agentId}
  initialMessage="Search for Pikachu 25/102"
/>
```

would cover the majority of "bring context into the chat" use cases without requiring anyone to spelunk through connector internals.
