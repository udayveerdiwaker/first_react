# How ZyroChat Works - Simple & Complete Guide

Welcome to **ZyroChat**! This guide explains all features of the AI Workspace in very simple, easy-to-understand words, complete with step-by-step flows showing how everything works behind the scenes.

---

## Table of Contents
1. [What is ZyroChat?](#1-what-is-zyrochat)
2. [Big Picture: How Everything Connects](#2-big-picture-how-everything-connects)
3. [The 6 AI Modes (How to Pick the Right Mode)](#3-the-6-ai-modes)
4. [Real Web Search & Citations](#4-real-web-search--citations)
5. [File & Document Reading](#5-file--document-reading)
6. [Interactive Side-by-Side Workspace Panel](#6-interactive-side-by-side-workspace-panel)
7. [Projects & Custom Instructions](#7-projects--custom-instructions)
8. [Smart Memory (Personal Preferences)](#8-smart-memory)
9. [Voice Input & Read Aloud (Speech)](#9-voice-input--read-aloud)
10. [Prompt Library](#10-prompt-library)
11. [Chat Organization, Deep Search & Sharing](#11-chat-organization-deep-search--sharing)
12. [Settings & Activity Analytics](#12-settings--activity-analytics)
13. [How to Run the Project (Quick Start)](#13-how-to-run-the-project)

---

## 1. What is ZyroChat?

**ZyroChat** is more than just a basic chatbot. It is a **Unified AI Workspace** where you can:
- Chat with advanced AI models in real-time.
- Search the live internet for fresh, updated news and information.
- Upload documents (PDF, Word, TXT, CSV, Code) and ask questions about them.
- View and run live interactive web apps and code directly inside the app.
- Save your custom preferences and project instructions so the AI always remembers how you like to work.

---

## 2. Big Picture: How Everything Connects

Here is the simple data flow whenever you type a message:

```
[ User Types Message / Attaches File ]
                 │
                 ▼
[ ChatInput Component (Frontend) ]
                 │
        ┌────────┴────────┐
        │                 │
  (Search ON?)     (Files Attached?)
        │                 │
        ▼                 ▼
[ DuckDuckGo/Wiki ] [ Extract Text on Client ]
        │                 │
        └────────┬────────┘
                 │
                 ▼
[ smartAgent: Combines System Prompt + Mode + Memory + Project + Search + Files ]
                 │
                 ▼
[ Backend Proxy (http://localhost:5000) ]
                 │
                 ▼
[ OpenRouter AI Streaming API ]
                 │
                 ▼
[ Word-by-Word Smooth Streaming in ChatBox ]
                 │
                 ▼
[ Code Workspace / Citations / Read Aloud ]
```

---

## 3. The 6 AI Modes

In the top header of the chat, you will see a dropdown mode selector. You can switch modes anytime:

| Mode | What It Does (In Simple Words) | When to Use It |
| :--- | :--- | :--- |
| **Normal** | Balanced everyday assistant. Clear, friendly, and practical. | General questions, daily tasks, advice. |
| **Fast** | Gives very short, bullet-point answers with zero filler words. | When you are in a rush and just need quick facts. |
| **Deep Think** | Thinks step-by-step. Breaks down complex questions and considers edge cases. | Math problems, difficult logic, architecture planning. |
| **Creative** | Uses rich vocabulary, hooks, and storytelling style. | Brainstorming ideas, ad copy, blogs, stories. |
| **Coding** | Writes clean, production-ready code with complete syntax and explanations. | Writing code, fixing bugs, refactoring scripts. |
| **Research** | In-depth academic-style analysis with organized sections and facts. | Market research, science topics, detailed studies. |

---

## 4. Real Web Search & Citations

### What is it?
When you turn on web search, ZyroChat doesn't guess old information. It queries the live web.

### How it works step-by-step:
1. Click the **Globe icon** next to the input box so the badge says **`WEB SEARCH ON`**.
2. Type your question (e.g. *"What is the latest news about SpaceX?"*).
3. The frontend sends the query to the backend server at `http://localhost:5000/api/search`.
4. The backend searches DuckDuckGo and Wikipedia, extracts titles, snippets, and source links.
5. The AI reads these results and writes a response citing the exact sources using numbers like `[1]`, `[2]`.
6. Under the AI message, clickable **Source Cards** appear showing the article title and website URL.

---

## 5. File & Document Reading

### What is it?
You can upload any file, and ZyroChat will read the text inside it and answer your questions directly from that file.

### Supported files:
- PDF documents (`.pdf`)
- Word documents (`.docx`)
- Plain text (`.txt`, `.md`, `.rtf`)
- Data files (`.csv`, `.json`)
- Code files (`.js`, `.ts`, `.tsx`, `.py`, `.html`, `.css`, etc.)
- Images (`.png`, `.jpg`, `.jpeg`, `.webp`, `.svg`)

### How it works step-by-step:
1. Click the **Paperclip icon** or drag-and-drop your file into the chat box.
2. The browser automatically extracts all text and counts the total lines without sending private files to any third-party server.
3. A preview card appears with 4 **Quick Action Pills**:
   - **Summarize**: Quick summary of the document.
   - **Explain**: Explains the content in simple terms.
   - **Find errors**: Checks for bugs or mistakes.
   - **Extract key info**: Pulls out bullet points and important numbers.
4. Click any pill or type your own question!
5. ZyroChat's system instructions ensure the AI only uses the actual facts inside your file.

---

## 6. Interactive Side-by-Side Workspace Panel

### What is it?
Whenever the AI writes HTML, CSS, JavaScript, or React code, you don't have to copy it to another software to test it. ZyroChat has a built-in live playground.

### Features inside the panel:
- **Live Preview tab**: Runs your web app or widget live inside a secure sandbox with Tailwind CSS loaded.
- **Code Editor tab**: Displays the raw code with line numbers and allows you to edit it on the spot.
- **Document Preview tab**: Formats Markdown documents cleanly for reading.
- **Top Toolbar**:
  - 🔄 **Refresh**: Re-runs the live code.
  - 📋 **Copy**: Copies all code to your clipboard.
  - 💾 **Download**: Saves the file directly to your computer.
  - 🗖 **Maximize/Restore**: Expands the workspace to full width.
  - ✖ **Close**: Closes the side panel.

### How to trigger it:
- On any code block in the chat, click the **"Workspace"** button in the code header.

---

## 7. Projects & Custom Instructions

### What is it?
If you are working on a specific job (like "Website Redesign" or "YouTube Scriptwriting"), you can create a Project.

### How to use it:
1. In the sidebar, click the **Project Selector** (default says *"Default Workspace"*).
2. Click **"+ New Project..."**.
3. Type a Name (e.g. *"Python Flask API"*) and Custom Instructions (e.g. *"Always use Python 3.12 with type hints and pytest tests"*).
4. Click **Save Project**.
5. From now on, whenever this project is active, ZyroChat will automatically remember your instructions for every single message you send.

---

## 8. Smart Memory

### What is it?
Smart Memory lets ZyroChat remember your personal preferences permanently across all chats, so you don't have to repeat yourself.

### Examples of memories:
- *"I am a frontend developer who prefers TypeScript and Tailwind CSS."*
- *"Always format responses using concise bullet points."*
- *"Explain complex terms with simple real-world analogies."*

### How to manage it:
1. Click the **Settings icon (gear)** at the bottom of the sidebar.
2. Open the **Smart Memory** tab.
3. Add a new memory or delete old ones with one click.
4. You can also turn Smart Memory **ON** or **OFF** with the master toggle.

---

## 9. Voice Input & Read Aloud

### Voice Input (Speech-to-Text):
- Click the **Microphone icon** in the input bar.
- Speak naturally into your mic.
- A glowing green pulse will show *"Listening..."* while converting your voice to text.
- Click the microphone again or press Send to submit.

### Read Aloud (Text-to-Speech):
- Under any message from ZyroChat, click the **Speaker icon** (Listen).
- ZyroChat will speak the response out loud.
- Click it again to stop at any time.
- In **Settings -> Voice & Audio**, you can choose your favorite voice, adjust speed from 0.75x to 1.5x, or turn on **Auto Read-Aloud**.

---

## 10. Prompt Library

### What is it?
A collection of pre-tested, high-quality prompts to save you time.

### How to use it:
1. Click the **"Prompts"** button in the sidebar.
2. A modal opens in the center of the screen with 7 categories:
   - *Coding*
   - *Writing*
   - *Marketing*
   - *Business*
   - *Education*
   - *Research*
   - *Creative*
3. Search by keyword or category.
4. Click **"Use Prompt"**: It automatically closes the modal and pastes the template into your chat input bar.
5. You can also click **"+ New Prompt"** to save your own custom shortcuts.

---

## 11. Chat Organization, Deep Search & Sharing

### Time Grouping:
Conversations in the sidebar are automatically sorted into:
- 📌 **Pinned**: Your favorite chats pinned to the top.
- 📅 **Today**: Chats created or updated today.
- 📅 **Yesterday**: Chats from yesterday.
- 📅 **Previous 7 Days**: Chats from the past week.
- 📅 **Older**: Past archives.

### Deep Search:
Type in the search bar at the top of the sidebar. It doesn't just search conversation titles—it searches **inside the text of every message**.

### Sharing & Exporting:
1. Hover over any chat in the sidebar and click the **3-dots menu (...)**.
2. Click **"Share..."**.
3. A centered modal gives you options to:
   - 🔗 **Copy Link**: Creates a shareable link.
   - 📋 **Copy Markdown**: Copies the formatted transcript.
   - 📄 **Save as .md**: Downloads as a Markdown file.
   - 💾 **Download JSON**: Saves the full conversation session.

---

## 12. Settings & Activity Analytics

Open **Settings** from the bottom of the sidebar to access:
- **General**: Switch Theme (*Dark, Light, System*) and Layout Spacing (*Comfortable vs. Compact*).
- **AI Modes**: Set your default starting mode for new chats.
- **Smart Memory**: Manage your persistent preferences.
- **Voice & Audio**: Select voices, change speed, and test audio playback.
- **Usage & Data**:
  - View real statistics: Total conversations, total message turns, and estimated tokens used.
  - **Export JSON Backup**: Download a complete backup of all chats and memories.
  - **Import Backup**: Restore chats on any computer.
  - **Clear All Conversations**: Safely wipe local memory.
- **System & Health**:
  - Live server connection check (`http://localhost:5000/api/health`).
  - Web Search & MCP tool status indicators.
  - Zero-telemetry privacy guarantee (all data stays in your browser).

---

## 13. How to Run the Project

### Prerequisites:
- Node.js installed (v18 or higher recommended).

### 1. Start the Backend (port 5000):
```bash
npm run backend
```
*Starts the Express server with MCP tools and organic Web Search.*

### 2. Start the Frontend (port 5173):
Open a second terminal window and run:
```bash
npm run dev
```
*Starts Vite and opens the app at `http://localhost:5173`.*

### 3. Build for Production:
```bash
npm run build
```
*Compiles TypeScript and bundles Vite into the optimized `dist/` folder with zero errors.*

---

## Summary Cheat Sheet

| Action | Where to Find It |
| :--- | :--- |
| Start New Chat | Top of Sidebar (`+ New chat`) |
| Open Prompts | Top of Sidebar (`Prompts` button) |
| Change AI Mode | Top Header Dropdown (Default: `Normal`) |
| Toggle Web Search | Globe icon next to Chat Input |
| Attach File | Paperclip icon next to Chat Input |
| Voice Speak | Microphone icon in Chat Input |
| Read Aloud | Speaker icon under AI response |
| Open Code Playground | `Workspace` button on any code snippet |
| Switch Project | Project dropdown at top of Sidebar |
| Open Settings | Gear icon at bottom of Sidebar |
| Share or Export | 3-dots `...` on any sidebar conversation item |
