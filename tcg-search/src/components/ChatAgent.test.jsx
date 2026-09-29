import { vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatAgent from './ChatAgent';

const { chatProps, sendMessage } = vi.hoisted(() => ({
  chatProps: { current: null },
  sendMessage: vi.fn(),
}));

// Capture what <Chat> is configured with, and render the components the app
// hands it so the greeting is exercised for real rather than asserted by shape.
vi.mock('react-instantsearch', () => ({
  Chat: (props) => {
    chatProps.current = props;
    // eslint-disable-next-line react/prop-types -- a test double, not a component
    const Empty = props.emptyComponent;
    return (
      <div data-testid="chat">
        {Empty ? <Empty sendMessage={sendMessage} /> : null}
      </div>
    );
  },
  ChatSidePanelLayout: function ChatSidePanelLayout() {
    return null;
  },
  Carousel: function Carousel() {
    return null;
  },
  GroupedResultsToolType: 'algolia_grouped_results',
  DisplayResultsToolType: 'algolia_display_results',
}));

vi.mock('./ChatItemComponent', () => ({
  default: function ChatItemComponent() {
    return null;
  },
}));

beforeEach(() => {
  chatProps.current = null;
  sendMessage.mockClear();
});

describe('ChatAgent — Chat wiring', () => {
  test('passes the event agent id through', () => {
    render(<ChatAgent agentId="agent-123" />);
    expect(chatProps.current.agentId).toBe('agent-123');
  });

  // Regression guard: instantsearch.js 4.116.0 defaults message + open-state
  // persistence ON, which would reopen the panel replaying the previous
  // visitor's conversation on a kiosk shared between attendees.
  test('disables persistence so a shared kiosk does not replay the last visitor', () => {
    render(<ChatAgent agentId="agent-123" />);
    expect(chatProps.current.persistence).toBe(false);
  });

  test('renders cards through the app card component, in the side panel layout', async () => {
    const { ChatSidePanelLayout } = await import('react-instantsearch');
    const { default: ChatItemComponent } = await import('./ChatItemComponent');
    render(<ChatAgent agentId="agent-123" />);
    expect(chatProps.current.layoutComponent).toBe(ChatSidePanelLayout);
    expect(chatProps.current.itemComponent).toBe(ChatItemComponent);
  });

  test('enables message feedback', () => {
    render(<ChatAgent agentId="agent-123" />);
    expect(chatProps.current.feedback).toBe(true);
  });

  // We override the Grouped Results tool to add a "View all" the library does
  // not ship. Registered under both names because agents not yet re-published
  // still emit the legacy one, and the app would otherwise lose the button on
  // those events.
  test('overrides the grouped results tool under both its names', () => {
    render(<ChatAgent agentId="agent-123" />);
    const tools = chatProps.current.tools;
    expect(Object.keys(tools).sort()).toEqual([
      'algolia_display_results',
      'algolia_grouped_results',
    ]);
    // The same instance, so the two names cannot drift apart.
    expect(tools.algolia_display_results).toBe(tools.algolia_grouped_results);
  });

  // The override must supply a layout and nothing else. react-instantsearch's
  // mergeToolOptions only inherits `streamInput` (progressive rendering, and
  // with it the guard against a half-streamed objectID hydrating the wrong
  // card) when the user tool leaves it undefined. Setting it here — even to the
  // right value — would freeze a default the library is entitled to change.
  test('supplies only a layout, leaving streaming and gating to the library', () => {
    render(<ChatAgent agentId="agent-123" />);
    const tool = chatProps.current.tools.algolia_grouped_results;
    expect(Object.keys(tool)).toEqual(['layoutComponent']);
    expect(tool.streamInput).toBeUndefined();
    expect(tool.shouldRender).toBeUndefined();
  });
});

describe('ChatAgent — greeting', () => {
  test('shows the vending machine greeting', () => {
    render(<ChatAgent agentId="agent-123" />);
    expect(
      screen.getByRole('heading', { name: /Algolia TCG Card Vending Machine/i })
    ).toBeInTheDocument();
  });

  test('offers every prompt suggestion as a button', () => {
    render(<ChatAgent agentId="agent-123" />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(5);
    expect(
      screen.getByRole('button', { name: 'Do you have any Charizard cards?' })
    ).toBeInTheDocument();
  });

  test('sends the prompt text when a suggestion is clicked', () => {
    render(<ChatAgent agentId="agent-123" />);
    fireEvent.click(
      screen.getByRole('button', { name: 'How do I get a card?' })
    );
    expect(sendMessage).toHaveBeenCalledWith({ text: 'How do I get a card?' });
  });
});
