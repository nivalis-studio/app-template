import { openai } from '@ai-sdk/openai';
import { FirecrawlLive, FirecrawlService } from '@nivalis/ai';
import { makeRuntime } from '@nivalis/utils';
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from 'ai';
import { Config, Context, Data, Effect, Layer } from 'effect';
import { headers } from 'next/headers';
import { z } from 'zod';
import { auth } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Chat config — Effect service for OpenAI API key validation
// ---------------------------------------------------------------------------

class ChatConfigError extends Data.TaggedError('ChatConfigError')<{
  readonly message: string;
}> {}

type ChatConfigShape = {
  readonly openaiApiKey: string;
};

const ChatConfig = Context.GenericTag<ChatConfigShape>('ChatConfig');

const ChatConfigLive = Layer.effect(
  ChatConfig,
  Effect.gen(function* () {
    const openaiApiKey = yield* Config.string('OPENAI_API_KEY').pipe(
      Effect.mapError(
        () =>
          new ChatConfigError({
            message:
              'OpenAI API key is not configured. Please set the OPENAI_API_KEY environment variable.',
          }),
      ),
    );
    return { openaiApiKey };
  }),
);

/**
 * ManagedRuntime for the chat config check.
 * Uses globalValue (via makeRuntime) for Next.js hot-reload safety.
 */
const chatConfigRuntime = makeRuntime('chat-config', ChatConfigLive);

/**
 * Separate runtime for the Firecrawl tool.
 * This is optional — if FIRECRAWL_API_KEY is missing, the tool
 * will gracefully return an error message instead of crashing.
 */
const firecrawlRuntime = makeRuntime('chat-firecrawl', FirecrawlLive);

/** Maximum character length for scraped content returned to the LLM. */
const MAX_SCRAPED_CONTENT_LENGTH = 4000;

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export const POST = async (req: Request) => {
  // 1. Auth check — return 401 if unauthenticated
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Verify OpenAI API key via Effect ManagedRuntime
  const configExit = await chatConfigRuntime.runPromiseExit(ChatConfig);

  if (configExit._tag === 'Failure') {
    return new Response(
      JSON.stringify({
        error:
          'OpenAI API key is not configured. Please set the OPENAI_API_KEY environment variable.',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  // 3. Parse request body and convert UI messages to model messages
  const { messages: uiMessages } = (await req.json()) as {
    messages: Array<UIMessage>;
  };
  const messages = await convertToModelMessages(uiMessages);

  // 4. Stream response with AI SDK — token-by-token streaming
  //    The scrapeWebPage tool demonstrates end-to-end Effect usage by
  //    running the Firecrawl connector from @nivalis/ai through the
  //    Effect ManagedRuntime.
  const result = streamText({
    model: openai('gpt-4o-mini'),
    stopWhen: stepCountIs(2),
    system:
      'You are a helpful AI assistant. You can help users with general questions and also scrape web pages for information when needed. Be concise and helpful.',
    messages,
    tools: {
      scrapeWebPage: tool({
        description:
          'Scrape a web page and return its content. Use this when the user asks to fetch, read, or analyze content from a URL.',
        inputSchema: z.object({
          url: z.string().url().describe('The URL of the web page to scrape'),
        }),
        execute: async ({ url }) => {
          const scrapeExit = await firecrawlRuntime.runPromiseExit(
            Effect.gen(function* () {
              const firecrawl = yield* FirecrawlService;
              return yield* firecrawl.scrape(url);
            }),
          );

          if (scrapeExit._tag === 'Failure') {
            return {
              error:
                'Web scraping is not available. The FIRECRAWL_API_KEY may not be configured.',
            };
          }

          const page = scrapeExit.value;
          return {
            url: page.url,
            content:
              page.markdown?.slice(0, MAX_SCRAPED_CONTENT_LENGTH) ??
              'No content could be extracted',
          };
        },
      }),
    },
    onError({ error }) {
      console.error('[chat] Stream error:', error);
    },
  });

  return result.toUIMessageStreamResponse();
};
