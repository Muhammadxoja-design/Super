import type { Telegraf } from "telegraf";

export type RequiredChannel = {
  id: string;
  title: string;
  inviteLinkOrUsername?: string;
};

export type SubscriptionCheckResult = {
  ok: boolean;
  missing: RequiredChannel[];
  warning?: string;
};

export const REQUIRED_CHANNEL_IDS = (process.env.REQUIRED_CHANNEL_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

const REQUIRED_CHANNEL_LINKS = (process.env.REQUIRED_CHANNEL_LINKS || "")
  .split(",")
  .map((link) => link.trim())
  .filter((link) => link.length > 0);

const REQUIRED_CHANNEL_LABELS = (process.env.REQUIRED_CHANNEL_LABELS || "")
  .split(",")
  .map((label) => label.trim())
  .filter((label) => label.length > 0);

const REQUIRED_CHANNEL_META = REQUIRED_CHANNEL_IDS.map((id, index) => ({
  id,
  link: REQUIRED_CHANNEL_LINKS[index],
  label: REQUIRED_CHANNEL_LABELS[index],
}));

const SUBSCRIPTION_CACHE_TTL_MS = 90_000;

let subscriptionBot: Telegraf | null = null;

const subscriptionCache = new Map<
  string,
  { expiresAt: number; result: SubscriptionCheckResult }
>();

const channelInfoCache = new Map<string, RequiredChannel>();

export function setSubscriptionBot(bot: Telegraf | null) {
  subscriptionBot = bot;
}

function normalizeInviteLink(value?: string) {
  if (!value) return undefined;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("@")) {
    return `https://t.me/${value.slice(1)}`;
  }
  if (value.startsWith("t.me/") || value.startsWith("telegram.me/")) {
    return `https://${value}`;
  }
  return value;
}

async function resolveChannelInfo(channelId: string): Promise<RequiredChannel> {
  const cached = channelInfoCache.get(channelId);
  if (cached) return cached;

  const fallback = REQUIRED_CHANNEL_META.find((item) => item.id === channelId);
  let title = fallback?.label || channelId;
  let inviteLinkOrUsername = fallback?.link;

  if (subscriptionBot) {
    try {
      const chat = await subscriptionBot.telegram.getChat(channelId);
      if (chat?.title) title = chat.title;
      if (chat?.username) {
        inviteLinkOrUsername = `https://t.me/${chat.username}`;
      }
      if ((chat as any)?.invite_link) {
        inviteLinkOrUsername = (chat as any).invite_link as string;
      }
    } catch {
      // Ignore chat lookup errors and fall back to env metadata.
    }
  }

  const resolved = {
    id: channelId,
    title,
    inviteLinkOrUsername: normalizeInviteLink(inviteLinkOrUsername),
  };
  channelInfoCache.set(channelId, resolved);
  return resolved;
}

export function clearSubscriptionCache(telegramUserId?: string) {
  if (telegramUserId) {
    subscriptionCache.delete(telegramUserId);
    return;
  }
  subscriptionCache.clear();
}

export async function checkUserSubscribed(
  telegramUserId: string,
  options?: { forceRefresh?: boolean },
): Promise<SubscriptionCheckResult> {
  if (!REQUIRED_CHANNEL_IDS.length) return { ok: true, missing: [] };

  if (options?.forceRefresh) {
    clearSubscriptionCache(telegramUserId);
  }

  const cached = subscriptionCache.get(telegramUserId);
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.result;

  if (!subscriptionBot) {
    const missing = await Promise.all(
      REQUIRED_CHANNEL_IDS.map((id) => resolveChannelInfo(id)),
    );
    const result = {
      ok: false,
      missing,
      warning: "Bot konfiguratsiyasi tekshirilmagan. Admin bilan bog'laning.",
    };
    subscriptionCache.set(telegramUserId, {
      expiresAt: now + SUBSCRIPTION_CACHE_TTL_MS,
      result,
    });
    return result;
  }

  console.log("[telegram] subscription channels", {
    userId: telegramUserId,
    channels: REQUIRED_CHANNEL_IDS,
  });

  const warnings = new Set<string>();
  const missingIds: string[] = [];

  for (const channelId of REQUIRED_CHANNEL_IDS) {
    try {
      const member = await subscriptionBot.telegram.getChatMember(
        channelId,
        Number(telegramUserId),
      );
      const status = member?.status;
      console.log("[telegram] subscription status", {
        userId: telegramUserId,
        channelId,
        status,
      });
      if (
        status !== "creator" &&
        status !== "administrator" &&
        status !== "member"
      ) {
        missingIds.push(channelId);
      }
    } catch (error) {
      const description = (error as any)?.response?.description;
      const message = (error as any)?.message;
      console.error("Telegram subscription check failed:", {
        channelId,
        error: description || message || error,
      });
      if (
        typeof description === "string" &&
        /administrator|not enough rights|not a member|need administrator/i.test(
          description,
        )
      ) {
        warnings.add(
          "Botga kanal admin huquqlari kerak. Admin botni kanalga admin qilib qo'ying.",
        );
      }
      missingIds.push(channelId);
    }
  }

  const missing = await Promise.all(missingIds.map((id) => resolveChannelInfo(id)));
  const warning = warnings.size ? Array.from(warnings).join(" ") : undefined;
  const result = { ok: missingIds.length === 0, missing, warning };
  subscriptionCache.set(telegramUserId, {
    expiresAt: now + SUBSCRIPTION_CACHE_TTL_MS,
    result,
  });
  return result;
}

export async function getRequiredChannels(): Promise<RequiredChannel[]> {
  return Promise.all(REQUIRED_CHANNEL_IDS.map((id) => resolveChannelInfo(id)));
}
