# Weather Agent - Production-Ready AI Chat System

A modern, responsive AI chat application with streaming responses, message editing, chat history management, and integrated tool calling (weather, news, calculations, and more).

## 🎯 System Overview

### Architecture

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS 4 with responsive design (mobile-first)
- **API**: OpenRouter (GPT-4o-mini) with streaming support
- **Backend**: Express.js for title generation
- **Storage**: localStorage for chat persistence
- **Components**: Modular, reusable React components

### Technology Stack

- **React 19.2** - UI framework with hooks
- **Vite 8** - Lightning-fast build tool
- **Tailwind CSS 4** - Utility-first CSS
- **TypeScript 5.9** - Type safety
- **Lucide React** - Icon library
- **React Markdown** - Markdown rendering
- **Prism.js** - Syntax highlighting

## ✨ Key Features

### 1. **Smart Chat System**

- Auto-generated chat titles using GPT API with local fallback
- Full chat history with localStorage persistence
- Message deep copying to prevent data leaking
- Automatic title generation for new chats

### 2. **Advanced Message Editing**

- Edit user messages and regenerate responses
- One-click regenerate for last bot response
- Delete individual messages
- Copy messages to clipboard

### 3. **Streaming Responses**

- Real-time character-by-character streaming
- Clean abort handling (no error on stop)
- Proper stream signal management
- Error recovery and retry logic

### 4. **Sidebar Chat Management**

- Three-dot context menu per chat
- Rename chats inline
- Copy full chat content
- Quick delete with confirmation
- ChatGPT-style dark theme

### 5. **Tool Integration**

- **Weather API**: Real-time weather data
- **DateTime**: Current date & time
- **Calculator**: Mathematical expressions
- **AQI**: Air quality index
- **News API**: Latest headlines
- **IP Location**: User location detection
- Auto-detection and routing to appropriate tool

### 6. **Responsive UI**

- Mobile-first design (xs, sm, md, lg, xl breakpoints)
- Hamburger menu on mobile
- Full desktop sidebar
- Adaptive text sizes and spacing
- Touch-friendly buttons

### 7. **Code Rendering**

- Syntax highlighting with Prism.js
- Multiple language support
- Copy button on hover (stable, non-blinking)
- Dark theme code blocks
- Language badge display

## 🚀 Setup & Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- API Keys:
  - OpenRouter API Key (for AI responses)
  - Weather API Key (OpenWeatherMap)
  - News API Key
  - (Optional) Backend running on port 5000

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
# Create .env file in root:
VITE_OPENROUTER_API_KEY=your_key_here
VITE_WEATHER_API_KEY=your_key_here
VITE_NEWS_API_KEY=your_key_here

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables

```env
# Required
VITE_OPENROUTER_API_KEY=your_openrouter_key
VITE_WEATHER_API_KEY=your_weather_api_key
VITE_NEWS_API_KEY=your_news_api_key

# Optional (if using title generation API)
VITE_BACKEND_URL=http://localhost:5000
```

## 📁 Project Structure

```
src/
├── components/
│   ├── ChatBox.tsx          # Main chat interface with message rendering
│   ├── ChatInput.tsx        # Text input with auto-resize
│   ├── Sidebar.tsx          # Chat list with context menu
│   ├── MarkdownRenderer.tsx # Markdown with code highlighting
│   ├── DeleteModal.tsx      # Delete confirmation
│   └── dropdown.tsx         # Dropdown component
├── agent/
│   ├── smartAgent.ts        # AI agent with tool calling
│   ├── SystemPrompt.ts      # System prompts for different modes
│   └── smartAgent copy.ts   # Backup versions
├── tools/
│   ├── weather.ts           # Weather API integration
│   ├── image.ts             # Image handling
│   └── aqi.ts               # Air quality integration
├── store/
│   └── chatStore.ts         # localStorage management
├── utils/
│   └── titleGenerator.ts    # Chat title generation
├── App.tsx                  # Root component
├── main.tsx                 # Entry point
├── index.css               # Global styles
└── App.css                 # App styles

backend/
├── index.js                # Express server
└── package.json            # Backend dependencies
```

## 🎨 Component Architecture

### ChatBox Component

**Purpose**: Main chat interface and message management

**Key Functions**:

- `handleSend()` - Process user input and stream response
- `handleEditMessage()` - Edit user messages
- `handleRegenerate()` - Regenerate last bot response
- `handleDeleteMessage()` - Remove messages
- `generateResponse()` - Call AI agent with streaming
- `handleStop()` - Abort generation cleanly

**Features**:

- Auto-scroll management with user scroll detection
- Message action buttons (Copy, Edit, Delete, Regenerate)
- Loading states with spinner
- Error handling with user feedback
- Deep chat copying for persistence

### Sidebar Component

**Purpose**: Chat list and navigation

**Key Functions**:

- `handleRenameChat()` - Rename chats inline
- `handleCopyChatContent()` - Copy all messages

**Features**:

- Context menu (three-dot) per chat
- Rename, copy, and delete options
- Active chat highlighting
- Responsive mobile drawer
- New chat button
- Empty state message

### smartAgent.ts

**Purpose**: AI response generation with tool calling

**Key Functions**:

- `runSmartAgentStream()` - Main agent entry point
- `streamText()` - Character-by-character streaming
- Tool handlers: `getWeather()`, `getDateTime()`, `calculate()`, `getAQI()`, `getNews()`, `getIPLocation()`

**Features**:

- Multi-turn conversation with chat history
- Automatic tool selection and calling
- Stream signal abort handling
- Fallback responses on error
- Error recovery

### MarkdownRenderer Component

**Purpose**: Render markdown with code highlighting

**Features**:

- Code block syntax highlighting (Prism.js)
- Copy button on hover (memoized, stable)
- Language badge on code blocks
- Heading hierarchy
- Lists and blockquotes
- Table support

## 🔧 Configuration

### OpenRouter API Configuration

- **Model**: `openai/gpt-4o-mini`
- **Temperature**: Default (configurable in prompts)
- **Max Tokens**: Default streaming
- **Tools**: 6 integrated tools with auto-routing

### Streaming Configuration

- **Character Delay**: 5ms per character (adjustable in `streamText()`)
- **Abort Signal**: Proper AbortController handling
- **Error Handling**: Graceful degradation on failure

### localStorage Schema

```javascript
// Stored as JSON array
[
  {
    title: "Chat Title",
    messages: [
      { role: "user", text: "...", loading?: boolean, error?: boolean },
      { role: "bot", text: "...", loading?: boolean, error?: boolean }
    ]
  }
]
```

## 🐛 Bug Fixes & Improvements

### Critical Fixes Implemented

1. **Message Leaking** - Fixed by deep copying all chat objects
2. **Copy Button Blinking** - Fixed by extracting component with React.memo
3. **Aggressive Auto-Scroll** - Fixed with user scroll detection and 300px threshold
4. **Clean Abort on Stop** - Proper AbortSignal handling without error display
5. **Streaming Error Handling** - Better error recovery and user feedback

### Known Limitations

- localStorage has ~5-10MB limit (suitable for MVP)
- No offline mode (requires online API)
- Chat history not encrypted
- No user authentication

## 🚚 Deployment

### Build Optimization

```bash
# Production build
npm run build

# Output in dist/
dist/
├── index.html
├── assets/
│   ├── index-[hash].css
│   └── index-[hash].js
└── ...
```

### Deployment Checklist

- [ ] Environment variables set
- [ ] API keys configured
- [ ] Backend server running (if using title API)
- [ ] CORS configured if needed
- [ ] Build tested with `npm run preview`
- [ ] localStorage cleared for fresh start
- [ ] Mobile responsive verified
- [ ] All tools tested (weather, news, etc.)

### Hosting Suggestions

- **Vercel** - Optimal for Vite projects
- **Netlify** - Great for React apps
- **AWS S3 + CloudFront** - Cost-effective
- **Railway** - Easy deployment

## 📊 Performance Tips

1. **Code Splitting** - Vite automatically handles dynamic imports
2. **Lazy Loading** - Components are imported on demand
3. **Image Optimization** - Use modern formats (WebP)
4. **Caching** - Set proper cache headers for assets
5. **Bundle Analysis** - Use `npm install -g vite-plugin-visualizer`

## 🔐 Security Considerations

1. **API Keys** - Never expose in client code
2. **CORS** - Configure properly for production
3. **Input Validation** - Sanitize all user inputs
4. **localStorage** - Don't store sensitive data
5. **XSS Protection** - React automatically escapes content
6. **Content Security Policy** - Set proper CSP headers

## 🧪 Testing

### Manual Testing Checklist

- [ ] Send various message types
- [ ] Test all tools (weather, calculate, news, etc.)
- [ ] Edit messages and regenerate
- [ ] Delete messages/chats
- [ ] Rename chats
- [ ] Check mobile responsiveness
- [ ] Test sidebar menu
- [ ] Verify copy buttons work
- [ ] Test stop button during generation
- [ ] Check localStorage persistence
- [ ] Reload page and verify chat history

### Common Issues

| Issue                 | Solution                                 |
| --------------------- | ---------------------------------------- |
| API not working       | Check API keys in .env                   |
| Streaming stops       | Verify AbortSignal handling              |
| Messages disappearing | Check localStorage quota                 |
| Slow responses        | Increase character delay in streamText() |
| Styling issues        | Clear browser cache                      |

## 📝 Environmental Setup Example

```bash
# .env file (never commit this)
VITE_OPENROUTER_API_KEY=sk-or-v1-xxxxx
VITE_WEATHER_API_KEY=xxxxx
VITE_NEWS_API_KEY=xxxxx
VITE_BACKEND_URL=http://localhost:5000
```

## 🎯 Future Enhancements

- [ ] User authentication & multi-user support
- [ ] Cloud database for chat persistence
- [ ] Voice input/output
- [ ] Image generation integration
- [ ] Custom AI model selection
- [ ] Chat export (PDF/Markdown)
- [ ] Code execution sandbox
- [ ] Plugin system for custom tools
- [ ] Dark/Light theme toggle
- [ ] Search chat history
- [ ] Prompt templates
- [ ] Collaborative chats

## 📞 Support

For issues or questions:

1. Check this README first
2. Review component JSDoc comments
3. Check browser console for errors
4. Verify API keys are set correctly
5. Test with different browsers

## 📄 License

MIT License - Feel free to use in personal or commercial projects

## 🙏 Credits

- OpenRouter API for AI responses
- OpenWeatherMap for weather data
- NewsAPI for news integration
- React and Vite communities
- Tailwind CSS team
- Lucide for beautiful icons
