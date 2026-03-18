# RFC: Multi-Modal Card Search

## Problem

Users of the TCG search app expect to be able to photograph a physical Pokemon card and have the app find it in the inventory. This requires extracting identifying information from an image and mapping it to a search query — a multi-modal search problem.

The constraints:
- Cards are photographed on mobile in varying lighting conditions
- OCR output is noisy (partial text, misspellings, set symbols, flavor text)
- The inventory is Algolia-indexed; search must map to real records
- Results should feel immediate — this is a lookup, not a conversation

---

## Approach 1: OCR + Cascade Search

**Live demo (mobile only):** https://algolia-tcg-search.vercel.app/

### How it works

1. User captures a card photo in the in-app camera
2. Image is sent to Google Cloud Vision OCR via `/api/ocr/extract`
3. The API parses the OCR text with regex to extract card name and card number
4. A cascade search runs in the browser:
   - Try name + number → if hits, navigate to results
   - Try name only → if hits, navigate to results
   - Try number only → if hits, navigate to results
   - If all fail, show an apology with a manual search fallback

### Pros
- Fast — direct Algolia queries, no LLM round-trip
- Deterministic — same input always produces the same behavior
- Results land directly in the search grid, which is the expected UX
- Simple to debug and test

### Cons
- Regex parsing is brittle — OCR noise, unexpected card layouts, non-English sets all cause failures
- Cascade logic lives in client code and needs maintenance as edge cases surface
- No ability to ask a clarifying question when the scan is ambiguous
- Apology UX is a dead end (user has to start over manually)

---

## Approach 2: OCR + AI Agent via Chat Widget

**Live demo (mobile only):** https://tcg-search-git-feat-agent-card-search-algolia.vercel.app/

### How it works

1. User captures a card photo
2. Image is sent to Google Cloud Vision OCR via `/api/ocr/extract`
3. The raw OCR text is packaged into a prompt and sent to the Algolia AI Agent via the chat widget:
   > "I photographed a Pokemon card. The text scanned from the card is: [OCR text]. Search for this card now."
4. The agent (configured in Algolia Agent Studio with search tools and fallback instructions) handles parsing, searching, and follow-up

The agent's instructions implement the same cascade logic as Approach 1, but in natural language:
1. Extract name and card number, search with both
2. If no results, search by name only — don't explain, just show results
3. If still no results, ask a clarifying question
4. If found, prompt the user to claim it

### Pros
- Agent handles parsing — no regex, more resilient to OCR noise
- Natural fallback to clarifying questions when the scan is ambiguous
- Maintains conversational context if the user wants to refine ("show me the holographic version")
- No client-side cascade logic to maintain

### Cons
- Slower — LLM + search round-trip adds latency
- The OCR text appears as a visible user message in the chat widget, which is noisy and confusing for end users
- No clean API to hide or replace the user message (see [blog post](BLOG.md))
- Chat is a conversational UI; a card scan is a one-shot lookup — these are mismatched interaction models
- Harder to test deterministically

---

## Approach 3: OCR + Cascade Search with Agent Fallback (Hybrid)

### How it works

1. User captures a card photo
2. Image is sent to Google Cloud Vision OCR
3. Cascade search runs as in Approach 1 (fast, direct)
4. **If the cascade succeeds:** navigate to results as normal
5. **If the cascade fails:** show the apology screen with a prominent "Ask the assistant" button that opens the chat widget with the OCR text pre-loaded as context

The agent only enters the picture when the deterministic path fails — and the user explicitly asks for help.

### Pros
- Fast path is fast — successful scans feel instant
- Agent handles the genuinely hard cases (ambiguous OCR, unusual cards) where a conversation is actually useful
- No awkward OCR text in the chat for successful scans
- Each piece does what it's good at: Algolia for lookup, agent for reasoning
- Easier to test — the happy path is fully deterministic

### Cons
- Two code paths to maintain (cascade logic + agent integration)
- The "ask the assistant" fallback requires the user to take an extra step
- Agent still receives the raw OCR text as a message (same visibility problem as Approach 2, but only in the failure case where the user explicitly invoked it)

---

## Open Questions

1. **How often does the cascade actually fail?** If OCR + regex is reliable enough in practice, the simpler Approach 1 may be sufficient and the agent adds unnecessary complexity.

2. **Is the chat the right surface for scan results?** Approach 2 works technically but feels like a mismatch. Would a purpose-built "agent results" view (outside the chat widget) serve better?

3. **Should the apology be smarter?** In Approach 3, the hybrid fallback requires a deliberate user action. Alternatively, the failed cascade could silently hand off to the agent without user intervention — but then we're back to Approach 2's latency and UX problems on the failure path.

4. **What does the user actually expect?** A camera-to-results flow (Approaches 1 and 3) matches the mental model of a barcode scanner. A camera-to-chat flow (Approach 2) matches the mental model of asking an assistant. These are different expectations.

---

## Recommendation

Approach 3 (hybrid) is the most pragmatic path. The cascade search handles the common case well; the agent handles the edge cases where reasoning genuinely helps. The main risk is that the failure-path UX (the "ask the assistant" button) adds friction precisely when the user is already frustrated.

If the cascade failure rate turns out to be high in practice, revisiting Approach 2 with better Chat widget API support (specifically a `userMessageComponent` prop for custom message rendering) would be worth exploring.
