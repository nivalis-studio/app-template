# Gemini PDF / Document Understanding – Research Notes

## Vercel AI SDK (`@ai-sdk/google`)

The `@ai-sdk/google` provider has **native support for PDF file inputs** via the standard AI SDK file parts. Gemini models can process PDFs natively using vision, going beyond text extraction to understand layouts, charts, tables, images, and diagrams.

**Package:** `@ai-sdk/google`
**Env var:** `GOOGLE_GENERATIVE_AI_API_KEY`
**Install:** `pnpm add @ai-sdk/google ai`

---

## Code Examples

### PDF from Local File (Buffer)

```ts
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import fs from 'node:fs';

const result = await generateText({
  model: google('gemini-2.5-flash'),
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'What is an embedding model according to this document?',
        },
        {
          type: 'file',
          data: fs.readFileSync('./data/ai.pdf'),
          mediaType: 'application/pdf',
        },
      ],
    },
  ],
});

console.log(result.text);
```

### PDF from URL

```ts
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

const result = await generateText({
  model: google('gemini-2.5-flash'),
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Summarize this document',
        },
        {
          type: 'file',
          data: new URL('https://example.com/document.pdf'),
          mediaType: 'application/pdf',
        },
      ],
    },
  ],
});
```

> **Note:** The AI SDK will automatically download URLs and send them as inline data, except for `https://generativelanguage.googleapis.com/v1beta/files/` URLs (pre-uploaded via the Files API).

### With Structured Output (Extract Data from PDF)

```ts
import { google } from '@ai-sdk/google';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import fs from 'node:fs';

const result = await generateText({
  model: google('gemini-2.5-flash'),
  output: Output.object({
    schema: z.object({
      title: z.string(),
      author: z.string(),
      summary: z.string(),
      keyFindings: z.array(z.string()),
    }),
  }),
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Extract the title, author, summary, and key findings from this document.',
        },
        {
          type: 'file',
          data: fs.readFileSync('./paper.pdf'),
          mediaType: 'application/pdf',
        },
      ],
    },
  ],
});

console.log(result.output);
```

---

## Compatible Models

| Model | PDF/File Input | Notes |
|---|---|---|
| `gemini-2.5-flash` | ✅ | Recommended – fast, cheap |
| `gemini-2.5-pro` | ✅ | Most capable |
| `gemini-2.0-flash` | ✅ | Previous generation |
| `gemini-3-flash-preview` | ✅ | Latest (preview) |
| `gemini-3-pro-preview` | ✅ | Latest (preview) |

---

## Provider Options

```ts
import { google, type GoogleLanguageModelOptions } from '@ai-sdk/google';

const model = google('gemini-2.5-flash');

await generateText({
  model,
  providerOptions: {
    google: {
      // Media resolution for document processing
      mediaResolution: 'MEDIA_RESOLUTION_HIGH', // or LOW, MEDIUM
      // Safety settings
      safetySettings: [
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_NONE',
        },
      ],
      // Thinking config (Gemini 2.5 models)
      thinkingConfig: {
        thinkingBudget: 4096,
      },
    } satisfies GoogleLanguageModelOptions,
  },
  // ...
});
```

### Key Provider Options for Document Processing

- `mediaResolution` – Controls processing resolution: `MEDIA_RESOLUTION_LOW`, `MEDIA_RESOLUTION_MEDIUM`, `MEDIA_RESOLUTION_HIGH`
- `safetySettings` – Array of safety category/threshold pairs
- `thinkingConfig` – For reasoning models (Gemini 2.5/3)
- `structuredOutputs` – Enable/disable structured output mode (default: true)

---

## Google File Search Tool (RAG over Documents)

For indexed document retrieval (RAG), Gemini supports a **File Search** tool via `@ai-sdk/google`. This is different from direct PDF processing — it requires pre-indexed documents in a File Search Store.

```ts
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

const { text, sources } = await generateText({
  model: google('gemini-2.5-pro'),
  tools: {
    file_search: google.tools.fileSearch({
      fileSearchStoreNames: [
        'projects/my-project/locations/us/fileSearchStores/my-store',
      ],
      metadataFilter: 'author = "Robert Graves"',
      topK: 8,
    }),
  },
  prompt: "Summarise the key themes of 'I, Claudius'.",
});
```

> **Note:** File Search requires setting up a File Search Store in Google Cloud first.

---

## Technical Details (from Gemini API docs)

- **Max PDF size:** 50MB or 1000 pages
- **Token cost:** Each document page ≈ 258 tokens
- **Page resolution:** Larger pages scaled down to max 3072×3072, smaller pages scaled up to 768×768
- **Supported MIME types:** `application/pdf`, `text/plain`
- **Capabilities:** Transcribe content, summarize, extract structured data, analyze charts/tables/diagrams, answer questions

### Gemini 3 Models – Additional Features

- **Native text extraction:** Text embedded in PDFs is extracted and provided to the model
- **Per-part media resolution:** Can set `media_resolution` per individual media part
- **Billing:** Not charged for tokens from native PDF text; image-rendered pages counted under IMAGE modality

### Best Practices

- Rotate pages to correct orientation before uploading
- Avoid blurry pages
- For single-page docs, place text prompt after the page
- Put file-specific metadata in user message (not system message) to avoid errors

---

## Using Google Files API for Large Documents

For large PDFs (>20MB) or reusable documents, use the Google GenAI Files API directly:

```ts
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

// Upload a file
const file = await ai.files.upload({
  file: fileBlob, // Blob or path
  config: { displayName: 'my-document.pdf' },
});

// Wait for processing
let getFile = await ai.files.get({ name: file.name });
while (getFile.state === 'PROCESSING') {
  await new Promise(r => setTimeout(r, 5000));
  getFile = await ai.files.get({ name: file.name });
}

// Use the uploaded file URI with AI SDK
// The URI format: https://generativelanguage.googleapis.com/v1beta/files/...
// This URL is NOT auto-downloaded by AI SDK, it's passed as-is to Gemini
```

**Package for Files API:** `@google/genai` (separate from `@ai-sdk/google`)

---

## Sources

- https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai#file-inputs
- https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai#file-search
- https://ai.google.dev/gemini-api/docs/document-processing
- https://ai.google.dev/gemini-api/docs/files
- https://ai.google.dev/gemini-api/docs/file-search
- https://github.com/vercel/ai/issues/11430 (PDF in system message bug)
