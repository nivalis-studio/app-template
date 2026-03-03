/**
 * Gmail connector as an Effect service.
 *
 * Provides send, list, and get operations using the googleapis SDK.
 * All SDK types are wrapped in domain types to avoid SDK type leakage.
 *
 * Depends on the shared GoogleAuth service for OAuth2 client.
 *
 * @example
 * ```ts
 * import { GmailService, GmailLive, GoogleAuthLive } from "@nivalis/ai"
 *
 * const program = Effect.gen(function* () {
 *   const gmail = yield* GmailService
 *   const sent = yield* gmail.send("recipient@example.com", "Hello", "<p>Hi!</p>")
 *   console.log(sent.id)
 * })
 *
 * const runnable = Effect.provide(program, GmailLive.pipe(Layer.provide(GoogleAuthLive)))
 * ```
 */
import { Context, Data, Effect, Layer } from 'effect';
import { google } from 'googleapis';
import { GoogleAuth } from './google-auth.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default maximum number of messages returned by list. */
const DEFAULT_MAX_RESULTS = 20;

/** Regex patterns for base64url encoding (hoisted for performance). */
const PLUS_RE = /\+/g;
const SLASH_RE = /\//g;
const TRAILING_EQUALS_RE = /=+$/;

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

/**
 * Options for sending an email.
 */
export type SendEmailOptions = {
  /** CC recipients. */
  readonly cc?: ReadonlyArray<string>;
  /** BCC recipients. */
  readonly bcc?: ReadonlyArray<string>;
  /** Reply-To address. */
  readonly replyTo?: string;
};

/**
 * Domain type representing a successfully sent email.
 */
export type SentEmail = {
  /** The message ID assigned by Gmail. */
  readonly id: string;
  /** The thread ID the message belongs to. */
  readonly threadId: string;
  /** Labels applied to the message. */
  readonly labelIds: ReadonlyArray<string>;
};

/**
 * Domain type representing an email message.
 */
export type EmailMessage = {
  /** The message ID. */
  readonly id: string;
  /** The thread ID the message belongs to. */
  readonly threadId: string;
  /** Subject of the email. */
  readonly subject: string;
  /** Sender of the email. */
  readonly from: string;
  /** Recipients of the email. */
  readonly to: string;
  /** Date the email was sent/received. */
  readonly date: string;
  /** Short snippet/preview of the email body. */
  readonly snippet: string;
  /** Label IDs applied to the message. */
  readonly labelIds: ReadonlyArray<string>;
};

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

/**
 * Typed error for Gmail API failures.
 *
 * @example
 * ```ts
 * new GmailError({ message: "Failed to send email" })
 * ```
 */
export class GmailError extends Data.TaggedError('GmailError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

/**
 * Service interface for Gmail operations.
 */
export type GmailServiceShape = {
  /** Send an email. */
  readonly send: (
    to: string,
    subject: string,
    body: string,
    options?: SendEmailOptions,
  ) => Effect.Effect<SentEmail, GmailError>;

  /** List email messages matching a query. */
  readonly list: (
    query?: string,
    maxResults?: number,
  ) => Effect.Effect<ReadonlyArray<EmailMessage>, GmailError>;

  /** Get a single email message by ID. */
  readonly get: (messageId: string) => Effect.Effect<EmailMessage, GmailError>;
};

// ---------------------------------------------------------------------------
// Service tag
// ---------------------------------------------------------------------------

/**
 * Service tag for GmailService.
 *
 * @example
 * ```ts
 * import { GmailService } from "@nivalis/ai"
 *
 * const program = Effect.gen(function* () {
 *   const gmail = yield* GmailService
 *   const messages = yield* gmail.list("is:unread", 10)
 * })
 * ```
 */
export const GmailService =
  Context.GenericTag<GmailServiceShape>('GmailService');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a base64url-encoded RFC 2822 email from the given parameters.
 */
function makeRawEmail(
  to: string,
  subject: string,
  body: string,
  options?: SendEmailOptions,
): string {
  const headers: Array<string> = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/html; charset=utf-8',
  ];

  if (options?.cc && options.cc.length > 0) {
    headers.push(`Cc: ${options.cc.join(', ')}`);
  }

  if (options?.bcc && options.bcc.length > 0) {
    headers.push(`Bcc: ${options.bcc.join(', ')}`);
  }

  if (options?.replyTo) {
    headers.push(`Reply-To: ${options.replyTo}`);
  }

  const message = [...headers, '', body].join('\r\n');

  return Buffer.from(message)
    .toString('base64')
    .replace(PLUS_RE, '-')
    .replace(SLASH_RE, '_')
    .replace(TRAILING_EQUALS_RE, '');
}

/**
 * Extract a specific header value from a Gmail message payload.
 */
function getHeader(
  headers: ReadonlyArray<{ name?: string | null; value?: string | null }>,
  name: string,
): string {
  const header = headers.find(
    h => h.name?.toLowerCase() === name.toLowerCase(),
  );
  return header?.value ?? '';
}

/**
 * Map a raw Gmail API message to our domain EmailMessage.
 */
function toEmailMessage(msg: {
  id?: string | null;
  threadId?: string | null;
  snippet?: string | null;
  labelIds?: Array<string> | null;
  payload?: {
    headers?: Array<{ name?: string | null; value?: string | null }> | null;
  } | null;
}): EmailMessage {
  const headers = msg.payload?.headers ?? [];

  return {
    id: msg.id ?? '',
    threadId: msg.threadId ?? '',
    subject: getHeader(headers, 'Subject'),
    from: getHeader(headers, 'From'),
    to: getHeader(headers, 'To'),
    date: getHeader(headers, 'Date'),
    snippet: msg.snippet ?? '',
    labelIds: msg.labelIds ?? [],
  };
}

// ---------------------------------------------------------------------------
// Live layer
// ---------------------------------------------------------------------------

/**
 * Live layer for GmailService.
 *
 * Depends on GoogleAuth service for OAuth2 client.
 * The GoogleAuth layer must be provided separately.
 */
export const GmailLive = Layer.effect(
  GmailService,
  Effect.gen(function* () {
    const auth = yield* GoogleAuth;
    const { client } = yield* auth.getClient;

    const gmail = google.gmail({ version: 'v1', auth: client });

    return GmailService.of({
      send: (
        to: string,
        subject: string,
        body: string,
        options?: SendEmailOptions,
      ) =>
        Effect.tryPromise({
          try: async () => {
            const raw = makeRawEmail(to, subject, body, options);

            const res = await gmail.users.messages.send({
              userId: 'me',
              requestBody: { raw },
            });

            return {
              id: res.data.id ?? '',
              threadId: res.data.threadId ?? '',
              labelIds: (res.data.labelIds ?? []) as Array<string>,
            } satisfies SentEmail;
          },
          catch: error =>
            new GmailError({
              message:
                error instanceof Error ? error.message : 'Failed to send email',
              cause: error,
            }),
        }),

      list: (query?: string, maxResults?: number) =>
        Effect.tryPromise({
          try: async () => {
            const res = await gmail.users.messages.list({
              userId: 'me',
              q: query,
              maxResults: maxResults ?? DEFAULT_MAX_RESULTS,
            });

            const messageRefs = res.data.messages ?? [];

            // Fetch full details for each message
            const messages = await Promise.all(
              messageRefs.map(async ref => {
                const msg = await gmail.users.messages.get({
                  userId: 'me',
                  id: ref.id ?? '',
                  format: 'metadata',
                  metadataHeaders: ['Subject', 'From', 'To', 'Date'],
                });
                return toEmailMessage(msg.data);
              }),
            );

            return messages;
          },
          catch: error =>
            new GmailError({
              message:
                error instanceof Error
                  ? error.message
                  : 'Failed to list messages',
              cause: error,
            }),
        }),

      get: (messageId: string) =>
        Effect.tryPromise({
          try: async () => {
            const msg = await gmail.users.messages.get({
              userId: 'me',
              id: messageId,
              format: 'metadata',
              metadataHeaders: ['Subject', 'From', 'To', 'Date'],
            });

            return toEmailMessage(msg.data);
          },
          catch: error =>
            new GmailError({
              message:
                error instanceof Error
                  ? error.message
                  : 'Failed to get message',
              cause: error,
            }),
        }),
    });
  }),
);
