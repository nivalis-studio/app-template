# Mistral OCR – Research Notes

## Two Approaches

There are **two distinct approaches** for using Mistral OCR:

### Approach A: Vercel AI SDK (`@ai-sdk/mistral`) – Document OCR via Chat Models

The Vercel AI SDK `@ai-sdk/mistral` provider supports **Document OCR** natively via Mistral's chat models (e.g. `mistral-small-latest`, `pixtral-large-latest`). This is NOT the dedicated OCR API — it uses the chat completion endpoint with file/image attachments and the model performs document understanding.

**Package:** `@ai-sdk/mistral`
**Env var:** `MISTRAL_API_KEY`
**Install:** `pnpm add @ai-sdk/mistral ai`

#### Code Example (PDF via URL)

```ts
import { mistral, type MistralLanguageModelOptions } from '@ai-sdk/mistral';
import { generateText } from 'ai';

const result = await generateText({
  model: mistral('mistral-small-latest'),
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
          data: new URL(
            'https://example.com/document.pdf',
          ),
          mediaType: 'application/pdf',
        },
      ],
    },
  ],
  // optional settings:
  providerOptions: {
    mistral: {
      documentImageLimit: 8,
      documentPageLimit: 64,
    } satisfies MistralLanguageModelOptions,
  },
});

console.log(result.text);
```

#### Code Example (PDF from local file / Buffer)

```ts
import { mistral } from '@ai-sdk/mistral';
import { generateText } from 'ai';
import fs from 'node:fs';

const result = await generateText({
  model: mistral('mistral-small-latest'),
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Extract all text from this document.',
        },
        {
          type: 'file',
          data: fs.readFileSync('./document.pdf'),
          mediaType: 'application/pdf',
        },
      ],
    },
  ],
});
```

#### Provider Options for Document OCR

- `documentImageLimit` (number) – Max images to process in a document
- `documentPageLimit` (number) – Max pages to process in a document
- `safePrompt` (boolean) – Safety prompt injection

#### Compatible Models for Vision/Document OCR

| Model | Image Input |
|---|---|
| `pixtral-large-latest` | ✅ |
| `mistral-small-latest` | ✅ |
| `pixtral-12b-2409` | ✅ |

---

### Approach B: Mistral Native OCR API (`@mistralai/mistralai`) – Dedicated OCR Endpoint

Mistral also has a **dedicated OCR endpoint** (`POST /v1/ocr`) using the `mistral-ocr-latest` model. This is a specialized OCR processor that returns structured markdown output with metadata. **This is NOT supported through Vercel AI SDK** — you must use the Mistral native client.

**Package:** `@mistralai/mistralai`
**Env var:** `MISTRAL_API_KEY`
**Install:** `pnpm add @mistralai/mistralai`

#### Code Example (Dedicated OCR API)

```ts
import { Mistral } from '@mistralai/mistralai';

const client = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY,
});

// Process a PDF from URL
const ocrResponse = await client.ocr.process({
  model: 'mistral-ocr-latest',
  document: {
    type: 'document_url',
    documentUrl: 'https://arxiv.org/pdf/2201.04234',
  },
  includeImageBase64: true,
});

console.log(ocrResponse);
// Returns structured markdown with page-level results
```

#### OCR API Request Options

- `model` – `"mistral-ocr-latest"` (or future versions)
- `document` – Object with `type` and content:
  - `{ type: "document_url", documentUrl: "..." }` – Process a PDF from URL
  - `{ type: "image_url", imageUrl: "..." }` – Process a single image
  - `{ type: "base64", data: "...", mimeType: "..." }` – Process base64 encoded content
- `includeImageBase64` (boolean) – Include base64 images in response
- `pages` – Specify which pages to process
- `image_limit` – Max images to extract
- `extract_header` / `extract_footer` – Include headers/footers

#### OCR API Output Format

Returns structured results per page:
```json
{
  "pages": [
    {
      "index": 0,
      "markdown": "# Document Title\n\nContent...",
      "images": [...],
      "dimensions": { "width": 612, "height": 792 }
    }
  ],
  "model": "mistral-ocr-latest",
  "usage": { "pages": 1, "doc_size_bytes": 12345 }
}
```

---

## Key Differences

| Feature | Vercel AI SDK (`@ai-sdk/mistral`) | Mistral Native OCR (`@mistralai/mistralai`) |
|---|---|---|
| Endpoint | Chat completions | `/v1/ocr` |
| Model | `mistral-small-latest`, `pixtral-large-latest` | `mistral-ocr-latest` |
| Output | Natural language response | Structured markdown per page |
| Image extraction | No | Yes (with `includeImageBase64`) |
| Table extraction | Via model interpretation | Structured markdown tables |
| Page-level results | No | Yes |
| Integration | Standard AI SDK patterns | Separate client library |

## Recommendation

- Use **Vercel AI SDK approach** when you want to ask questions about PDF content, summarize, or extract specific information with natural language.
- Use **Mistral Native OCR** when you need raw text extraction, structured markdown output, page-level processing, or image extraction from documents.

## Sources

- https://ai-sdk.dev/providers/ai-sdk-providers/mistral#document-ocr
- https://docs.mistral.ai/api/endpoint/ocr
- https://docs.mistral.ai/capabilities/document_ai/basic_ocr/
- https://mistral.ai/news/mistral-ocr
- https://github.com/vercel/ai/discussions/5397 (confirms dedicated OCR model not in Vercel AI SDK)
