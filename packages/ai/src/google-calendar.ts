/**
 * Google Calendar connector as an Effect service.
 *
 * Provides listEvents, createEvent, updateEvent, and deleteEvent operations
 * using the googleapis SDK. All SDK types are wrapped in domain types to avoid
 * SDK type leakage.
 *
 * Depends on the shared GoogleAuth service for OAuth2 client.
 *
 * @example
 * ```ts
 * import { GoogleCalendarService, GoogleCalendarLive, GoogleAuthLive } from "@nivalis/ai"
 *
 * const program = Effect.gen(function* () {
 *   const calendar = yield* GoogleCalendarService
 *   const events = yield* calendar.listEvents("primary", {
 *     timeMin: "2026-03-10T00:00:00Z",
 *     timeMax: "2026-03-11T00:00:00Z",
 *   })
 *   console.log(events)
 * })
 *
 * const runnable = Effect.provide(program, GoogleCalendarLive.pipe(Layer.provide(GoogleAuthLive)))
 * ```
 */
import { Context, Data, Effect, Layer } from 'effect';
import { google } from 'googleapis';
import { GoogleAuth } from './google-auth.ts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default maximum number of events returned by listEvents. */
const DEFAULT_MAX_RESULTS = 250;

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

/**
 * Time range for listing calendar events.
 */
export type TimeRange = {
  /** Lower bound (inclusive) for an event's end time. RFC 3339 timestamp. */
  readonly timeMin: string;
  /** Upper bound (exclusive) for an event's start time. RFC 3339 timestamp. */
  readonly timeMax: string;
  /** Maximum number of events to return. */
  readonly maxResults?: number;
};

/**
 * Date/time information for a calendar event.
 */
export type EventDateTime = {
  /** Combined date-time value (RFC 3339). */
  readonly dateTime?: string;
  /** The date, in the format "yyyy-mm-dd", if this is an all-day event. */
  readonly date?: string;
  /** The time zone (e.g. "Europe/Paris"). */
  readonly timeZone?: string;
};

/**
 * Input for creating or updating a calendar event.
 */
export type EventInput = {
  /** Title of the event. */
  readonly summary?: string;
  /** Description of the event. */
  readonly description?: string;
  /** Geographic location of the event. */
  readonly location?: string;
  /** The start time of the event. */
  readonly start?: EventDateTime;
  /** The end time of the event. */
  readonly end?: EventDateTime;
  /** List of attendee email addresses. */
  readonly attendees?: ReadonlyArray<{ readonly email: string }>;
};

/**
 * Domain type representing a Google Calendar event.
 */
export type CalendarEvent = {
  /** Opaque identifier of the event. */
  readonly id: string;
  /** Title of the event. */
  readonly summary: string;
  /** Description of the event. */
  readonly description?: string;
  /** Geographic location of the event. */
  readonly location?: string;
  /** The start time as an ISO date-time string. */
  readonly start: string;
  /** The end time as an ISO date-time string. */
  readonly end: string;
  /** Status of the event (confirmed, tentative, cancelled). */
  readonly status: string;
  /** URL link to the event in Google Calendar. */
  readonly htmlLink: string;
  /** Creation time of the event. */
  readonly created?: string;
  /** Last modification time of the event. */
  readonly updated?: string;
};

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

/**
 * Typed error for Google Calendar API failures.
 *
 * @example
 * ```ts
 * new GoogleCalendarError({ message: "Event not found" })
 * ```
 */
export class GoogleCalendarError extends Data.TaggedError(
  'GoogleCalendarError',
)<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

/**
 * Service interface for Google Calendar operations.
 */
export type GoogleCalendarServiceShape = {
  /** List events within a time range. */
  readonly listEvents: (
    calendarId: string,
    timeRange: TimeRange,
  ) => Effect.Effect<ReadonlyArray<CalendarEvent>, GoogleCalendarError>;

  /** Create a new event on the calendar. */
  readonly createEvent: (
    calendarId: string,
    event: EventInput,
  ) => Effect.Effect<CalendarEvent, GoogleCalendarError>;

  /** Update an existing event on the calendar. */
  readonly updateEvent: (
    calendarId: string,
    eventId: string,
    event: EventInput,
  ) => Effect.Effect<CalendarEvent, GoogleCalendarError>;

  /** Delete an event from the calendar. */
  readonly deleteEvent: (
    calendarId: string,
    eventId: string,
  ) => Effect.Effect<void, GoogleCalendarError>;
};

// ---------------------------------------------------------------------------
// Service tag
// ---------------------------------------------------------------------------

/**
 * Service tag for GoogleCalendarService.
 *
 * @example
 * ```ts
 * import { GoogleCalendarService } from "@nivalis/ai"
 *
 * const program = Effect.gen(function* () {
 *   const calendar = yield* GoogleCalendarService
 *   const events = yield* calendar.listEvents("primary", {
 *     timeMin: "2026-03-10T00:00:00Z",
 *     timeMax: "2026-03-11T00:00:00Z",
 *   })
 * })
 * ```
 */
export const GoogleCalendarService =
  Context.GenericTag<GoogleCalendarServiceShape>('GoogleCalendarService');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map a raw Google Calendar API event item to our domain CalendarEvent.
 */
function toCalendarEvent(item: {
  id?: string | null;
  summary?: string | null;
  description?: string | null;
  location?: string | null;
  start?: { dateTime?: string | null; date?: string | null } | null;
  end?: { dateTime?: string | null; date?: string | null } | null;
  status?: string | null;
  htmlLink?: string | null;
  created?: string | null;
  updated?: string | null;
}): CalendarEvent {
  return {
    id: item.id ?? '',
    summary: item.summary ?? '',
    description: item.description ?? undefined,
    location: item.location ?? undefined,
    start: item.start?.dateTime ?? item.start?.date ?? '',
    end: item.end?.dateTime ?? item.end?.date ?? '',
    status: item.status ?? 'confirmed',
    htmlLink: item.htmlLink ?? '',
    created: item.created ?? undefined,
    updated: item.updated ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Live layer
// ---------------------------------------------------------------------------

/**
 * Live layer for GoogleCalendarService.
 *
 * Depends on GoogleAuth service for OAuth2 client.
 * The GoogleAuth layer must be provided separately.
 */
export const GoogleCalendarLive = Layer.effect(
  GoogleCalendarService,
  Effect.gen(function* () {
    const auth = yield* GoogleAuth;
    const { client } = yield* auth.getClient;

    const calendar = google.calendar({ version: 'v3', auth: client });

    return GoogleCalendarService.of({
      listEvents: (calendarId: string, timeRange: TimeRange) =>
        Effect.tryPromise({
          try: async () => {
            const res = await calendar.events.list({
              calendarId,
              timeMin: timeRange.timeMin,
              timeMax: timeRange.timeMax,
              maxResults: timeRange.maxResults ?? DEFAULT_MAX_RESULTS,
              singleEvents: true,
              orderBy: 'startTime',
            });

            const items = res.data.items ?? [];
            return items.map(toCalendarEvent);
          },
          catch: error =>
            new GoogleCalendarError({
              message:
                error instanceof Error
                  ? error.message
                  : 'Failed to list events',
              cause: error,
            }),
        }),

      createEvent: (calendarId: string, event: EventInput) =>
        Effect.tryPromise({
          try: async () => {
            const res = await calendar.events.insert({
              calendarId,
              requestBody: {
                summary: event.summary,
                description: event.description,
                location: event.location,
                start: event.start
                  ? {
                      dateTime: event.start.dateTime,
                      date: event.start.date,
                      timeZone: event.start.timeZone,
                    }
                  : undefined,
                end: event.end
                  ? {
                      dateTime: event.end.dateTime,
                      date: event.end.date,
                      timeZone: event.end.timeZone,
                    }
                  : undefined,
                attendees: event.attendees?.map(a => ({ email: a.email })),
              },
            });

            return toCalendarEvent(res.data);
          },
          catch: error =>
            new GoogleCalendarError({
              message:
                error instanceof Error
                  ? error.message
                  : 'Failed to create event',
              cause: error,
            }),
        }),

      updateEvent: (calendarId: string, eventId: string, event: EventInput) =>
        Effect.tryPromise({
          try: async () => {
            const res = await calendar.events.update({
              calendarId,
              eventId,
              requestBody: {
                summary: event.summary,
                description: event.description,
                location: event.location,
                start: event.start
                  ? {
                      dateTime: event.start.dateTime,
                      date: event.start.date,
                      timeZone: event.start.timeZone,
                    }
                  : undefined,
                end: event.end
                  ? {
                      dateTime: event.end.dateTime,
                      date: event.end.date,
                      timeZone: event.end.timeZone,
                    }
                  : undefined,
                attendees: event.attendees?.map(a => ({ email: a.email })),
              },
            });

            return toCalendarEvent(res.data);
          },
          catch: error =>
            new GoogleCalendarError({
              message:
                error instanceof Error
                  ? error.message
                  : 'Failed to update event',
              cause: error,
            }),
        }),

      deleteEvent: (calendarId: string, eventId: string) =>
        Effect.tryPromise({
          try: async () => {
            await calendar.events.delete({
              calendarId,
              eventId,
            });
          },
          catch: error =>
            new GoogleCalendarError({
              message:
                error instanceof Error
                  ? error.message
                  : 'Failed to delete event',
              cause: error,
            }),
        }),
    });
  }),
);
