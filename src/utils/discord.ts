import { env } from '../config/env';
import { logger } from './logger';

interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
  timestamp?: string;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
}

const COLORS = {
  SUCCESS: 0x00ff00,
  WARNING: 0xffaa00,
  ERROR: 0xff0000,
  INFO: 0x0099ff,
  VENDOR: 0x9b59b6,
  USER: 0x3498db,
  MODERATION: 0xe74c3c,
};

export async function notifyAdmin(
  type: string,
  data: Record<string, unknown>,
  color?: number
): Promise<void> {
  if (!env.DISCORD_ADMIN_WEBHOOK) {
    logger.debug('Discord webhook not configured, skipping notification');
    return;
  }

  const getColor = () => {
    if (color) return color;
    if (type.includes('ERROR') || type.includes('FAIL')) return COLORS.ERROR;
    if (type.includes('WARN') || type.includes('FLAG')) return COLORS.WARNING;
    if (type.includes('VENDOR')) return COLORS.VENDOR;
    if (type.includes('USER')) return COLORS.USER;
    if (type.includes('MOD')) return COLORS.MODERATION;
    return COLORS.SUCCESS;
  };

  const embed: DiscordEmbed = {
    title: `🚨 ${type}`,
    description: '```json\n' + JSON.stringify(data, null, 2).slice(0, 1000) + '\n```',
    color: getColor(),
    timestamp: new Date().toISOString(),
  };

  // Convert data to fields if small enough
  const dataEntries = Object.entries(data);
  if (dataEntries.length <= 10 && dataEntries.every(([_, v]) => String(v).length < 100)) {
    embed.fields = dataEntries.map(([name, value]) => ({
      name: name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      value: String(value),
      inline: true,
    }));
    embed.description = undefined as unknown as string;
  }

  try {
    const response = await fetch(env.DISCORD_ADMIN_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!response.ok) {
      logger.warn('Discord webhook failed:', { status: response.status });
    }
  } catch (error) {
    logger.error('Discord webhook error:', error);
  }
}

// Specific notification helpers
export const adminNotifications = {
  async newVendor(vendorData: { vendor_name: string; store_name: string; uuid: string; food_categories: string[] }): Promise<void> {
    await notifyAdmin('NEW_VENDOR_REGISTRATION', vendorData, COLORS.VENDOR);
  },

  async vendorApproved(vendorId: string, adminId: string): Promise<void> {
    await notifyAdmin('VENDOR_APPROVED', { vendor_id: vendorId, approved_by: adminId }, COLORS.SUCCESS);
  },

  async vendorRejected(vendorId: string, adminId: string, reason: string): Promise<void> {
    await notifyAdmin('VENDOR_REJECTED', { vendor_id: vendorId, rejected_by: adminId, reason }, COLORS.WARNING);
  },

  async contentFlagged(targetType: string, targetId: string, reason: string, flagCount: number): Promise<void> {
    await notifyAdmin('CONTENT_FLAGGED', { target_type: targetType, target_id: targetId, reason, flag_count: flagCount }, COLORS.MODERATION);
  },

  async contentReport(username: string, targetType: string, reason: string, description?: string): Promise<void> {
    await notifyAdmin('CONTENT_REPORTED', { 
      reported_by: username, 
      target_type: targetType, 
      reason, 
      description: description || 'No description provided' 
    }, COLORS.MODERATION);
  },

  async contentAutoHidden(targetType: string, targetId: string, flagCount: number): Promise<void> {
    await notifyAdmin('CONTENT_AUTO_HIDDEN', { target_type: targetType, target_id: targetId, flag_count: flagCount }, COLORS.WARNING);
  },

  async userSuspended(userId: string, adminId: string, reason: string): Promise<void> {
    await notifyAdmin('USER_SUSPENDED', { user_id: userId, suspended_by: adminId, reason }, COLORS.MODERATION);
  },

  async suspiciousActivity(userId: string, activityType: string, details: Record<string, unknown>): Promise<void> {
    await notifyAdmin('SUSPICIOUS_ACTIVITY', { user_id: userId, activity: activityType, ...details }, COLORS.ERROR);
  },

  async systemError(error: string, context?: Record<string, unknown>): Promise<void> {
    await notifyAdmin('SYSTEM_ERROR', { error, ...context }, COLORS.ERROR);
  },

  async dailyStats(stats: Record<string, number>): Promise<void> {
    await notifyAdmin('DAILY_STATS', stats, COLORS.INFO);
  },
};
