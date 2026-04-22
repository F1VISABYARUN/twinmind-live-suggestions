# TwinMind — Live Suggestions Web App

A real-time AI meeting copilot that listens to live audio and surfaces 3 contextual suggestions every ~30 seconds.

**Live App:** [twinmind-live-suggestions-tau.vercel.app](https://twinmind-live-suggestions-tau.vercel.app/)

---

## Quick Start

```bash
npm install
npm run dev
# Open http://localhost:3000
# Click Settings → paste Groq API key → Save
# Click mic → start talking
```

**Prerequisites:** Node.js 18+, Groq API key (free at [console.groq.com](https://console.groq.com))

---

## Architecture

**Stack:** Next.js 14 (App Router), TypeScript, Custom CSS, Groq SDK

**Models (as required):**
- `whisper-large-v3` — audio transcription
- `openai/gpt-oss-120b` — suggestions and chat

**Why Next.js:** Built-in API routes (no separate backend), trivial Vercel deployment, TypeScript support out of the box.

**Why custom CSS over Tailwind/component libraries:** Full control over the dark theme, matches the prototype exactly, zero framework overhead.

---

## Prompt Strategy

This is the core of the submission. Three separate prompts serve three different purposes.

### 1. Live Suggestions Prompt — "The Decision Engine"

The suggestion prompt is not a simple "generate 3 ideas" instruction. It works in three steps:

**Step 1 — Conversation State Analysis (silent)**
The model first infers the current state before generating anything:
- **Phase:** Early (introductions/agenda), mid (deep discussion), or late (wrap-up/action items)
- **Energy:** Flowing, stalled, heated, or winding down
- **Last utterance type:** Question asked? Claim made? Decision proposed? Topic shift?
- **Domain:** Technical, business, creative, academic, or casual
- **Gaps:** What's not being said that should be? What assumptions are unchallenged?

**Step 2 — Type Selection Rules**
Based on the analysis, the prompt applies conditional logic:
- Someone asked a question → force at least one `ANSWER`
- A factual claim was made → force at least one `FACT_CHECK`
- Conversation is stalling → prioritize `TALKING_POINT`
- Meeting wrapping up → suggest action items or summaries
- Default: 3 different types for maximum diversity

**Step 3 — Output**
Exactly 3 suggestions, each with a `type`, `title` (6-10 words), and `preview` (1-2 sentences that deliver standalone value).

**Why this structure:** Most candidates will write "generate 3 suggestions." The state-analysis step makes suggestions feel contextually intelligent — they respond to what's happening, not just what's been said.

**Context window:** 800 words (~2 minutes of conversation). Tested at 400 (too narrow, misses context) and 1200 (too broad, dilutes focus). 800 is the sweet spot.

**Temperature:** 0.7 — creative enough for variety, focused enough for relevance.

### 2. Detailed Answer Prompt — "The Expansion"

When a user clicks a suggestion, a separate prompt generates a richer response using the full transcript (not just the recent window).

Key design decisions:
- **100-150 words max** — concise and scannable, not an essay
- **Grounded in transcript** — must reference what was actually said
- **Type-aware** — FACT_CHECK responses verify claims; ANSWER responses give direct answers; QUESTION responses explain why the question matters
- **Tone:** "Like a smart colleague whispering advice"

**Why separate from suggestions:** The preview should be useful without clicking. The expansion should reward clicking with genuinely more depth. Same prompt for both would either make previews too long or expansions too shallow.

### 3. Chat Prompt — "The Conversation"

For manual questions typed by the user. Uses full transcript + chat history for context.

- **80-150 words** — meeting context means brevity matters
- **Grounded** — if the transcript doesn't cover the topic, says so explicitly
- **No formatting bloat** — no tables, no headers, just clean paragraphs

### Formatting Decision

All prompts explicitly prohibit markdown tables, headers, and horizontal rules. Reason: the chat panel is narrow, and heavy formatting breaks the flow. Bold key terms and numbered lists are allowed for scannability.

---

## Tradeoffs

| Decision | Alternative | Why I chose this |
|----------|-------------|-----------------|
| 800-word context window | Full transcript every time | Lower latency, keeps model focused on "now" |
| 3-step prompt (analyze → select → output) | Simple "generate suggestions" | Better suggestion diversity and context-awareness |
| Separate detail prompt on click | Reuse suggestion prompt | Expansion feels genuinely richer than preview |
| Custom markdown renderer | External library (react-markdown) | Zero dependency, full control, small bundle |
| No streaming | Streaming responses | Simpler code, acceptable latency on Groq (~2s) |
| Session-only state (no DB) | localStorage or database | Per spec, and keeps architecture clean |
| Debug panel (4th column) | No debug view | Prompt transparency during interview; easy iteration |

---

## Observations from Using TwinMind

Before building, I used TwinMind's live suggestions feature across different conversation types:

- **Technical discussions:** TwinMind sometimes gives generic suggestions. My prompt adds domain detection and biases toward specific, technical suggestions when code/architecture terms appear.
- **Sales conversations:** When pricing or objections come up, my prompt's state analysis detects this and adjusts suggestion types toward next-steps and clarification.
- **1-on-1 / feedback:** My prompt reduces suggestion aggressiveness when the conversation is more personal — fewer fact-checks, more talking points.

---

## File Structure

```
app/
  page.tsx              Main layout, state management, recording logic
  layout.tsx            Root layout with metadata
  globals.css           Complete dark theme (design system)
  api/
    transcribe/route.ts Whisper Large V3 integration
    suggest/route.ts    GPT-OSS 120B suggestion generation
    chat/route.ts       GPT-OSS 120B chat responses
components/
  Transcript.tsx        Left column: mic button + transcript chunks
  Suggestions.tsx       Middle column: suggestion cards in batches
  Chat.tsx              Right column: chat with markdown rendering
  SettingsModal.tsx     Settings overlay: API key, prompts, context windows
  DebugPanel.tsx        4th column: prompt transparency + latency tracking
```

Every file has a single responsibility. No dead code. No unused imports.

---

## Features

- **3-column layout** matching the reference prototype
- **Audio capture** with 30-second chunking via MediaRecorder API
- **Auto-refresh** suggestions every ~30 seconds with countdown timer
- **Manual refresh** button for immediate suggestion update
- **Suggestion batches** stack chronologically, newest on top
- **Color-coded suggestion types** (QUESTION, TALKING_POINT, FACT_CHECK, CLARIFY, ANSWER)
- **Click-to-expand** detailed answers in chat panel
- **Manual chat** for user-typed questions with full transcript context
- **Settings modal** with editable prompts and context windows
- **Export** full session as JSON (transcript + suggestions + chat + debug logs)
- **Prompt Debug Panel** showing exact prompts, responses, latency, and token estimates
- **Error handling** for mic access, API key validation, network failures

---

## Performance

| Metric | Measured |
|--------|----------|
| Transcription (30s audio) | ~1-2 seconds |
| Suggestion generation | ~2-3 seconds |
| Chat response | ~1-2 seconds |
| Total reload-to-suggestions | ~3-5 seconds |

Groq's inference speed is the primary performance advantage. No streaming is implemented — acceptable given sub-3-second response times.

---

## Known Limitations

Being honest about what this prototype doesn't do:

- **No streaming** — responses arrive all at once after 1-3 seconds. Acceptable on Groq's fast inference, but streaming would improve perceived speed.
- **No speaker diarization** — Whisper doesn't distinguish between speakers. Multi-speaker meetings produce a merged transcript.
- **No persistent state** — refreshing the page clears everything. By design (per spec), but a production version would need session persistence.
- **Context window is fixed** — 800 words works well for most conversations, but a very fast-paced meeting might need dynamic window sizing.
- **English only** — Whisper supports other languages, but the prompts are tuned for English conversations.

---

## Future Directions

If this were a production feature at TwinMind:

1. **Streaming responses** — show tokens as they arrive for faster perceived latency.

2. **Meeting type auto-detection** — the prompt already infers domain (technical/business/casual), but a dedicated classifier could adjust the entire prompt strategy per meeting type. Sales meetings would bias toward objection handling and next steps. Technical discussions would bias toward architecture questions and fact-checks.

3. **Suggestion diversity algorithm** — track recent suggestion types across batches and penalize repetition. If the last 2 batches were heavy on QUESTION, force the model toward TALKING_POINT or ANSWER.

4. **Personalization** — learn what suggestion types a specific user finds most useful over time (based on click-through patterns) and adjust the selection rules accordingly.

5. **Recall and Review Mode** — this is what excites me most about TwinMind's long-term potential. TwinMind already captures and organizes context exceptionally well. A natural extension would be to let users mark key moments — an important decision, a surprising fact, a commitment made — and later surface lightweight review prompts to help them retain those insights long-term. This turns TwinMind from a real-time assistant into a durable second brain: not just "what was said" but "what should I remember."

---

## Deployment

```bash
# Vercel (recommended)
npm i -g vercel
vercel

# Or: vercel.com → Import GitHub repo → Deploy
```

No environment variables needed. API key is entered by the user in the Settings UI.

---

## About This Submission

I studied TwinMind's product before building — both the live suggestions feature and the broader vision of always-on context capture. This assignment felt natural because I think deeply about how real-time assistance and long-term retention connect: useful in-the-moment suggestions are the first step, but the real value is helping people remember what matters.

I built within scope, focused on prompt quality over feature quantity, and made every tradeoff deliberately. The code is something I'd be comfortable maintaining in a real codebase.

Built for the TwinMind Live Suggestions assignment.
