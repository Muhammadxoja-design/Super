# TaskBotFergana

Telegram Mini App for task management and user registration.

## Tech Stack
- **Frontend**: React, Vite, TailwindCSS, shadcn/ui
- **Backend**: Node.js, Express
- **Database**: SQLite (using `better-sqlite3` and `drizzle-orm`)
- **Bot**: Telegraf

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Migration & Seeding
The database is file-based (`data/taskbotfergana.sqlite`).
Schema is managed by Drizzle ORM.

To push schema changes:
```bash
npx drizzle-kit push --config=drizzle.config.sqlite.ts
```

To seed the database (initial admin user):
- Provide `ADMIN_SEED_LOGIN` and `ADMIN_SEED_PASSWORD` in your `.env` file.
- The server will create the admin account on first startup.

### 3. Environment Variables
Create a `.env` file based on `.env.example`:

```
BOT_TOKEN=your_telegram_bot_token
NODE_ENV=development
WEBAPP_URL=https://your-app-url.render.com
WEBHOOK_URL=https://your-app-url.render.com
WEBHOOK_PATH=/tg/webhook
PORT=5000
ADMIN_TG_IDS=123456789,987654321
ADMIN_TELEGRAM_IDS=123456789,987654321
SESSION_SECRET=change_me_please
ADMIN_SEED_LOGIN=admin
ADMIN_SEED_PASSWORD=change_me_password
SQLITE_PATH=data/taskbotfergana.sqlite
```

**Production required env list (Render):**
- `BOT_TOKEN`
- `NODE_ENV=production`
- `WEBHOOK_URL` (required in production)
- `WEBHOOK_PATH` (optional, default `/tg/webhook`)
- `PORT`
- `DATABASE_URL` or `SQLITE_PATH`
- `SESSION_SECRET`
- `ADMIN_TELEGRAM_IDS`

### 4. Running Development
```bash
npm run dev
```
This starts both frontend (Vite) and backend (Express) on port 5000.

### 5. Telegram Bot & Mini App Setup
1. Open [@BotFather](https://t.me/BotFather) on Telegram.
2. Create a new bot (`/newbot`) and get the `BOT_TOKEN`.
3. Enable Mini App:
   - `/newapp` -> Select your bot.
   - Enter title and description.
   - For Web App URL, use your Render URL (e.g., `https://your-app.onrender.com`).
4. Set the Menu Button (optional but recommended):
   - `/setmenubutton` -> Select your bot -> provide the URL.
5. Webhook URL format:
   - `https://<render-domain>` + `WEBHOOK_PATH` (default: `/tg/webhook`)

### 6. Render Deploy (quick guide)
1. Create a new Web Service.
2. Set build command: `npm install && npm run build`.
3. Set start command: `npm run start`.
4. Add the environment variables from `.env.example`.
5. Ensure the service uses port `5000` (Render detects `PORT`).
6. Set `WEBHOOK_URL` to your Render domain (format: `https://<render-domain>` without a trailing slash).
7. Set `WEBHOOK_PATH` (default: `/tg/webhook`) and ensure the full webhook URL is `WEBHOOK_URL + WEBHOOK_PATH`.
8. Keep scaling at **1 instance** to avoid Telegram webhook conflicts.
9. Health check endpoint: `GET /health` should return 200 with `status`, `uptimeSeconds`, and `timestamp`.

### 7. Manual Happy-Path Checks
- **Telegram Login**: Open the bot, click "Web App ochish", verify auto-login.
- **Task Assignment**: Admin creates task in WebApp or /newtask in bot, assigns to a user, user receives notification.
- **Status Update**: User updates status (accepted/in_progress/done) and admin receives notification.
- **Local polling**: `NODE_ENV=development` + no `WEBHOOK_URL`, bot uses polling.
- **Prod webhook**: `NODE_ENV=production` + `WEBHOOK_URL` (+ `WEBHOOK_PATH`), bot uses webhook.
- **409 Conflict**: Ensure only webhook or polling is active.

## Testing / Verification Checklist

### A) Health check (Render)
- [ ] App ishga tushgach `GET /health` 200 qaytarsin.
- [ ] Response JSON'da `status`, `uptimeSeconds`, `timestamp` bo'lsin.
- [ ] Render logs'da health endpoint 5xx bermasin.

### B) Telegram 409 Conflict yo'qligini tekshirish
Goal: `TelegramError: 409 Conflict` qaytmasin.

#### B1) Local dev (Polling mode)
Preconditions:
- `NODE_ENV=development`
- `WEBHOOK_URL` yo'q (unset)

Steps:
- [ ] Server/bot start qiling.
- [ ] Log'da "Polling mode enabled" (yoki shunga o'xshash) chiqsin.
- [ ] Botga `/start` yuboring - javob kelishi kerak.
- [ ] 2-marta parallel start qilmang (ikkita terminalda). Agar qilsangiz 409 chiqishi normal.
Expected:
- [ ] 409 yo'q, bot ishlaydi.

#### B2) Production (Webhook mode)
Preconditions:
- `NODE_ENV=production`
- `WEBHOOK_URL=https://<render-domain>`
- `WEBHOOK_PATH=/tg/webhook` (yoki sizning path)
- `BOT_TOKEN` to'g'ri
- Render scaling: 1 instance (recommended)

Steps:
- [ ] Deploy qiling.
- [ ] Log'da "Webhook registered: <WEBHOOK_URL><WEBHOOK_PATH>" chiqsin.
- [ ] Botga `/start` yuboring - javob kelishi kerak.
- [ ] Telegram'da 1-2 daqiqa kuzating: 409 xato chiqmasin.
Expected:
- [ ] 409 yo'q, polling ishlamaydi, faqat webhook.

#### B3) Webhook tekshiruvi (optional, tezkor)
- [ ] Telegram API orqali `getWebhookInfo` tekshirish (manual):
  - URL to'g'ri bo'lsin
  - `pending_update_count` kattalashib ketmasin

### C) Graceful shutdown (SIGTERM) - Render restart
Steps:
- [ ] Render'da manual restart qiling (yoki redeploy).
- [ ] Log'da "SIGTERM received, stopping bot..." va "server closed" chiqsin.
Expected:
- [ ] Qayta start bo'lganda webhook qayta set bo'ladi, 409 chiqmaydi.

### D) Auth (WebApp + fallback)
#### D1) Telegram WebApp
- [ ] Telegram ichidan WebApp oching.
- [ ] `/api/me` 200 bo'lsin (initData verify o'tishi kerak).
- [ ] Default profile maydonlari (first_name, last_name, username) bazaga tushsin.
- [ ] User profile edit qila olsin.

#### D2) WebApp bo'lmasa (fallback login)
- [ ] Browser'da to'g'ridan-to'g'ri URL oching.
- [ ] Login+password bilan kirish ishlasin.
- [ ] Session cookie HTTPOnly bo'lsin.

### E) Task system (Admin -> User)
- [ ] Admin yangi task yaratadi.
- [ ] User Telegram'da "task keldi" xabarini oladi.
- [ ] Inline tugmalar ishlaydi: START / DONE / REJECT (yoki siz belgilagan).
- [ ] Dashboard'da status real-time yoki refresh bilan to'g'ri yangilanadi:
  - Done count
  - Not done / overdue
  - Active / inactive (last_seen)

### F) Broadcast (Confirm + rate limit)
- [ ] Admin botga text/rasm yuboradi.
- [ ] Bot "Hammaga yuboraymi?" deb so'raydi.
- [ ] Admin "HA" bosganda:
  - [ ] hamma userlarga yuboradi
  - [ ] rate limit sabab bloklanmaydi
  - [ ] natija: sent_count / failed_count log bo'ladi
- [ ] "YO'Q" bosilganda broadcast bekor bo'ladi.

### G) Responsive UI
- [ ] Mobile (<= 480px): sidebar drawer, table -> cards, scroll to'g'ri.
- [ ] Desktop: sidebar doimiy, table view normal.
- [ ] Loading skeleton va empty state ko'rinadi.

### H) Regression smoke test (5 daqiqalik)
- [ ] /health OK
- [ ] /start OK
- [ ] WebApp login OK
- [ ] 1 task yuborish OK
- [ ] 1 broadcast (test 2-3 user) OK
- [ ] 409 yo'q

## 6000 Users Scale Notes
- Broadcast va task notificationlar queue orqali yuboriladi, requestni bloklamaydi.
- Rate limit env: `BROADCAST_RATE_PER_SEC` (default 25), batch: `BROADCAST_BATCH_SIZE` (50-200), retry: `BROADCAST_RETRY_LIMIT` (default 2).
- Transient xatolar (429/5xx/timeout) retry qilinadi, 403/400 bo'lsa user `telegram_status` blocked/inactive bo'ladi.
- Broadcast progress DB'da `sent_count`/`failed_count`/`started_at`/`finished_at` orqali saqlanadi.
- Worker restart bo'lsa queued/sending broadcastlar DB'dan resume qiladi.
- `INACTIVE_AFTER_DAYS` (default 7) user activity hisoblash uchun ishlatiladi.
- Metrics endpoint: `GET /api/admin/metrics/broadcasts`.

## Features
- **User Registration**: Telegram prefill + user editable fields, password set by user.
- **Admin Task Management**: Create tasks, assign to users, view status filters and completion rates.
- **Telegram Notifications**: Bot notifies users of new tasks and status updates.
- **RBAC**: Admin endpoints and commands are restricted to admins.

## API Endpoints
- `POST /api/auth/telegram`: Authenticate with Telegram initData.
- `POST /api/auth/login`: Login with login+password.
- `POST /api/auth/logout`: Logout and clear session.
- `POST /api/auth/register`: Register or update profile.
- `GET /api/me`: Current user.
- `GET /api/tasks`: List user assignments.
- `POST /api/tasks/:assignmentId/status`: Update task status.
- `GET /api/admin/users`: Admin: List users.
- `POST /api/admin/tasks`: Admin: Create task.
- `POST /api/admin/tasks/:id/assign`: Admin: Assign task.
- `GET /api/admin/tasks`: Admin: List tasks with stats.

## Security
- `initData` validation (HMAC SHA-256) ensures requests come from Telegram.
- Passwords are stored using scrypt hashing.
- Role-based access control (RBAC) for Admin endpoints.

## Changelog
See `CHANGELOG.md` for a short summary of recent changes.
