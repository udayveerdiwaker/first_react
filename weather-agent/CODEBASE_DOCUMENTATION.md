# ZyroChat Codebase Documentation

## 1. Overview

ZyroChat is a React + TypeScript frontend paired with a lightweight Express backend. The application delivers a chat-style AI assistant with:

- streamed answers through OpenRouter
- local and backend-provided tools
- weather and utility integrations
- conversation persistence in local storage
- a responsive GPT-style interface
- MCP-style backend tool bridging
- multiple assistant modes and Markdown export
- stable chat ordering that only changes on real conversation updates
- interaction locking while responses are still streaming
- composer submission disabled until the current streamed response fully completes
- a fixed scroll-to-bottom button that stays visible above the composer layer

This document is intended for onboarding, maintenance, and future extension work. It covers the authored repository files and excludes generated folders such as `node_modules/` and `dist/`.

## 2. High-Level Architecture

### Frontend responsibilities

- render the chat UI
- manage conversation state
- persist chats in browser storage
- request AI responses from OpenRouter
- decide whether to call tools
- stream results into the UI

### Backend responsibilities

- expose MCP-like tool metadata and execution endpoints
- host utility endpoints like conversation title generation
- wrap external APIs such as AQI, news, and IP geolocation

### Main runtime flow

1. The user types a prompt in the frontend.
2. `ChatBox.tsx` calls `runSmartAgentStream(...)`.
3. `smartAgent.ts` asks OpenRouter whether a tool should be used.
4. If a tool is selected:
   - local tools are executed through `toolRegistry.ts`, or
   - backend MCP tools are executed through `mcpClient.ts`.
5. If no tool is selected, the model streams a normal response.
6. The UI updates token-by-token and stores the final result in local storage.

## 3. Directory Map

```text
weather-agent/
├─ backend/                 Express backend and MCP bridge
├─ public/                  Static assets served as-is
├─ src/
│  ├─ agent/                Model orchestration, prompts, tool plumbing
│  ├─ assets/               App-local image and SVG assets
│  ├─ components/           React UI building blocks
│  ├─ store/                Browser persistence helpers
│  ├─ tools/                Frontend-callable tools
│  └─ utils/                Small shared utilities
├─ *.md                     Product notes, guides, and status docs
└─ config files             Vite, TypeScript, ESLint, Tailwind
```

## 4. Environment Variables

Expected environment variables, inferred from the codebase:

| Variable | Used By | Purpose |
| --- | --- | --- |
| `VITE_OPENROUTER_API_KEY` | `src/agent/smartAgent.ts` | Auth for OpenRouter chat completions |
| `VITE_BACKEND_URL` | `src/agent/mcpClient.ts` | Frontend base URL for backend API calls |
| `VITE_WEATHER_API_KEY` | `src/tools/weather.ts`, backend fallback usage | OpenWeather access from frontend |
| `OPENAI_API_KEY` | `backend/index.js` | Backend OpenAI access for title generation |
| `VITE_OPENAI_API_KEY` | `backend/index.js` | Alternate OpenAI key source |
| `WEATHER_API_KEY` | `backend/index.js` | Backend weather/AQI lookups |
| `NEWS_API_KEY` | `backend/index.js` | News provider access |
| `VITE_NEWS_API_KEY` | `backend/index.js` | Alternate news provider key |
| `PORT` | `backend/index.js` | Backend port override |

## 5. Core Frontend Flows

### Conversation lifecycle

- `App.tsx` loads stored chats on startup.
- `Sidebar.tsx` lets the user switch, rename, search, and delete conversations.
- `ChatBox.tsx` owns active-message interaction and response generation.
- `chatStore.ts` persists chat sessions after important changes.
- selecting a chat does not update its sort position by itself
- a chat only rises in the list when its contents genuinely change

### Assistant mode flow

- `src/components/dropdown.tsx` renders the mode picker.
- `ChatBox.tsx` stores the current mode in local storage.
- `smartAgent.ts` receives the selected mode and injects the matching prompt through `SystemPrompt.ts`.
- `SystemPrompt.ts` now uses a cleaner, mode-aware instruction model focused on accuracy, adaptability, and concise usefulness

### Interaction lock flow

- `ChatBox.tsx` derives an `interactionLocked` state from streaming and regeneration activity.
- while locked, the app prevents cross-chat actions that could interrupt the active response flow
- while locked, the composer cannot submit another prompt
- `App.tsx` shares that lock state with `Sidebar.tsx`
- `Sidebar.tsx` blocks chat switching and starting a new chat until the active response is done

### Scroll-to-bottom behavior

- `ChatBox.tsx` shows a floating scroll button when the user is away from the latest message
- the button is positioned above the sticky composer and given a higher stacking context so it stays visible and clickable

### Tooling flow

- `smartAgent.ts` asks the model to choose a tool.
- `toolRegistry.ts` exposes tool definitions and dispatches tool execution.
- local tools run directly in the browser
- backend tools are proxied through `mcpClient.ts`

### Export flow

- `ChatBox.tsx` can export the active conversation as Markdown.
- export includes the chat title, timestamp, mode, and a speaker-separated transcript.

## 6. File-by-File Reference

## 6.1 Root Application Files

### `package.json`

**Purpose**

- defines frontend package metadata, scripts, and dependencies

**Responsibilities**

- provides `dev`, `build`, `lint`, and `preview` commands
- declares React, Tailwind, Markdown, animation, and OpenAI-related dependencies

**Interactions**

- consumed by npm during install and script execution

### `package-lock.json`

**Purpose**

- locks exact frontend dependency versions

**Responsibilities**

- ensures reproducible installs across machines and CI

**Interactions**

- generated and consumed by npm

### `index.html`

**Purpose**

- Vite entry HTML document

**Responsibilities**

- hosts the root DOM container used by React

**Interactions**

- `src/main.tsx` mounts the React application into the root element

### `vite.config.ts`

**Purpose**

- configures the Vite dev/build toolchain

**Responsibilities**

- enables React plugin support
- enables Tailwind Vite integration

**Interactions**

- used automatically by Vite during dev server startup and production builds

### `tsconfig.json`

**Purpose**

- shared TypeScript project reference entrypoint

**Responsibilities**

- coordinates TypeScript project configs

**Interactions**

- points TypeScript tooling at app and node-specific configurations

### `tsconfig.app.json`

**Purpose**

- TypeScript configuration for the frontend app

**Responsibilities**

- controls compiler behavior for `src/`

**Interactions**

- used by `tsc -b` for the app build

### `tsconfig.node.json`

**Purpose**

- TypeScript configuration for Node-side config files

**Responsibilities**

- supports typing for Vite and other tooling files

**Interactions**

- used in the TypeScript project build graph

### `eslint.config.js`

**Purpose**

- defines linting behavior for the repository

**Responsibilities**

- configures ESLint, TypeScript linting, and React hooks linting

**Interactions**

- used by `npm run lint`

### `tailwind.config.js`

**Purpose**

- Tailwind configuration entry

**Responsibilities**

- supports Tailwind theme scanning and customization

**Interactions**

- used by Tailwind tooling in Vite

### `README.md`

**Purpose**

- default project readme inherited from the Vite template

**Responsibilities**

- describes generic React + Vite setup

**Interactions**

- currently serves as a minimal template readme rather than project-specific docs

### `BUG_FIXES.md`

**Purpose**

- project note tracking implemented bug fixes

**Responsibilities**

- records historical fixes and decisions for reference

**Interactions**

- useful for maintainers validating regressions or prior problem areas

### `CRITICAL_FIXES.md`

**Purpose**

- log of high-priority corrections

**Responsibilities**

- preserves context around critical stability or correctness changes

**Interactions**

- complements the main technical docs for maintenance work

### `DEPLOYMENT.md`

**Purpose**

- deployment-oriented project guide

**Responsibilities**

- explains environment and release setup

**Interactions**

- useful when preparing hosting or production rollout

### `FEATURES.md`

**Purpose**

- feature-oriented overview document

**Responsibilities**

- records supported product capabilities

**Interactions**

- complements this codebase guide from a product perspective

### `IMPLEMENTATION_COMPLETE.md`

**Purpose**

- project completion/status document

**Responsibilities**

- tracks what was implemented at a milestone

**Interactions**

- helpful for understanding prior delivery scope

### `PROJECT_COMPLETE.md`

**Purpose**

- project summary note

**Responsibilities**

- documents completion status and likely scope summary

**Interactions**

- another project-history reference artifact

### `PRODUCTION_GUIDE.md`

**Purpose**

- operations and production-readiness guide

**Responsibilities**

- likely covers hosting, environment setup, and runtime considerations

**Interactions**

- complements `DEPLOYMENT.md`

### `QUICK_REFERENCE.md`

**Purpose**

- short operational reference for the project

**Responsibilities**

- provides condensed lookup information for common tasks

**Interactions**

- useful for day-to-day maintenance

### `CODEBASE_DOCUMENTATION.md`

**Purpose**

- this onboarding and maintenance guide

**Responsibilities**

- documents architecture, file purposes, key functions, and interactions

**Interactions**

- intended as the primary maintainability reference for contributors

## 6.2 Frontend App Shell

### `src/main.tsx`

**Purpose**

- React entrypoint

**Responsibilities**

- imports global CSS
- mounts `App.tsx` inside `StrictMode`

**Interactions**

- bootstraps the entire frontend application

### `src/App.tsx`

**Purpose**

- top-level application shell

**Responsibilities**

- loads stored chats on first render
- migrates older chat objects to include titles and timestamps
- controls whether the sidebar is open on smaller screens
- tracks whether cross-chat interaction should be temporarily locked
- wires `Sidebar` and `ChatBox` together
- displays the loading screen while bootstrapping state

**Key functions and logic**

- startup `useEffect`: loads and normalizes chats
- loading guard: renders a branded loading state

**Interactions**

- reads/writes chat sessions via `chatStore.ts`
- passes state down to `Sidebar.tsx` and `ChatBox.tsx`

### `src/App.css`

**Purpose**

- reserved component stylesheet

**Responsibilities**

- currently unused or empty

**Interactions**

- safe to remove if it remains unused, or keep for future app-level styles

### `src/index.css`

**Purpose**

- global styling layer

**Responsibilities**

- imports Tailwind
- defines global typography, background gradients, scrolling behavior, and helper animations
- provides dark-mode-aware global styling

**Key definitions**

- `:root` theme defaults
- body and background styling
- custom scrollbar rules
- `fadeIn` and `float` animations

**Interactions**

- applies across all frontend components

## 6.3 Frontend Components

### `src/components/ChatBox.tsx`

**Purpose**

- the primary conversation workspace

**Responsibilities**

- owns active input state and message rendering
- triggers AI responses
- serializes chat flow so a new user send cannot begin while the previous reply is still streaming
- handles editing, regenerating, deleting, liking, disliking, copying, and sharing messages
- stores assistant mode in local storage
- exports the active conversation as Markdown
- manages scroll locking and “scroll to bottom” behavior
- toggles the UI theme

**Key functions**

- `handleScroll()`: determines whether the user is away from the bottom
- `touchChatSession()`: updates a session’s timestamp and optional messages
- `handleLikeMessage()` / `handleDislikeMessage()`: feedback state
- `handleDeleteMessage()`: removes a message from a session
- `handleEditMessage()` / `handleSaveEdit()`: supports prompt editing and regeneration
- `handleRegenerate()`: retries the latest assistant answer
- `generateResponse()`: central response-generation pipeline
- `handleSend()`: creates a new chat or appends to the current one
- `handleStop()`: aborts streaming
- `toggleTheme()`: toggles dark/light mode
- `exportChatAsMarkdown()`: downloads the active transcript as `.md`
- `interactionLocked`: derived lock that keeps new actions from starting mid-stream
- floating scroll button: placed above the sticky composer with a stronger z-index

**Interactions**

- calls `runSmartAgentStream()` from `src/agent/smartAgent.ts`
- uses `generateChatTitle()` for new sessions
- uses `saveChats()` to persist session changes
- renders `ChatInput`, `MarkdownRenderer`, and `ModeSelector`
- reports interaction lock state up to `App.tsx`

### `src/components/ChatInput.tsx`

**Purpose**

- reusable chat composer for both empty and active states

**Responsibilities**

- auto-expands the textarea
- supports Enter-to-send and Shift+Enter newline behavior
- blocks new submission while the current response is still streaming
- renders empty-state quick prompts

**Key logic**

- `handleInput()`: resizes the textarea dynamically
- `interactionLocked`: disables submission until the active streamed reply completes

**Interactions**

- controlled by `ChatBox.tsx`

### `src/components/Sidebar.tsx`

**Purpose**

- conversation navigator and workspace summary panel

**Responsibilities**

- starts new chats
- searches sessions
- groups sessions by time windows
- renames, copies, and deletes sessions
- shows workspace stats
- keeps mobile close behavior restricted to outside clicks
- preserves current chat ordering when a user simply opens a conversation

**Key logic**

- `handleRenameChat()`: updates title and timestamp
- `handleCopyChatContent()`: copies a full transcript
- `workspaceStats`: memoized chat/message counters
- `groupedChats`: memoized time-based grouping
- chat selection: opens the chosen chat without changing its `updatedAt` value

**Interactions**

- updates shared chat state from `App.tsx`
- uses `DeleteModal.tsx`
- persists session data through `saveChats()`

### `src/components/DeleteModal.tsx`

**Purpose**

- confirmation dialog for destructive conversation deletion

**Responsibilities**

- presents deletion warning UI
- calls `onClose` and `onConfirm`
- animates modal entrance with Framer Motion

**Interactions**

- used by `Sidebar.tsx`

### `src/components/MarkdownRenderer.tsx`

**Purpose**

- renders assistant responses with Markdown support

**Responsibilities**

- parses Markdown with GitHub Flavored Markdown support
- custom-renders headings, paragraphs, lists, tables, links, and blockquotes
- renders syntax-highlighted code blocks
- adds code-copy affordances

**Key components**

- `CodeBlockCopy`: memoized code block wrapper with clipboard copy
- `MarkdownRenderer`: memoized Markdown container

**Interactions**

- used by `ChatBox.tsx` for bot responses
- depends on `react-markdown`, `remark-gfm`, and `react-syntax-highlighter`

### `src/components/dropdown.tsx`

**Purpose**

- assistant mode selector UI

**Responsibilities**

- displays available response modes
- lets the user switch between Normal, Coding, Teaching, and Fun modes
- visually explains what each mode does

**Interactions**

- controlled by `ChatBox.tsx`
- indirectly affects `SystemPrompt.ts` and model behavior via `smartAgent.ts`

## 6.4 Frontend Agent Layer

### `src/agent/types.ts`

**Purpose**

- shared type definitions for chat and tool orchestration

**Responsibilities**

- defines `ChatMessage`
- defines tool definition and execution contracts

**Interactions**

- imported by `smartAgent.ts`, `toolRegistry.ts`, and `mcpClient.ts`

### `src/agent/SystemPrompt.ts`

**Purpose**

- produces the system prompt sent to the language model

**Responsibilities**

- defines a high-signal base instruction set for clarity, truthfulness, tool use, formatting, and reasoning quality
- appends mode-specific instructions for Normal, Coding, Teaching, and Fun

**Key function**

- `getSystemPrompt(mode: string)`

**Interactions**

- called by `smartAgent.ts` before each model request

### `src/agent/toolRegistry.ts`

**Purpose**

- central registry for available tools

**Responsibilities**

- defines frontend-local tools
- fetches backend MCP tool definitions when possible
- falls back to local-only tool definitions if backend discovery fails
- routes tool execution to the correct runtime

**Key functions**

- `getDateTime()`
- `calculate(expression)`
- `getToolDefinitions(signal?)`
- `runToolByName(name, args, signal)`

**Interactions**

- uses `src/tools/weather.ts` for local weather
- uses `mcpClient.ts` for backend tool discovery and execution
- used by `smartAgent.ts`

### `src/agent/mcpClient.ts`

**Purpose**

- frontend client for the backend MCP bridge

**Responsibilities**

- fetches tool definitions from the backend
- executes backend tools by name

**Key functions**

- `getMcpToolDefinitions(signal?)`
- `executeMcpTool(name, args, signal?)`

**Interactions**

- called by `toolRegistry.ts`
- communicates with Express backend endpoints

### `src/agent/smartAgent.ts`

**Purpose**

- main AI orchestration module

**Responsibilities**

- builds model message payloads
- decides whether the model should call a tool
- streams plain model responses
- simulates character-by-character streaming for tool output
- normalizes abort behavior

**Key constants**

- `OPENROUTER_URL`
- `OPENROUTER_MODEL`
- `MAX_CONTEXT_MESSAGES`

**Key functions**

- `getHeaders()`: constructs OpenRouter request headers
- `buildMessages()`: formats chat history and system prompt for the model
- `streamText()`: fake-streams tool results for UI consistency
- `requestToolDecision()`: asks the model whether to call a tool
- `streamModelResponse()`: processes streamed SSE model output
- `runSmartAgentStream()`: end-to-end assistant execution entrypoint

**Interactions**

- uses `SystemPrompt.ts` for mode-dependent prompting
- uses `toolRegistry.ts` for definitions and execution
- called by `ChatBox.tsx`

## 6.5 Frontend Utilities and Storage

### `src/store/chatStore.ts`

**Purpose**

- browser persistence helper for conversations

**Responsibilities**

- normalizes chat records before storage
- loads chats from local storage
- saves chats back to local storage

**Key functions**

- `normalizeChats(chats)`
- `getChats()`
- `saveChats(chats)`

**Interactions**

- used by `App.tsx`, `ChatBox.tsx`, and `Sidebar.tsx`

### `src/utils/titleGenerator.ts`

**Purpose**

- local chat title generation utility

**Responsibilities**

- derives concise titles from the first user prompt
- filters stop words and prioritizes action verbs
- avoids network dependency by using local heuristics

**Key functions**

- `generateChatTitleLocal(input)`
- `generateChatTitle(input)`

**Interactions**

- used by `ChatBox.tsx` when creating new conversations

## 6.6 Frontend Tools

### `src/tools/weather.ts`

**Purpose**

- frontend weather tool implementation

**Responsibilities**

- validates city input
- calls OpenWeather directly from the frontend
- applies a timeout to prevent hanging requests
- normalizes weather responses and errors

**Key function**

- `getWeather(city)`

**Interactions**

- used by `toolRegistry.ts` as a local tool

### `src/tools/image.ts`

**Purpose**

- lightweight image generation URL helper

**Responsibilities**

- builds a Pollinations image URL from a text prompt

**Key function**

- `generateImage(prompt)`

**Interactions**

- currently available for future UI integration

## 6.7 Assets and Type Support

### `src/react-syntax-highlighter.d.ts`

**Purpose**

- TypeScript declaration support for syntax highlighter imports

**Responsibilities**

- helps TypeScript understand module usage for code highlighting

**Interactions**

- supports `MarkdownRenderer.tsx`

### `src/assets/react.svg`

**Purpose**

- default React asset from scaffold

**Responsibilities**

- static SVG asset

**Interactions**

- not central to runtime behavior

### `src/assets/vite.svg`

**Purpose**

- default Vite asset from scaffold

**Responsibilities**

- static SVG asset

**Interactions**

- not central to runtime behavior

### `src/assets/hero.png`

**Purpose**

- project image asset

**Responsibilities**

- static visual asset available to the frontend

**Interactions**

- usable in future design enhancements

### `public/favicon.svg`

**Purpose**

- browser tab icon

**Responsibilities**

- static asset served directly by Vite

**Interactions**

- referenced by the browser as part of app metadata

### `public/icons.svg`

**Purpose**

- shared icon asset bundle

**Responsibilities**

- stores SVG content that can be reused by the UI

**Interactions**

- served from the public root

## 6.8 Backend

### `backend/package.json`

**Purpose**

- backend package manifest

**Responsibilities**

- defines backend dependencies and scripts
- provides `start` and `dev` commands

**Interactions**

- used by npm within the backend workspace

### `backend/package-lock.json`

**Purpose**

- locks backend dependency versions

**Responsibilities**

- ensures reproducible backend installs

**Interactions**

- maintained by npm

### `backend/index.js`

**Purpose**

- Express API server and MCP bridge

**Responsibilities**

- configures Express middleware
- exposes MCP tool list and execution endpoints
- provides title generation endpoint
- exposes a health endpoint
- wraps external APIs for AQI, news, and geolocation

**Key functions**

- `getDateTime()`
- `calculate(expression)`
- `getAQI(city)`
- `getNews()`
- `getIPLocation()`
- `executeMcpTool(name, args)`

**Key routes**

- `GET /api/mcp/tools`
- `POST /api/mcp/execute`
- `POST /api/generate-title`
- `GET /api/health`

**Interactions**

- consumed by `src/agent/mcpClient.ts`
- uses `openai` for title generation
- calls external weather, news, and location APIs

## 7. Important Design Decisions

### Local-first chat persistence

- chat history is stored in browser local storage
- this avoids database complexity
- the tradeoff is that history is device-local

### Hybrid tool model

- some tools are browser-local
- some tools are backend-hosted
- this balances responsiveness with API protection and extensibility

### Streaming-first UX

- the app favors streamed UI feedback even for tool results
- tool outputs are fake-streamed to preserve a consistent chat experience
- while a response is streaming, cross-chat actions are locked to avoid inconsistent UI state

### Mode-based prompting

- user-visible assistant modes are implemented entirely through prompt variation
- this keeps the UI simple while still allowing differentiated assistant behavior

## 8. Extension Points

Recommended next places to extend the project:

- add more backend MCP tools in `backend/index.js`
- register more local tools in `src/agent/toolRegistry.ts`
- persist assistant mode per conversation instead of globally
- introduce structured chat session types instead of `any`
- add tests around `titleGenerator.ts`, `chatStore.ts`, and tool execution
- unify frontend and backend tool capabilities so the weather/AQI/news tool set is fully discoverable

## 8.1 Recent Enhancements

The following recent enhancements are now part of the codebase:

- Assistant modes with a dedicated selector in `src/components/dropdown.tsx`
- Markdown export for full conversations in `src/components/ChatBox.tsx`
- GPT-like compact chat list behavior in `src/components/Sidebar.tsx`
- Stable chat ordering so selection alone does not reorder conversations
- Interaction locking during streaming to ensure one response completes before another begins
- Composer submission locking so a new prompt cannot be sent before the current response finishes typing
- Scroll-down control positioning fixes for visibility above the composer area
- A redesigned `src/agent/SystemPrompt.ts` for stronger answer quality and better mode control

## 8.2 Code Comments

Small inline comments were added only where they clarify important behavior without creating noise.

- `src/components/ChatBox.tsx`
  Explains why cross-chat actions are locked during streaming and regeneration.

These comments are intentionally minimal so the code stays readable while still highlighting behavior that could otherwise be easy to miss during maintenance.

## 9. Known Technical Debt

- several components still use `any` props and state shapes
- `calculate()` relies on `eval`, which is unsafe for untrusted expressions
- frontend weather calls expose API usage to the client
- no automated test suite is currently present
- some historical markdown docs likely overlap and may need consolidation
- `src/App.css` appears unused

## 10. Onboarding Checklist

For a new contributor, the most useful reading order is:

1. `src/App.tsx`
2. `src/components/ChatBox.tsx`
3. `src/agent/smartAgent.ts`
4. `src/agent/toolRegistry.ts`
5. `backend/index.js`
6. `src/components/Sidebar.tsx`
7. `src/utils/titleGenerator.ts`

## 11. Suggested Refactor Roadmap

Short-term improvements:

- replace `any` with shared chat/session interfaces
- extract chat actions from `ChatBox.tsx` into smaller hooks or helpers
- centralize mode constants so prompt and UI stay synchronized

Mid-term improvements:

- add unit tests for core utility modules
- introduce conversation metadata typing for export and analytics
- split backend tools into separate files instead of a single `backend/index.js`

Long-term improvements:

- support authenticated cloud persistence
- add per-conversation settings and tool policies
- move from heuristic local title generation to configurable title strategies
