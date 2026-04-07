# 🚀 Quick Reference Guide - Weather Agent

## ⚡ 30-Second Setup

```bash
# 1. Install
npm install

# 2. Create .env
echo "VITE_OPENROUTER_API_KEY=your_key" >> .env
echo "VITE_WEATHER_API_KEY=your_key" >> .env
echo "VITE_NEWS_API_KEY=your_key" >> .env

# 3. Run
npm run dev

# 4. Open browser
# http://localhost:5173
```

## 📋 Essential Commands

```bash
npm run dev          # Start dev server
npm run build        # Create production build
npm run lint         # Check code quality
npm run preview      # Preview production build
```

## 🎯 File Quick Reference

| File                   | Purpose                                |
| ---------------------- | -------------------------------------- |
| `ChatBox.tsx`          | Main chat interface & message handling |
| `Sidebar.tsx`          | Chat list & management                 |
| `ChatInput.tsx`        | Text input with send/stop              |
| `MarkdownRenderer.tsx` | Code blocks & markdown                 |
| `smartAgent.ts`        | AI agent & streaming                   |
| `titleGenerator.ts`    | Auto-generate chat titles              |
| `chatStore.ts`         | localStorage persistence               |

## 🔧 Common Customizations

### Change Theme Colors

**File**: `Tailwind config or component classNames`

```tsx
// Change from blue-cyan to purple-pink
from-blue-500 → from-purple-500
to-cyan-500 → to-pink-500
```

### Change Streaming Speed

**File**: `src/agent/smartAgent.ts` line 85

```typescript
// Currently 5ms per character
await new Promise((r) => setTimeout(r, 5)); // Change this value
```

### Change AI Model

**File**: `src/agent/smartAgent.ts` line 120

```typescript
model: "openai/gpt-4o-mini"; // Change to different model
```

### Change Tool Prompt

**File**: `src/agent/SystemPrompt.ts`

```typescript
// Modify system prompt text here
```

## 🐛 Debugging Tips

### Enable Console Logging

```typescript
// Add to any function
console.log("Variable name:", variableName);
```

### Check API Response

```typescript
// In smartAgent.ts
const data = await res.json();
console.log("API Response:", data);
```

### Inspect localStorage

```javascript
// In browser console
localStorage.getItem("chats"); // View saved chats
localStorage.clear(); // Clear all data
```

### Check Component Props

```tsx
console.log("Props:", props); // Log props
```

## 📱 Responsive Breakpoints

- **xs, sm**: < 640px (Mobile)
- **md**: 640-1024px (Tablet)
- **lg, xl**: > 1024px (Desktop)

## 🎨 Color System

- **Primary**: Blue (#3b82f6)
- **Secondary**: Cyan (#06b6d4)
- **Background**: Slate-900 (#0f172a)
- **Text**: White / Gray-300
- **Success**: Green-500 (#10b981)
- **Danger**: Red-500 (#ef4444)

## 🔐 API Keys Needed

1. **OpenRouter** - AI responses

   - Get at: openrouter.ai
   - Format: `sk-or-v1-xxxxx`

2. **OpenWeatherMap** - Weather data

   - Get at: openweathermap.org
   - Format: alphanumeric key

3. **NewsAPI** - News headlines
   - Get at: newsapi.org
   - Format: alphanumeric key

## 📊 Data Structure

### Chat Object

```typescript
{
  title: string;        // Auto-generated or custom
  messages: Message[];  // Array of messages
}
```

### Message Object

```typescript
{
  role: "user" | "bot";
  text: string;
  loading?: boolean;    // Show spinner
  error?: boolean;      // Show error state
}
```

## 🚀 Deployment Quick Links

- **Vercel**: vercel.com (Recommended)
- **Netlify**: netlify.com
- **Railway**: railway.app
- **GitHub Pages**: github.com (free)

## 📈 Performance Targets

- Load time: < 3 seconds
- API response: < 500ms
- Streaming latency: < 100ms
- Scroll FPS: 60 FPS smooth
- Bundle size: < 300KB

## ✅ Pre-Deploy Checklist

- [ ] npm run build succeeds
- [ ] No console errors
- [ ] API keys configured
- [ ] Mobile view tested
- [ ] All tools working
- [ ] localStorage functioning
- [ ] Streaming smooth
- [ ] Sidebar menu works

## 🎓 Key Concepts

### Deep Copy (Prevents Message Leaking)

```typescript
// DON'T: Reference sharing
const newChat = [...chat];

// DO: Deep copy
const newChat = chat.map((msg) => ({ ...msg }));
```

### Streaming Pattern

```typescript
// Called for each chunk
onChunk(fullText); // Pass accumulated text
// Display updates in real-time
```

### Abort Signal (Clean Stop)

```typescript
// Check if user stopped
if (signal?.aborted) throw new Error("Aborted");
```

## 🔍 Troubleshooting Quick Fixes

| Issue                    | Fix                                |
| ------------------------ | ---------------------------------- |
| Build fails              | `npm install` then `npm run build` |
| API error 401            | Check API keys in .env             |
| No styling               | Clear cache: Ctrl+Shift+Delete     |
| localStorage not working | Check if not in private mode       |
| App doesn't load         | Check browser console for errors   |
| Slow streaming           | Check internet connection          |
| Copy button broken       | Check browser permissions          |

## 📞 Getting Help

1. **Read**: Check PRODUCTION_GUIDE.md
2. **Search**: Look in FEATURES.md
3. **Deploy**: See DEPLOYMENT.md
4. **Debug**: Use browser DevTools (F12)
5. **Logs**: Check browser console

## 🎯 Most Important Files

1. **ChatBox.tsx** - Most of the logic
2. **smartAgent.ts** - AI integration
3. **Sidebar.tsx** - Chat management
4. **chatStore.ts** - Data persistence

## ⏱️ Estimated Time Costs

- Deploy: 5-10 minutes
- Configure APIs: 10 minutes
- Test: 15 minutes
- Total: ~30 minutes to production

## 🎉 You're All Set!

Your weather agent is ready to deploy. Choose a hosting platform from Deployment.md and go live! 🚀

Questions? Check the documentation files or inspect the code comments.

Happy coding! 💻
