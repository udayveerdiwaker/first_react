# Image Generation Flow

This document explains how image generation works in ZyroChat and where each part of the feature lives.

## Goal

Allow the user to type a normal chat request such as:

```text
Generate an image of a futuristic city at sunset
```

ZyroChat should detect that an image is needed, call the local image tool, and show the generated image directly inside the chat.

## Current Implementation

The app already has a simple image URL generator:

```ts
// src/tools/image.ts
export function generateImage(prompt: string) {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
    prompt
  )}`;
  return url;
}
```

The feature is connected to the chat agent through a local tool named `generateImage`.

## User Flow

1. User enters an image request in the chat input.
2. `ChatBox.tsx` sends the message to `runSmartAgentStream`.
3. `smartAgent.ts` asks the model whether a tool is needed.
4. The model selects the `generateImage` tool when the prompt asks for an image.
5. `toolRegistry.ts` runs `generateImage(prompt)`.
6. The tool returns Markdown containing the generated image URL.
7. `MarkdownRenderer.tsx` renders the Markdown image inside the bot message.
8. The generated image is saved as part of the chat history because it is stored in the bot message text.

## Files Involved

| File | Purpose |
| --- | --- |
| `src/tools/image.ts` | Builds the generated image URL from the user prompt. |
| `src/agent/toolRegistry.ts` | Registers `generateImage` as a local tool available to the AI model. |
| `src/agent/smartAgent.ts` | Decides whether to call tools and streams the tool result back to the UI. |
| `src/components/MarkdownRenderer.tsx` | Displays the returned Markdown image in the chat. |
| `src/components/ChatBox.tsx` | Handles user input, streaming state, and saving the final bot message. |

## Tool Definition

The image tool is exposed to the model like this:

```ts
{
  name: "generateImage",
  description:
    "Generate an image from a text prompt and return it as Markdown so it appears in the chat",
  parameters: {
    type: "object",
    properties: {
      prompt: { type: "string" },
    },
    required: ["prompt"],
  },
}
```

## Tool Output

The tool returns Markdown:

```md
Generated image for: "futuristic city at sunset"

![Generated image: futuristic city at sunset](https://image.pollinations.ai/prompt/futuristic%20city%20at%20sunset)

[Open full image](https://image.pollinations.ai/prompt/futuristic%20city%20at%20sunset)
```

Because bot messages already use `MarkdownRenderer`, the image appears without needing a separate image component in `ChatBox.tsx`.

## Recommended Next Improvements

1. Add a direct image button in `ChatInput.tsx` for users who do not want to type "generate an image".
2. Add prompt options such as style, aspect ratio, seed, and quality.
3. Move image generation to the backend if you use a paid provider that needs a secret API key.
4. Store generated image metadata separately if you want a gallery, download history, or regeneration by seed.
5. Add an error fallback image state if the remote image provider is unavailable.

## Backend Provider Flow

If you later switch from Pollinations to OpenAI, Stability, Replicate, or another paid provider, use this safer flow:

1. User sends an image prompt from the frontend.
2. Frontend calls a backend endpoint such as `POST /api/images/generate`.
3. Backend validates the prompt and uses the provider API key from `.env`.
4. Provider returns an image URL or base64 image data.
5. Backend returns a public image URL or saved asset URL to the frontend.
6. Frontend renders the URL through Markdown or a dedicated image message component.

Do not put paid provider API keys in frontend code.
