# Google APIs Technical Reference (Sheets, Calendar, Gmail) + Email Alternatives

> Research compiled 2026-03-02 for Next.js monorepo integration.

---

## 1. Package Options

### Option A: Monolithic `googleapis` (recommended for multi-API projects)

```bash
pnpm add googleapis
```

- **npm**: <https://www.npmjs.com/package/googleapis>
- **GitHub**: <https://github.com/googleapis/google-api-nodejs-client>
- Single package covers **all** Google APIs (Sheets v4, Calendar v3, Gmail v1, Drive v3, etc.)
- Includes `google.auth` helpers for OAuth2 + JWT/service-account auth
- In maintenance mode (critical fixes only, no new features) — still actively used and reliable
- Built-in TypeScript declarations

### Option B: Individual `@googleapis/*` packages (tree-shake friendly)

```bash
pnpm add @googleapis/sheets @googleapis/calendar @googleapis/gmail
```

| Package | Latest | Weekly Downloads |
|---------|--------|-----------------|
| `@googleapis/sheets` | 13.0.1 | ~444K |
| `@googleapis/calendar` | 14.2.0 | ~212K |
| `@googleapis/gmail` | 12.0.0 | — |

- Smaller bundle; import only what you need
- Same API surface as the monolithic package

### Auth Library (used by both options)

```bash
pnpm add google-auth-library
```

- **npm**: <https://www.npmjs.com/package/google-auth-library>
- Standalone auth — `OAuth2Client`, `JWT`, `UserRefreshClient`
- Already a transitive dependency of `googleapis`

**Recommendation**: Use the monolithic `googleapis` for convenience when you need ≥2 APIs. The individual packages are better if bundle size matters (e.g., edge functions).

---

## 2. Google Cloud Console Setup

1. Go to <https://console.cloud.google.com/>
2. **Create a project** (or select existing)
3. **Enable APIs**:
   - Google Sheets API
   - Google Calendar API
   - Gmail API
4. **OAuth consent screen** → configure app name, support email, scopes
5. **Credentials** → create either:
   - **OAuth 2.0 Client ID** (for user-delegated access)
   - **Service Account** (for server-to-server / no user interaction)

---

## 3. Authentication Patterns

### Pattern A: OAuth 2.0 (User-Delegated Access)

Best for: accessing a specific user's Sheets/Calendar/Gmail on their behalf.

```ts
import { google } from "googleapis";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI // e.g. "http://localhost:3000/api/auth/callback/google"
);

// Step 1: Generate auth URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline", // gets refresh_token
  scope: [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
  ],
  prompt: "consent", // force consent to always get refresh_token
});

// Step 2: Exchange code for tokens (in your callback route)
const { tokens } = await oauth2Client.getToken(code);
oauth2Client.setCredentials(tokens);
// tokens = { access_token, refresh_token, expiry_date, ... }

// Step 3: Use the authenticated client
const sheets = google.sheets({ version: "v4", auth: oauth2Client });
const calendar = google.calendar({ version: "v3", auth: oauth2Client });
const gmail = google.gmail({ version: "v1", auth: oauth2Client });
```

#### Refresh Token Handling

```ts
oauth2Client.setCredentials({
  refresh_token: storedRefreshToken,
});
// The client auto-refreshes access_token when expired.
// Listen for new tokens:
oauth2Client.on("tokens", (tokens) => {
  if (tokens.refresh_token) {
    // Store the new refresh_token (rotation)
  }
});
```

#### With NextAuth.js (Auth.js v5)

```ts
// auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.send",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      // Auto-refresh logic here (see Auth.js refresh-token-rotation guide)
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
});
```

### Pattern B: Service Account (JWT / Server-to-Server)

Best for: accessing org-owned resources without user interaction (e.g., a shared Google Sheet used as a CMS/database).

```ts
import { google } from "googleapis";

// Option 1: From JSON key file
const auth = new google.auth.GoogleAuth({
  keyFile: "./service-account-key.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// Option 2: From env vars (better for deployment)
const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });
```

> **Important**: Service accounts cannot access Gmail (email sending) unless using Google Workspace domain-wide delegation. For email sending, prefer OAuth2 or use Resend/Nodemailer.

> **Important**: For Calendar, the service account's email must be added as an attendee/editor to the calendar.

> **Important**: For Sheets, the sheet must be shared with the service account email (`xxx@project.iam.gserviceaccount.com`).

---

## 4. Key API Methods

### 4.1 Google Sheets (v4)

```ts
const sheets = google.sheets({ version: "v4", auth });
const spreadsheetId = process.env.GOOGLE_SHEET_ID;
```

#### Read values

```ts
const res = await sheets.spreadsheets.values.get({
  spreadsheetId,
  range: "Sheet1!A1:D10",
});
const rows = res.data.values; // string[][]
```

#### Write / Update values

```ts
await sheets.spreadsheets.values.update({
  spreadsheetId,
  range: "Sheet1!A1",
  valueInputOption: "USER_ENTERED", // or "RAW"
  requestBody: {
    values: [
      ["Name", "Email", "Date"],
      ["Alice", "alice@example.com", "2026-03-01"],
    ],
  },
});
```

#### Append rows

```ts
await sheets.spreadsheets.values.append({
  spreadsheetId,
  range: "Sheet1!A:D",
  valueInputOption: "USER_ENTERED",
  requestBody: {
    values: [["Bob", "bob@example.com", "2026-03-02"]],
  },
});
```

#### Batch read / write

```ts
// Batch get
const res = await sheets.spreadsheets.values.batchGet({
  spreadsheetId,
  ranges: ["Sheet1!A1:B5", "Sheet2!A1:C3"],
});

// Batch update
await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId,
  requestBody: {
    valueInputOption: "USER_ENTERED",
    data: [
      { range: "Sheet1!A1", values: [["Updated"]] },
      { range: "Sheet2!B2", values: [["Also Updated"]] },
    ],
  },
});
```

#### Scopes

| Scope | Access |
|-------|--------|
| `spreadsheets.readonly` | Read only |
| `spreadsheets` | Read + write |

### 4.2 Google Calendar (v3)

```ts
const calendar = google.calendar({ version: "v3", auth });
```

#### List events

```ts
const res = await calendar.events.list({
  calendarId: "primary",
  timeMin: new Date().toISOString(),
  maxResults: 10,
  singleEvents: true,
  orderBy: "startTime",
});
const events = res.data.items; // calendar_v3.Schema$Event[]
```

#### Create event

```ts
const event = await calendar.events.insert({
  calendarId: "primary",
  requestBody: {
    summary: "Team Meeting",
    description: "Discuss Q2 roadmap",
    location: "Conference Room A",
    start: {
      dateTime: "2026-03-10T10:00:00",
      timeZone: "Europe/Paris",
    },
    end: {
      dateTime: "2026-03-10T11:00:00",
      timeZone: "Europe/Paris",
    },
    attendees: [
      { email: "alice@example.com" },
      { email: "bob@example.com" },
    ],
    reminders: {
      useDefault: false,
      overrides: [{ method: "email", minutes: 30 }],
    },
  },
});
console.log("Created event:", event.data.htmlLink);
```

#### Update event

```ts
await calendar.events.update({
  calendarId: "primary",
  eventId: "existing-event-id",
  requestBody: {
    summary: "Updated Meeting Title",
    start: { dateTime: "2026-03-10T11:00:00", timeZone: "Europe/Paris" },
    end: { dateTime: "2026-03-10T12:00:00", timeZone: "Europe/Paris" },
  },
});
```

#### Delete event

```ts
await calendar.events.delete({
  calendarId: "primary",
  eventId: "existing-event-id",
});
```

#### Scopes

| Scope | Access |
|-------|--------|
| `calendar.readonly` | Read only |
| `calendar` | Full read/write |
| `calendar.events` | Events only (read/write) |
| `calendar.events.readonly` | Events only (read) |

### 4.3 Gmail (v1)

```ts
const gmail = google.gmail({ version: "v1", auth });
```

#### List messages

```ts
const res = await gmail.users.messages.list({
  userId: "me",
  maxResults: 10,
  q: "is:unread", // Gmail search query syntax
});
const messageIds = res.data.messages; // { id, threadId }[]
```

#### Get a message

```ts
const msg = await gmail.users.messages.get({
  userId: "me",
  id: messageId,
  format: "full", // or "metadata", "minimal", "raw"
});
// msg.data.payload.headers → From, To, Subject, Date
// msg.data.snippet → preview text
```

#### Send an email

```ts
function makeRawEmail(to: string, from: string, subject: string, body: string) {
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/html; charset=utf-8`,
    "",
    body,
  ].join("\r\n");

  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

await gmail.users.messages.send({
  userId: "me",
  requestBody: {
    raw: makeRawEmail(
      "recipient@example.com",
      "sender@example.com",
      "Hello from the app",
      "<h1>Hi!</h1><p>This is a test email.</p>"
    ),
  },
});
```

#### Scopes

| Scope | Access |
|-------|--------|
| `gmail.readonly` | Read messages and settings |
| `gmail.send` | Send emails only |
| `gmail.modify` | Read, send, delete, manage labels |
| `gmail.compose` | Create/send/drafts |
| `gmail.metadata` | Read metadata (headers) only |

---

## 5. Email Alternatives (Simpler Than Gmail API)

### 5.1 Resend (Recommended for transactional email)

```bash
pnpm add resend
```

- **Website**: <https://resend.com>
- **npm**: <https://www.npmjs.com/package/resend>
- API-first, no SMTP config needed
- React Email integration for JSX-based templates
- Free tier: 100 emails/day, 3,000/month
- Paid: $20/month for 50,000 emails

```ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: "App <noreply@yourdomain.com>",
  to: ["user@example.com"],
  subject: "Welcome!",
  html: "<h1>Welcome to our app!</h1>",
  // OR use React Email:
  // react: <WelcomeEmail name="Alice" />,
});
```

#### With React Email templates

```bash
pnpm add @react-email/components react-email
```

```tsx
// emails/welcome.tsx
import { Html, Head, Body, Container, Heading, Text, Button } from "@react-email/components";

export function WelcomeEmail({ name }: { name: string }) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "sans-serif" }}>
        <Container>
          <Heading>Welcome, {name}!</Heading>
          <Text>Thanks for signing up.</Text>
          <Button href="https://yourapp.com/dashboard">Go to Dashboard</Button>
        </Container>
      </Body>
    </Html>
  );
}
```

```ts
// Server action or API route
import { WelcomeEmail } from "@/emails/welcome";

await resend.emails.send({
  from: "App <noreply@yourdomain.com>",
  to: ["user@example.com"],
  subject: "Welcome!",
  react: WelcomeEmail({ name: "Alice" }),
});
```

### 5.2 Nodemailer (Self-managed SMTP)

```bash
pnpm add nodemailer
pnpm add -D @types/nodemailer
```

- **npm**: <https://www.npmjs.com/package/nodemailer>
- Requires SMTP server config (Gmail SMTP, SendGrid, Mailgun, AWS SES, etc.)
- Full control over transport, headers, attachments
- No external service dependency (if you have your own SMTP)

```ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,     // e.g. "smtp.gmail.com"
  port: Number(process.env.SMTP_PORT), // 587
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,   // app-specific password for Gmail
  },
});

await transporter.sendMail({
  from: '"App" <noreply@yourdomain.com>',
  to: "user@example.com",
  subject: "Hello",
  html: "<h1>Hello World</h1>",
});
```

### Comparison

| Feature | Gmail API | Resend | Nodemailer |
|---------|-----------|--------|------------|
| Setup complexity | High (OAuth) | Low (API key) | Medium (SMTP) |
| Read inbox | ✅ | ❌ | ❌ |
| Send email | ✅ | ✅ | ✅ |
| React templates | ❌ | ✅ | ❌ (HTML only) |
| Free tier | Gmail quotas | 100/day | Depends on SMTP |
| Best for | Full Gmail integration | Transactional email | Custom SMTP setups |

**Recommendation**: Use **Resend** for transactional/notification emails (simple, reliable, great DX). Use **Gmail API** only when you need to read a user's inbox or send as that user.

---

## 6. Environment Variables

```env
# --- Google OAuth 2.0 (user-delegated) ---
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google

# --- Google Service Account (server-to-server) ---
GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@project-id.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# --- Specific resource IDs ---
GOOGLE_SHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
GOOGLE_CALENDAR_ID=primary

# --- NextAuth.js ---
NEXTAUTH_SECRET=your-random-secret
NEXTAUTH_URL=http://localhost:3000

# --- Resend ---
RESEND_API_KEY=re_xxxx

# --- Nodemailer / SMTP ---
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
```

---

## 7. OAuth Scopes Quick Reference

```
# Sheets
https://www.googleapis.com/auth/spreadsheets
https://www.googleapis.com/auth/spreadsheets.readonly

# Calendar
https://www.googleapis.com/auth/calendar
https://www.googleapis.com/auth/calendar.readonly
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/calendar.events.readonly

# Gmail
https://www.googleapis.com/auth/gmail.send
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.modify
https://www.googleapis.com/auth/gmail.compose
https://www.googleapis.com/auth/gmail.metadata
```

---

## 8. Key Sources

- googleapis npm: <https://www.npmjs.com/package/googleapis>
- google-auth-library npm: <https://www.npmjs.com/package/google-auth-library>
- GitHub repo: <https://github.com/googleapis/google-api-nodejs-client>
- Sheets API reference: <https://developers.google.com/sheets/api/reference/rest>
- Calendar API reference: <https://developers.google.com/calendar/api/v3/reference>
- Gmail API reference: <https://developers.google.com/gmail/api/reference/rest>
- Auth.js refresh token rotation: <https://authjs.dev/guides/refresh-token-rotation>
- Resend docs: <https://resend.com/docs>
- React Email: <https://react.email>
- Nodemailer docs: <https://nodemailer.com>
