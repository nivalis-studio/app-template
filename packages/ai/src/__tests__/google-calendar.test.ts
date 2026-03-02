import { Effect, Layer } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import { GoogleAuth, type GoogleAuthClient } from '../google-auth.js';
import {
  type CalendarEvent,
  GoogleCalendarError,
  GoogleCalendarLive,
  GoogleCalendarService,
} from '../google-calendar.js';

// ---------------------------------------------------------------------------
// Mock googleapis
// ---------------------------------------------------------------------------

const mockList = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock('googleapis', () => ({
  google: {
    calendar: () => ({
      events: {
        list: (...args: Array<unknown>) => mockList(...args),
        insert: (...args: Array<unknown>) => mockInsert(...args),
        update: (...args: Array<unknown>) => mockUpdate(...args),
        delete: (...args: Array<unknown>) => mockDelete(...args),
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

const TestLayer = GoogleCalendarLive.pipe(Layer.provide(MockGoogleAuth));

describe('GoogleCalendar service', () => {
  // -------------------------------------------------------------------------
  // listEvents
  // -------------------------------------------------------------------------

  it('lists events and returns CalendarEvent[]', async () => {
    mockList.mockResolvedValueOnce({
      data: {
        items: [
          {
            id: 'event-1',
            summary: 'Team Meeting',
            description: 'Discuss Q2 roadmap',
            location: 'Conference Room A',
            start: { dateTime: '2026-03-10T10:00:00Z' },
            end: { dateTime: '2026-03-10T11:00:00Z' },
            status: 'confirmed',
            htmlLink: 'https://calendar.google.com/event?eid=event-1',
            created: '2026-03-01T00:00:00Z',
            updated: '2026-03-01T00:00:00Z',
          },
          {
            id: 'event-2',
            summary: 'Lunch',
            description: undefined,
            location: undefined,
            start: { dateTime: '2026-03-10T12:00:00Z' },
            end: { dateTime: '2026-03-10T13:00:00Z' },
            status: 'confirmed',
            htmlLink: 'https://calendar.google.com/event?eid=event-2',
            created: '2026-03-01T00:00:00Z',
            updated: '2026-03-01T00:00:00Z',
          },
        ],
      },
    });

    const program = Effect.gen(function* () {
      const calendar = yield* GoogleCalendarService;
      return yield* calendar.listEvents('primary', {
        timeMin: '2026-03-10T00:00:00Z',
        timeMax: '2026-03-11T00:00:00Z',
      });
    });

    const result = await Effect.runPromise(Effect.provide(program, TestLayer));
    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe('event-1');
    expect(result[0]?.summary).toBe('Team Meeting');
    expect(result[0]?.description).toBe('Discuss Q2 roadmap');
    expect(result[0]?.location).toBe('Conference Room A');
    expect(result[1]?.id).toBe('event-2');
    expect(result[1]?.description).toBeUndefined();
  });

  it('returns empty array when no events found', async () => {
    mockList.mockResolvedValueOnce({
      data: {
        items: undefined,
      },
    });

    const program = Effect.gen(function* () {
      const calendar = yield* GoogleCalendarService;
      return yield* calendar.listEvents('primary', {
        timeMin: '2026-03-10T00:00:00Z',
        timeMax: '2026-03-11T00:00:00Z',
      });
    });

    const result = await Effect.runPromise(Effect.provide(program, TestLayer));
    expect(result).toEqual([]);
  });

  it('wraps listEvents API errors in GoogleCalendarError', async () => {
    mockList.mockRejectedValueOnce(new Error('Calendar not found'));

    const program = Effect.gen(function* () {
      const calendar = yield* GoogleCalendarService;
      return yield* calendar.listEvents('bad-id', {
        timeMin: '2026-03-10T00:00:00Z',
        timeMax: '2026-03-11T00:00:00Z',
      });
    }).pipe(
      Effect.catchTag('GoogleCalendarError', error =>
        Effect.succeed({ tag: error._tag, message: error.message }),
      ),
    );

    const result = await Effect.runPromise(Effect.provide(program, TestLayer));
    expect(result).toEqual({
      tag: 'GoogleCalendarError',
      message: 'Calendar not found',
    });
  });

  // -------------------------------------------------------------------------
  // createEvent
  // -------------------------------------------------------------------------

  it('creates an event and returns CalendarEvent', async () => {
    mockInsert.mockResolvedValueOnce({
      data: {
        id: 'new-event-1',
        summary: 'New Meeting',
        description: 'A new meeting',
        location: 'Room B',
        start: { dateTime: '2026-03-15T14:00:00Z' },
        end: { dateTime: '2026-03-15T15:00:00Z' },
        status: 'confirmed',
        htmlLink: 'https://calendar.google.com/event?eid=new-event-1',
        created: '2026-03-10T00:00:00Z',
        updated: '2026-03-10T00:00:00Z',
      },
    });

    const program = Effect.gen(function* () {
      const calendar = yield* GoogleCalendarService;
      return yield* calendar.createEvent('primary', {
        summary: 'New Meeting',
        description: 'A new meeting',
        location: 'Room B',
        start: { dateTime: '2026-03-15T14:00:00Z', timeZone: 'Europe/Paris' },
        end: { dateTime: '2026-03-15T15:00:00Z', timeZone: 'Europe/Paris' },
      });
    });

    const result = await Effect.runPromise(Effect.provide(program, TestLayer));
    expect(result.id).toBe('new-event-1');
    expect(result.summary).toBe('New Meeting');
    expect(result.location).toBe('Room B');
  });

  it('wraps createEvent API errors in GoogleCalendarError', async () => {
    mockInsert.mockRejectedValueOnce(new Error('Insufficient permissions'));

    const program = Effect.gen(function* () {
      const calendar = yield* GoogleCalendarService;
      return yield* calendar.createEvent('primary', {
        summary: 'Failing event',
        start: { dateTime: '2026-03-15T14:00:00Z' },
        end: { dateTime: '2026-03-15T15:00:00Z' },
      });
    });

    const exit = await Effect.runPromiseExit(
      Effect.provide(program, TestLayer),
    );
    expect(exit._tag).toBe('Failure');
  });

  // -------------------------------------------------------------------------
  // updateEvent
  // -------------------------------------------------------------------------

  it('updates an event and returns CalendarEvent', async () => {
    mockUpdate.mockResolvedValueOnce({
      data: {
        id: 'event-1',
        summary: 'Updated Meeting',
        description: 'Updated description',
        location: 'Room C',
        start: { dateTime: '2026-03-15T16:00:00Z' },
        end: { dateTime: '2026-03-15T17:00:00Z' },
        status: 'confirmed',
        htmlLink: 'https://calendar.google.com/event?eid=event-1',
        created: '2026-03-10T00:00:00Z',
        updated: '2026-03-12T00:00:00Z',
      },
    });

    const program = Effect.gen(function* () {
      const calendar = yield* GoogleCalendarService;
      return yield* calendar.updateEvent('primary', 'event-1', {
        summary: 'Updated Meeting',
        description: 'Updated description',
        location: 'Room C',
        start: { dateTime: '2026-03-15T16:00:00Z' },
        end: { dateTime: '2026-03-15T17:00:00Z' },
      });
    });

    const result = await Effect.runPromise(Effect.provide(program, TestLayer));
    expect(result.id).toBe('event-1');
    expect(result.summary).toBe('Updated Meeting');
    expect(result.location).toBe('Room C');
  });

  it('wraps updateEvent API errors in GoogleCalendarError', async () => {
    mockUpdate.mockRejectedValueOnce(new Error('Event not found'));

    const program = Effect.gen(function* () {
      const calendar = yield* GoogleCalendarService;
      return yield* calendar.updateEvent('primary', 'bad-event-id', {
        summary: 'Will fail',
      });
    }).pipe(
      Effect.catchTag('GoogleCalendarError', error =>
        Effect.succeed({ tag: error._tag, message: error.message }),
      ),
    );

    const result = await Effect.runPromise(Effect.provide(program, TestLayer));
    expect(result).toEqual({
      tag: 'GoogleCalendarError',
      message: 'Event not found',
    });
  });

  // -------------------------------------------------------------------------
  // deleteEvent
  // -------------------------------------------------------------------------

  it('deletes an event', async () => {
    mockDelete.mockResolvedValueOnce({ data: {} });

    const program = Effect.gen(function* () {
      const calendar = yield* GoogleCalendarService;
      return yield* calendar.deleteEvent('primary', 'event-1');
    });

    await Effect.runPromise(Effect.provide(program, TestLayer));

    expect(mockDelete).toHaveBeenCalledWith({
      calendarId: 'primary',
      eventId: 'event-1',
    });
  });

  it('wraps deleteEvent API errors in GoogleCalendarError', async () => {
    mockDelete.mockRejectedValueOnce(new Error('Cannot delete'));

    const program = Effect.gen(function* () {
      const calendar = yield* GoogleCalendarService;
      return yield* calendar.deleteEvent('primary', 'bad-event-id');
    });

    const exit = await Effect.runPromiseExit(
      Effect.provide(program, TestLayer),
    );
    expect(exit._tag).toBe('Failure');
  });

  // -------------------------------------------------------------------------
  // Error type
  // -------------------------------------------------------------------------

  it('GoogleCalendarError carries the correct _tag', () => {
    const error = new GoogleCalendarError({ message: 'Not found' });
    expect(error._tag).toBe('GoogleCalendarError');
    expect(error.message).toBe('Not found');
  });

  it('GoogleCalendarError supports optional cause', () => {
    const cause = new Error('network error');
    const error = new GoogleCalendarError({ message: 'API failed', cause });
    expect(error._tag).toBe('GoogleCalendarError');
    expect(error.cause).toBe(cause);
  });

  // -------------------------------------------------------------------------
  // GoogleAuth dependency
  // -------------------------------------------------------------------------

  it('GoogleCalendarLive depends on GoogleAuth', async () => {
    mockList.mockResolvedValueOnce({
      data: {
        items: [
          {
            id: 'event-1',
            summary: 'Test',
            start: { dateTime: '2026-03-10T10:00:00Z' },
            end: { dateTime: '2026-03-10T11:00:00Z' },
            status: 'confirmed',
            htmlLink: 'https://calendar.google.com/event?eid=event-1',
            created: '2026-03-01T00:00:00Z',
            updated: '2026-03-01T00:00:00Z',
          },
        ],
      },
    });

    const program = Effect.gen(function* () {
      const calendar = yield* GoogleCalendarService;
      return yield* calendar.listEvents('primary', {
        timeMin: '2026-03-10T00:00:00Z',
        timeMax: '2026-03-11T00:00:00Z',
      });
    });

    const result = await Effect.runPromise(Effect.provide(program, TestLayer));
    expect(result).toHaveLength(1);
    expect(result[0]?.summary).toBe('Test');
  });

  // -------------------------------------------------------------------------
  // Mock layer
  // -------------------------------------------------------------------------

  it('can be used with a mock implementation', async () => {
    const mockEvent: CalendarEvent = {
      id: 'mock-1',
      summary: 'Mock Event',
      start: '2026-03-10T10:00:00Z',
      end: '2026-03-10T11:00:00Z',
      status: 'confirmed',
      htmlLink: 'https://calendar.google.com/event?eid=mock-1',
    };

    const MockCalendar = Layer.succeed(GoogleCalendarService, {
      listEvents: () => Effect.succeed([mockEvent]),
      createEvent: () => Effect.succeed(mockEvent),
      updateEvent: () => Effect.succeed(mockEvent),
      deleteEvent: () => Effect.void,
    });

    const program = Effect.gen(function* () {
      const calendar = yield* GoogleCalendarService;
      return yield* calendar.listEvents('primary', {
        timeMin: '2026-03-10T00:00:00Z',
        timeMax: '2026-03-11T00:00:00Z',
      });
    });

    const result = await Effect.runPromise(
      Effect.provide(program, MockCalendar),
    );
    expect(result).toEqual([mockEvent]);
  });
});
