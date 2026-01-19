
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
The app automatically seeds the database on first startup if it's empty.

### 3. Environment Variables
Create a `.env` file or set these secrets in Replit:

```
BOT_TOKEN=your_telegram_bot_token
WEBAPP_URL=https://your-app-url.replit.app
ADMIN_TELEGRAM_IDS=123456789,987654321
```

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
   - For Web App URL, use your Replit URL (e.g., `https://your-project.replit.app`).
4. Set the Menu Button (optional):
   - `/setmenubutton` -> Select your bot -> provide the URL.

### 6. Persistence
The SQLite database file is located at `data/taskbotfergana.sqlite`.
In a Docker/Production environment, ensure the `/data` directory is mounted as a volume to persist data across restarts.

## Features
- **User Registration**: Users register with details (Region, Direction, etc.).
- **Admin Approval**: Admins approve/reject users via the Admin Panel.
- **Task Management**: Admins assign tasks; Users complete them.
- **Telegram Notifications**: Bot notifies users of new tasks and status updates.

## API Endpoints
- `POST /api/auth/telegram`: Authenticate with Telegram initData.
- `POST /api/register`: Register new user.
- `GET /api/tasks`: List user tasks.
- `POST /api/tasks/:id/complete`: Mark task as complete.
- `GET /api/admin/users`: Admin: List users.
- `POST /api/admin/tasks`: Admin: Create task.

## Security
- `initData` validation (HMAC SHA-256) ensures requests come from Telegram.
- Role-based access control (RBAC) for Admin endpoints.
