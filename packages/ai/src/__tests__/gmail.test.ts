import { Effect, Layer } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import {
  type EmailMessage,
  GmailError,
  GmailLive,
  GmailService,
  type SentEmail,
} from '../gmail.js';
import { GoogleAuth, type GoogleAuthClient } from '../google-auth.js';

// ---------------------------------------------------------------------------
// Mock googleapis
// ---------------------------------------------------------------------------

const mockSend = vi.fn();
const mockList = vi.fn();
const mockGet = vi.fn();

vi.mock('googleapis', () => ({
  google: {
    gmail: () => ({
      users: {
        messages: {
          send: (...args: Array<unknown>) => mockSend(...args),
          list: (...args: Array<unknown>) => mockList(...args),
          get: (...args: Array<unknown>) => mockGet(...args),
        },
      },
    }),
    auth: {
      OAuth2: class MockOAuth2 {
        credentials = {};
        setCredentials(creds: Record<string, unknown>) {
          this.credentials = creds;
        }
      },
    },
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A mock GoogleAuth layer that provides a fake auth client. */
const mockClient = {
  credentials: { refresh_token: 'mock-token' },
} as GoogleAuthClient['client'];

const MockGoogleAuth = Layer.succeed(GoogleAuth, {
  getClient: Effect.succeed({ client: mockClient }),
});

const TestLayer = GmailLive.pipe(Layer.provide(MockGoogleAuth));

describe('Gmail service', () => {
  // -------------------------------------------------------------------------
  // send
  // -------------------------------------------------------------------------

  it('sends an email and returns SentEmail', async () => {
    mockSend.mockResolvedValueOnce({
      data: {
        id: 'msg-001',
        threadId: 'thread-001',
        labelIds: ['SENT'],
      },
    });

    const program = Effect.gen(function* () {
      const gmail = yield* GmailService;
      return yield* gmail.send(
        'recipient@example.com',
        'Test Subject',
        '<p>Hello!</p>',
      );
    });

    const result = await Effect.runPromise(Effect.provide(program, TestLayer));
    expect(result.id).toBe('msg-001');
    expect(result.threadId).toBe('thread-001');
    expect(result.labelIds).toEqual(['SENT']);

    // Verify the send was called with raw email
    expect(mockSend).toHaveBeenCalledWith({
      userId: 'me',
      requestBody: { raw: expect.any(String) },
    });
  });

  it('sends an email with CC, BCC, and replyTo options', async () => {
    mockSend.mockResolvedValueOnce({
      data: {
        id: 'msg-002',
        threadId: 'thread-002',
        labelIds: ['SENT'],
      },
    });

    const program = Effect.gen(function* () {
      const gmail = yield* GmailService;
      return yield* gmail.send(
        'recipient@example.com',
        'With Options',
        '<p>Test</p>',
        {
          cc: ['cc@example.com'],
          bcc: ['bcc@example.com'],
          replyTo: 'reply@example.com',
        },
      );
    });

    const result = await Effect.runPromise(Effect.provide(program, TestLayer));
    expect(result.id).toBe('msg-002');
  });

  it('wraps send API errors in GmailError', async () => {
    mockSend.mockRejectedValueOnce(new Error('Quota exceeded'));

    const program = Effect.gen(function* () {
      const gmail = yield* GmailService;
      return yield* gmail.send('recipient@example.com', 'Fail', '<p>Fail</p>');
    }).pipe(
      Effect.catchTag('GmailError', error =>
        Effect.succeed({ tag: error._tag, message: error.message }),
      ),
    );

    const result = await Effect.runPromise(Effect.provide(program, TestLayer));
    expect(result).toEqual({
      tag: 'GmailError',
      message: 'Quota exceeded',
    });
  });

  // -------------------------------------------------------------------------
  // list
  // -------------------------------------------------------------------------

  it('lists messages and returns EmailMessage[]', async () => {
    mockList.mockResolvedValueOnce({
      data: {
        messages: [
          { id: 'msg-001', threadId: 'thread-001' },
          { id: 'msg-002', threadId: 'thread-002' },
        ],
      },
    });

    mockGet
      .mockResolvedValueOnce({
        data: {
          id: 'msg-001',
          threadId: 'thread-001',
          snippet: 'Hello there',
          labelIds: ['INBOX', 'UNREAD'],
          payload: {
            headers: [
              { name: 'Subject', value: 'First message' },
              { name: 'From', value: 'alice@example.com' },
              { name: 'To', value: 'me@example.com' },
              { name: 'Date', value: 'Mon, 2 Mar 2026 10:00:00 +0000' },
            ],
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          id: 'msg-002',
          threadId: 'thread-002',
          snippet: 'Meeting tomorrow',
          labelIds: ['INBOX'],
          payload: {
            headers: [
              { name: 'Subject', value: 'Second message' },
              { name: 'From', value: 'bob@example.com' },
              { name: 'To', value: 'me@example.com' },
              { name: 'Date', value: 'Mon, 2 Mar 2026 11:00:00 +0000' },
            ],
          },
        },
      });

    const program = Effect.gen(function* () {
      const gmail = yield* GmailService;
      return yield* gmail.list('is:unread', 10);
    });

    const result = await Effect.runPromise(Effect.provide(program, TestLayer));
    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe('msg-001');
    expect(result[0]?.subject).toBe('First message');
    expect(result[0]?.from).toBe('alice@example.com');
    expect(result[0]?.snippet).toBe('Hello there');
    expect(result[1]?.id).toBe('msg-002');
    expect(result[1]?.subject).toBe('Second message');
  });

  it('returns empty array when no messages found', async () => {
    mockList.mockResolvedValueOnce({
      data: {
        messages: undefined,
      },
    });

    const program = Effect.gen(function* () {
      const gmail = yield* GmailService;
      return yield* gmail.list();
    });

    const result = await Effect.runPromise(Effect.provide(program, TestLayer));
    expect(result).toEqual([]);
  });

  it('wraps list API errors in GmailError', async () => {
    mockList.mockRejectedValueOnce(new Error('Invalid query'));

    const program = Effect.gen(function* () {
      const gmail = yield* GmailService;
      return yield* gmail.list('bad:query');
    }).pipe(
      Effect.catchTag('GmailError', error =>
        Effect.succeed({ tag: error._tag, message: error.message }),
      ),
    );

    const result = await Effect.runPromise(Effect.provide(program, TestLayer));
    expect(result).toEqual({
      tag: 'GmailError',
      message: 'Invalid query',
    });
  });

  // -------------------------------------------------------------------------
  // get
  // -------------------------------------------------------------------------

  it('gets a single message by ID', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        id: 'msg-001',
        threadId: 'thread-001',
        snippet: 'Hello there',
        labelIds: ['INBOX', 'UNREAD'],
        payload: {
          headers: [
            { name: 'Subject', value: 'Test message' },
            { name: 'From', value: 'sender@example.com' },
            { name: 'To', value: 'me@example.com' },
            { name: 'Date', value: 'Mon, 2 Mar 2026 10:00:00 +0000' },
          ],
        },
      },
    });

    const program = Effect.gen(function* () {
      const gmail = yield* GmailService;
      return yield* gmail.get('msg-001');
    });

    const result = await Effect.runPromise(Effect.provide(program, TestLayer));
    expect(result.id).toBe('msg-001');
    expect(result.threadId).toBe('thread-001');
    expect(result.subject).toBe('Test message');
    expect(result.from).toBe('sender@example.com');
    expect(result.to).toBe('me@example.com');
    expect(result.date).toBe('Mon, 2 Mar 2026 10:00:00 +0000');
    expect(result.snippet).toBe('Hello there');
    expect(result.labelIds).toEqual(['INBOX', 'UNREAD']);
  });

  it('wraps get API errors in GmailError', async () => {
    mockGet.mockRejectedValueOnce(new Error('Message not found'));

    const program = Effect.gen(function* () {
      const gmail = yield* GmailService;
      return yield* gmail.get('bad-id');
    }).pipe(
      Effect.catchTag('GmailError', error =>
        Effect.succeed({ tag: error._tag, message: error.message }),
      ),
    );

    const result = await Effect.runPromise(Effect.provide(program, TestLayer));
    expect(result).toEqual({
      tag: 'GmailError',
      message: 'Message not found',
    });
  });

  // -------------------------------------------------------------------------
  // Error type
  // -------------------------------------------------------------------------

  it('GmailError carries the correct _tag', () => {
    const error = new GmailError({ message: 'Not found' });
    expect(error._tag).toBe('GmailError');
    expect(error.message).toBe('Not found');
  });

  it('GmailError supports optional cause', () => {
    const cause = new Error('network error');
    const error = new GmailError({ message: 'API failed', cause });
    expect(error._tag).toBe('GmailError');
    expect(error.cause).toBe(cause);
  });

  // -------------------------------------------------------------------------
  // GoogleAuth dependency
  // -------------------------------------------------------------------------

  it('GmailLive depends on GoogleAuth', async () => {
    mockList.mockResolvedValueOnce({
      data: {
        messages: [{ id: 'msg-001', threadId: 'thread-001' }],
      },
    });

    mockGet.mockResolvedValueOnce({
      data: {
        id: 'msg-001',
        threadId: 'thread-001',
        snippet: 'Test',
        labelIds: ['INBOX'],
        payload: {
          headers: [
            { name: 'Subject', value: 'Test' },
            { name: 'From', value: 'test@example.com' },
            { name: 'To', value: 'me@example.com' },
            { name: 'Date', value: 'Mon, 2 Mar 2026 10:00:00 +0000' },
          ],
        },
      },
    });

    const program = Effect.gen(function* () {
      const gmail = yield* GmailService;
      return yield* gmail.list();
    });

    const result = await Effect.runPromise(Effect.provide(program, TestLayer));
    expect(result).toHaveLength(1);
    expect(result[0]?.subject).toBe('Test');
  });

  // -------------------------------------------------------------------------
  // Mock layer
  // -------------------------------------------------------------------------

  it('can be used with a mock implementation', async () => {
    const mockMessage: EmailMessage = {
      id: 'mock-1',
      threadId: 'thread-mock',
      subject: 'Mock Message',
      from: 'mock@example.com',
      to: 'me@example.com',
      date: '2026-03-02',
      snippet: 'Mock snippet',
      labelIds: ['INBOX'],
    };

    const mockSent: SentEmail = {
      id: 'sent-1',
      threadId: 'thread-sent',
      labelIds: ['SENT'],
    };

    const MockGmail = Layer.succeed(GmailService, {
      send: () => Effect.succeed(mockSent),
      list: () => Effect.succeed([mockMessage]),
      get: () => Effect.succeed(mockMessage),
    });

    const program = Effect.gen(function* () {
      const gmail = yield* GmailService;
      return yield* gmail.list();
    });

    const result = await Effect.runPromise(Effect.provide(program, MockGmail));
    expect(result).toEqual([mockMessage]);
  });
});
