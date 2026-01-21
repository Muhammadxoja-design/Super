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
6. Keep scaling at **1 instance** to avoid Telegram webhook conflicts.

### 7. Manual Happy-Path Checks
- **Telegram Login**: Open the bot, click “🚀 Web App ochish”, verify auto-login.
- **Task Assignment**: Admin creates task in WebApp or /newtask in bot, assigns to a user, user receives notification.
- **Status Update**: User updates status (accepted/in_progress/done) and admin receives notification.
- **Local polling**: No `WEBHOOK_URL`, run `npm run dev`, bot uses polling.
- **Prod webhook**: Set `WEBHOOK_URL` + `WEBHOOK_PATH`, bot uses webhook.
- **409 Conflict**: Ensure only webhook or polling is active.

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
