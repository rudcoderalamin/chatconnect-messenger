# ChatConnect Messenger — Backend

Node.js + Express + Socket.IO + MongoDB + Redis backend for a WhatsApp-style
real-time messaging app. Phone/OTP authentication (no passwords), JWT access +
refresh tokens, one-to-one & group chat, presence, typing indicators, read
receipts, and WebRTC call signaling.

## Setup

```bash
npm install
cp .env.example .env   # then fill in real values
npm run dev             # requires nodemon (npm install -g nodemon), or:
npm start
```

Requires a running **MongoDB** and **Redis** instance (update `MONGO_URI` and
`REDIS_URL` in `.env`).

### Phone auth setup (Firebase — free)

OTP send + verify happens entirely on the **frontend** via Firebase Phone
Auth (no SMS cost or provider needed on the backend). The backend only
verifies the resulting Firebase ID token.

1. Create a free project at [Firebase Console](https://console.firebase.google.com)
2. **Build → Authentication → Sign-in method** → enable **Phone**
3. **Project Settings → Service Accounts** → Generate New Private Key →
   download the JSON → save it as `firebase-service-account.json` in this
   folder, and set `FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json`
   in `.env` (in production, paste the JSON into `FIREBASE_SERVICE_ACCOUNT_JSON`
   instead of using a file)
4. On the frontend, add a Web app under **Project Settings → General →
   Your apps**, copy the `firebaseConfig` object, and paste it into
   `frontend/index.html` where marked
5. **Authentication → Settings → Authorized domains** — add whatever domain
   you serve the frontend from (localhost works by default)

Firebase's free tier includes a phone-auth SMS quota that's enough for
development and small-scale use.

## Folder structure

```
src/
  config/       MongoDB + Redis connections
  models/       Mongoose schemas (User, Otp, Message, Group, Call, Notification)
  controllers/  Business logic per resource
  routes/       Express route definitions
  middleware/   Auth guard, rate limiting, error handling
  sockets/      Socket.IO auth + real-time event handlers
  app.js        Express app (middleware + routes)
  server.js     Entry point — boots HTTP server + Socket.IO
```

## REST API

### Auth (`/api/auth`) — no password, phone + Firebase OTP only
| Method | Route | Body | Notes |
|---|---|---|---|
| POST | `/verify-firebase-token` | `{ idToken, deviceId, platform, fcmToken }` | `idToken` comes from Firebase Phone Auth on the frontend after OTP is confirmed. Returns `accessToken`, `refreshToken`, `isNewUser`, `needsProfileSetup` |
| POST | `/refresh-token` | `{ refreshToken }` | Issues new access token |
| POST | `/logout` | `{ deviceId }` | Auth required — logs out current device |
| POST | `/logout-all` | — | Auth required — logs out all devices |

### Users (`/api/users`) — all require `Authorization: Bearer <accessToken>`
| Method | Route | Notes |
|---|---|---|
| GET | `/me` | Get own profile |
| PUT | `/me` | Update `name`, `about`, `photo` |
| DELETE | `/me` | Delete account |
| GET | `/lookup?phone=+8801xxxxxxxxx` | "New Chat" — check if a number is registered |
| PUT | `/privacy` | Toggle `hideLastSeen`, `hideOnline`, `hideProfilePhoto`, `hideAbout` |
| POST | `/block` / `/unblock` | `{ userId }` |

### Messages (`/api/messages`) — auth required
| Method | Route | Notes |
|---|---|---|
| GET | `/:userId?page=&limit=` | One-to-one chat history |
| GET | `/group/:groupId?page=&limit=` | Group chat history |
| GET | `/search?query=&chatWith=` | Search within a chat |
| PUT | `/:id/delete` | `{ forEveryone: bool }` |
| PUT | `/:id/star` / `/:id/pin` | Toggle |

### Groups (`/api/groups`) — auth required
Create, update, add/remove members, mute, leave, delete — admin-gated where
appropriate. See `groupController.js`.

### Calls (`/api/calls`) — auth required
Call history list + delete record. Live call signaling happens over sockets
(see below) — this REST resource is just the history log.

## Socket.IO events

Connect with `io(URL, { auth: { token: accessToken } })`.

**Emit (client → server):**
- `message:send` `{ receiverId | groupId, messageType, text, mediaUrl, ... }`
- `message:read` `{ messageIds, chatWith }`
- `typing:start` / `typing:stop` `{ chatWith | groupId }`
- `recording:start` / `recording:stop` `{ chatWith | groupId }`
- `group:join` / `group:leave` `(groupId)`
- `call:invite` `{ receiverId, callType, offer }`
- `call:accept` `{ callId, answer }`
- `call:reject` `{ callId }`
- `call:ice-candidate` `{ targetUserId, candidate }`
- `call:end` `{ callId, duration }`

**Listen (server → client):**
- `message:new`, `message:status`
- `typing:start`, `typing:stop`, `recording:start`, `recording:stop`
- `presence:update` `{ userId, online, lastSeen }`
- `call:incoming`, `call:accepted`, `call:rejected`, `call:ice-candidate`, `call:ended`

## What's stubbed / needs real credentials before production

- **Media storage (Cloudinary)** — env vars are present but no upload
  endpoint is wired yet. Add a `/api/media/upload` route using `multer` +
  the `cloudinary` SDK when you're ready for image/video/document/voice-note
  uploads.
- **Push notifications (FCM)** — device tokens are stored on the `User`
  model (`devices[].fcmToken`), but the actual FCM send call isn't
  implemented yet.
- **Two-step verification PIN** — schema field exists (`twoStepPin`,
  hashed), but the set/verify endpoints aren't built yet.
- **Admin panel** (dashboard, reports, blocked users, analytics) — not
  started; would be a separate set of admin-only routes + role field on
  `User`.

## Next steps

Once this is running, natural next pieces to build (in order of dependency):
1. Media upload endpoint (Cloudinary) — needed before image/video/voice chat works end-to-end
2. Frontend (React Native or Flutter) — connects to this API + sockets
3. Push notifications (FCM)
4. Admin panel
