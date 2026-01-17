import { prisma } from '../../config/database';
import { DEFAULT_PAGE_SIZE, BOTTLE_CAP_REWARDS } from '../../utils/constants';
import { decodeCursor, encodeCursor } from '../../utils/pagination';
import {
  CreateExpeditionInput,
  UpdateExpeditionInput,
  InviteParticipantsInput,
  CheckInVendorInput,
  CompleteExpeditionInput,
  GetExpeditionsQuery,
  DiscoverExpeditionsQuery,
} from './expeditions.schema';

export class ExpeditionsService {
  /**
   * Create a new expedition
   */
  async createExpedition(creatorId: string, input: CreateExpeditionInput) {
    // Verify all vendors exist
    const vendors = await prisma.vendor.findMany({
      where: { uuid: { in: input.vendor_ids } },
      select: { uuid: true },
    });

    if (vendors.length !== input.vendor_ids.length) {
      throw new Error('Some vendors not found');
    }

    const expedition = await prisma.$transaction(async (tx) => {
      // Create expedition
      const exp = await tx.expedition.create({
        data: {
          type: input.type,
          creator_id: creatorId,
          title: input.title,
          description: input.description,
          planned_date: new Date(input.planned_date),
          start_time: input.start_time,
          cover_image: input.cover_image,
          max_participants: input.max_participants,
          is_public: input.is_public,
          vendor_count: input.vendor_ids.length,
          status: 'DRAFT',
        },
      });

      // Add creator as participant
      await tx.expeditionParticipant.create({
        data: {
          expedition_id: exp.uuid,
          user_id: creatorId,
          role: 'CREATOR',
          status: 'ACCEPTED',
          joined_at: new Date(),
        },
      });

      // Add vendors
      await tx.expeditionVendor.createMany({
        data: input.vendor_ids.map((vendorId, index) => ({
          expedition_id: exp.uuid,
          vendor_id: vendorId,
          order_index: index,
          status: 'PLANNED',
        })),
      });

      return exp;
    });

    return this.getExpeditionById(expedition.uuid, creatorId);
  }

  /**
   * Get expedition by ID
   */
  async getExpeditionById(expeditionId: string, viewerId?: string) {
    const expedition = await prisma.expedition.findUnique({
      where: { uuid: expeditionId },
      include: {
        creator: {
          select: {
            uuid: true,
            username: true,
            display_name: true,
            profile_picture: true,
          },
        },
        participants: {
          where: { status: 'ACCEPTED' },
          include: {
            user: {
              select: {
                uuid: true,
                username: true,
                display_name: true,
                profile_picture: true,
              },
            },
          },
        },
        vendors: {
          orderBy: { order_index: 'asc' },
          include: {
            vendor: {
              select: {
                uuid: true,
                store_name: true,
                stall_photos: true,
                food_categories: true,
                rating_overall: true,
              },
            },
          },
        },
      },
    });

    if (!expedition) {
      return null;
    }

    // Check access for private expeditions
    if (!expedition.is_public && viewerId !== expedition.creator_id) {
      const isParticipant = expedition.participants.some(
        (p) => p.user_id === viewerId
      );
      if (!isParticipant) {
        throw new Error('Access denied');
      }
    }

    // Check if viewer has pending invite
    let inviteStatus = null;
    if (viewerId && viewerId !== expedition.creator_id) {
      const invite = await prisma.expeditionParticipant.findUnique({
        where: {
          expedition_id_user_id: {
            expedition_id: expeditionId,
            user_id: viewerId,
          },
        },
      });
      inviteStatus = invite?.status || null;
    }

    return {
      ...expedition,
      participants: expedition.participants.map((p) => ({
        ...p.user,
        role: p.role,
        joined_at: p.joined_at,
      })),
      vendors: expedition.vendors.map((v) => ({
        ...v.vendor,
        order_index: v.order_index,
        status: v.status,
        visited_at: v.visited_at,
        rating_submitted: v.rating_submitted,
        notes: v.notes,
      })),
      is_creator: viewerId === expedition.creator_id,
      invite_status: inviteStatus,
    };
  }

  /**
   * Update expedition details
   */
  async updateExpedition(expeditionId: string, creatorId: string, input: UpdateExpeditionInput) {
    const expedition = await prisma.expedition.findUnique({
      where: { uuid: expeditionId },
    });

    if (!expedition) {
      throw new Error('Expedition not found');
    }

    if (expedition.creator_id !== creatorId) {
      throw new Error('Not authorized to edit this expedition');
    }

    if (!['DRAFT', 'PLANNED'].includes(expedition.status)) {
      throw new Error('Cannot edit expedition once started');
    }

    await prisma.expedition.update({
      where: { uuid: expeditionId },
      data: {
        title: input.title,
        description: input.description,
        planned_date: input.planned_date ? new Date(input.planned_date) : undefined,
        start_time: input.start_time,
        cover_image: input.cover_image,
        max_participants: input.max_participants,
        is_public: input.is_public,
      },
    });

    return this.getExpeditionById(expeditionId, creatorId);
  }

  /**
   * Publish a draft expedition
   */
  async publishExpedition(expeditionId: string, creatorId: string) {
    const expedition = await prisma.expedition.findUnique({
      where: { uuid: expeditionId },
    });

    if (!expedition) {
      throw new Error('Expedition not found');
    }

    if (expedition.creator_id !== creatorId) {
      throw new Error('Not authorized');
    }

    if (expedition.status !== 'DRAFT') {
      throw new Error('Only draft expeditions can be published');
    }

    await prisma.expedition.update({
      where: { uuid: expeditionId },
      data: { status: 'PLANNED' },
    });

    return { published: true };
  }

  /**
   * Start an expedition
   */
  async startExpedition(expeditionId: string, creatorId: string) {
    const expedition = await prisma.expedition.findUnique({
      where: { uuid: expeditionId },
    });

    if (!expedition) {
      throw new Error('Expedition not found');
    }

    if (expedition.creator_id !== creatorId) {
      throw new Error('Not authorized');
    }

    if (expedition.status !== 'PLANNED') {
      throw new Error('Only planned expeditions can be started');
    }

    await prisma.expedition.update({
      where: { uuid: expeditionId },
      data: {
        status: 'IN_PROGRESS',
        started_at: new Date(),
      },
    });

    // Notify participants
    const participants = await prisma.expeditionParticipant.findMany({
      where: {
        expedition_id: expeditionId,
        status: 'ACCEPTED',
        user_id: { not: creatorId },
      },
    });

    for (const p of participants) {
      await prisma.notification.create({
        data: {
          user_id: p.user_id,
          type: 'EXPEDITION_UPDATE',
          title: 'Expedition Started!',
          body: `"${expedition.title}" has started!`,
          data: { expedition_id: expeditionId },
        },
      });
    }

    return { started: true, started_at: new Date() };
  }

  /**
   * Check in at a vendor during expedition
   */
  async checkInVendor(expeditionId: string, userId: string, input: CheckInVendorInput) {
    const expedition = await prisma.expedition.findUnique({
      where: { uuid: expeditionId },
      include: {
        participants: { where: { user_id: userId, status: 'ACCEPTED' } },
      },
    });

    if (!expedition) {
      throw new Error('Expedition not found');
    }

    if (expedition.participants.length === 0) {
      throw new Error('You are not part of this expedition');
    }

    if (expedition.status !== 'IN_PROGRESS') {
      throw new Error('Expedition is not in progress');
    }

    const expVendor = await prisma.expeditionVendor.findUnique({
      where: {
        expedition_id_vendor_id: {
          expedition_id: expeditionId,
          vendor_id: input.vendor_id,
        },
      },
    });

    if (!expVendor) {
      throw new Error('Vendor not in this expedition');
    }

    if (expVendor.status === 'VISITED') {
      return { already_checked_in: true };
    }

    await prisma.expeditionVendor.update({
      where: {
        expedition_id_vendor_id: {
          expedition_id: expeditionId,
          vendor_id: input.vendor_id,
        },
      },
      data: {
        status: 'VISITED',
        visited_at: new Date(),
        notes: input.notes,
      },
    });

    // Award check-in bonus to all participants
    const participants = await prisma.expeditionParticipant.findMany({
      where: { expedition_id: expeditionId, status: 'ACCEPTED' },
    });

    for (const p of participants) {
      const user = await prisma.user.update({
        where: { uuid: p.user_id },
        data: { bottle_caps: { increment: BOTTLE_CAP_REWARDS.CHECK_IN_BONUS } },
      });

      await prisma.bottleCapTransaction.create({
        data: {
          user_id: p.user_id,
          amount: BOTTLE_CAP_REWARDS.CHECK_IN_BONUS,
          action_type: 'EXPEDITION_CHECK_IN',
          reference_id: expeditionId,
          reference_type: 'EXPEDITION',
          description: `Check-in at vendor during expedition`,
          balance_after: user.bottle_caps,
        },
      });
    }

    return { checked_in: true, visited_at: new Date() };
  }

  /**
   * Skip a vendor during expedition
   */
  async skipVendor(expeditionId: string, userId: string, vendorId: string) {
    const expedition = await prisma.expedition.findUnique({
      where: { uuid: expeditionId },
    });

    if (!expedition) {
      throw new Error('Expedition not found');
    }

    if (expedition.creator_id !== userId) {
      throw new Error('Only the expedition creator can skip vendors');
    }

    if (expedition.status !== 'IN_PROGRESS') {
      throw new Error('Expedition is not in progress');
    }

    await prisma.expeditionVendor.update({
      where: {
        expedition_id_vendor_id: {
          expedition_id: expeditionId,
          vendor_id: vendorId,
        },
      },
      data: { status: 'SKIPPED' },
    });

    return { skipped: true };
  }

  /**
   * Complete an expedition
   */
  async completeExpedition(expeditionId: string, creatorId: string, input: CompleteExpeditionInput) {
    const expedition = await prisma.expedition.findUnique({
      where: { uuid: expeditionId },
      include: {
        participants: { where: { status: 'ACCEPTED' } },
        vendors: { where: { status: 'VISITED' } },
      },
    });

    if (!expedition) {
      throw new Error('Expedition not found');
    }

    if (expedition.creator_id !== creatorId) {
      throw new Error('Only the expedition creator can complete it');
    }

    if (expedition.status !== 'IN_PROGRESS') {
      throw new Error('Expedition is not in progress');
    }

    // Calculate duration
    const startedAt = expedition.started_at || new Date();
    const durationMins = Math.round((Date.now() - startedAt.getTime()) / 60000);

    // Calculate bottle caps reward
    const baseReward = expedition.type === 'TEAM'
      ? BOTTLE_CAP_REWARDS.EXPEDITION_TEAM_BASE
      : BOTTLE_CAP_REWARDS.EXPEDITION_SOLO_BASE;
    const vendorBonus = expedition.vendors.length * BOTTLE_CAP_REWARDS.EXPEDITION_PER_VENDOR;
    const totalReward = baseReward + vendorBonus;

    await prisma.$transaction(async (tx) => {
      // Update expedition
      await tx.expedition.update({
        where: { uuid: expeditionId },
        data: {
          status: 'COMPLETED',
          completed_at: new Date(),
          actual_duration_mins: durationMins,
          total_spent: input.total_spent,
          distance_walked_meters: input.distance_walked_meters,
          bottle_caps_earned: totalReward,
        },
      });

      // Award bottle caps to all participants
      for (const p of expedition.participants) {
        const user = await tx.user.update({
          where: { uuid: p.user_id },
          data: {
            bottle_caps: { increment: totalReward },
          },
        });

        await tx.bottleCapTransaction.create({
          data: {
            user_id: p.user_id,
            amount: totalReward,
            action_type: 'EXPEDITION_COMPLETE',
            reference_id: expeditionId,
            reference_type: 'EXPEDITION',
            description: `Completed ${expedition.type} expedition: ${expedition.title}`,
            balance_after: user.bottle_caps,
          },
        });
      }
    });

    return {
      completed: true,
      completed_at: new Date(),
      duration_mins: durationMins,
      vendors_visited: expedition.vendors.length,
      bottle_caps_earned: totalReward,
    };
  }

  /**
   * Cancel an expedition
   */
  async cancelExpedition(expeditionId: string, creatorId: string) {
    const expedition = await prisma.expedition.findUnique({
      where: { uuid: expeditionId },
    });

    if (!expedition) {
      throw new Error('Expedition not found');
    }

    if (expedition.creator_id !== creatorId) {
      throw new Error('Only the expedition creator can cancel it');
    }

    if (['COMPLETED', 'CANCELLED'].includes(expedition.status)) {
      throw new Error('Expedition cannot be cancelled');
    }

    await prisma.expedition.update({
      where: { uuid: expeditionId },
      data: { status: 'CANCELLED' },
    });

    // Notify participants
    const participants = await prisma.expeditionParticipant.findMany({
      where: {
        expedition_id: expeditionId,
        status: 'ACCEPTED',
        user_id: { not: creatorId },
      },
    });

    for (const p of participants) {
      await prisma.notification.create({
        data: {
          user_id: p.user_id,
          type: 'EXPEDITION_UPDATE',
          title: 'Expedition Cancelled',
          body: `"${expedition.title}" has been cancelled`,
          data: { expedition_id: expeditionId },
        },
      });
    }

    return { cancelled: true };
  }

  /**
   * Invite users to expedition
   */
  async inviteParticipants(expeditionId: string, creatorId: string, input: InviteParticipantsInput) {
    const expedition = await prisma.expedition.findUnique({
      where: { uuid: expeditionId },
      include: {
        participants: true,
      },
    });

    if (!expedition) {
      throw new Error('Expedition not found');
    }

    if (expedition.creator_id !== creatorId) {
      throw new Error('Only the expedition creator can invite participants');
    }

    if (!['DRAFT', 'PLANNED'].includes(expedition.status)) {
      throw new Error('Cannot invite to expedition once started');
    }

    // Check max participants
    const currentCount = expedition.participants.filter((p) => p.status === 'ACCEPTED').length;
    if (currentCount + input.user_ids.length > expedition.max_participants) {
      throw new Error('Would exceed max participants');
    }

    // Get already invited users
    const alreadyInvited = new Set(expedition.participants.map((p) => p.user_id));

    // Create invites for new users
    const newInvites = input.user_ids.filter((id) => !alreadyInvited.has(id));

    if (newInvites.length === 0) {
      return { invited: 0 };
    }

    await prisma.expeditionParticipant.createMany({
      data: newInvites.map((userId) => ({
        expedition_id: expeditionId,
        user_id: userId,
        role: 'PARTICIPANT',
        status: 'INVITED',
      })),
    });

    // Send notifications
    for (const userId of newInvites) {
      await prisma.notification.create({
        data: {
          user_id: userId,
          type: 'EXPEDITION_INVITE',
          title: 'Expedition Invite',
          body: `You've been invited to "${expedition.title}"`,
          data: { expedition_id: expeditionId, creator_id: creatorId },
        },
      });
    }

    return { invited: newInvites.length };
  }

  /**
   * Respond to expedition invite
   */
  async respondToInvite(expeditionId: string, userId: string, action: 'accept' | 'decline') {
    const invite = await prisma.expeditionParticipant.findUnique({
      where: {
        expedition_id_user_id: {
          expedition_id: expeditionId,
          user_id: userId,
        },
      },
    });

    if (!invite) {
      throw new Error('Invite not found');
    }

    if (invite.status !== 'INVITED') {
      throw new Error('Invite already responded');
    }

    const newStatus = action === 'accept' ? 'ACCEPTED' : 'DECLINED';

    await prisma.expeditionParticipant.update({
      where: {
        expedition_id_user_id: {
          expedition_id: expeditionId,
          user_id: userId,
        },
      },
      data: {
        status: newStatus,
        joined_at: action === 'accept' ? new Date() : undefined,
      },
    });

    return { status: newStatus };
  }

  /**
   * Leave an expedition
   */
  async leaveExpedition(expeditionId: string, userId: string) {
    const participant = await prisma.expeditionParticipant.findUnique({
      where: {
        expedition_id_user_id: {
          expedition_id: expeditionId,
          user_id: userId,
        },
      },
      include: { expedition: true },
    });

    if (!participant) {
      throw new Error('Not part of this expedition');
    }

    if (participant.role === 'CREATOR') {
      throw new Error('Creator cannot leave the expedition');
    }

    if (participant.expedition.status === 'IN_PROGRESS') {
      throw new Error('Cannot leave expedition in progress');
    }

    await prisma.expeditionParticipant.delete({
      where: {
        expedition_id_user_id: {
          expedition_id: expeditionId,
          user_id: userId,
        },
      },
    });

    return { left: true };
  }

  /**
   * Get user's expeditions
   */
  async getUserExpeditions(userId: string, query: GetExpeditionsQuery) {
    const { limit = DEFAULT_PAGE_SIZE, cursor, status, type } = query;
    const decodedCursor = cursor ? decodeCursor(cursor) : null;

    const expeditions = await prisma.expedition.findMany({
      where: {
        OR: [
          { creator_id: userId },
          {
            participants: {
              some: { user_id: userId, status: 'ACCEPTED' },
            },
          },
        ],
        ...(status && { status }),
        ...(type && { type }),
      },
      include: {
        creator: {
          select: {
            uuid: true,
            username: true,
            display_name: true,
            profile_picture: true,
          },
        },
        _count: {
          select: { participants: { where: { status: 'ACCEPTED' } } },
        },
      },
      take: limit + 1,
      ...(decodedCursor && {
        skip: 1,
        cursor: { uuid: decodedCursor },
      }),
      orderBy: { planned_date: 'desc' },
    });

    const hasMore = expeditions.length > limit;
    const items = hasMore ? expeditions.slice(0, -1) : expeditions;
    const nextCursor = hasMore && items.length > 0
      ? encodeCursor(items[items.length - 1]!.uuid)
      : null;

    return {
      items: items.map((exp) => ({
        ...exp,
        participant_count: exp._count.participants,
        is_creator: exp.creator_id === userId,
      })),
      nextCursor,
      hasMore,
    };
  }

  /**
   * Get pending expedition invites for user
   */
  async getPendingInvites(userId: string) {
    const invites = await prisma.expeditionParticipant.findMany({
      where: {
        user_id: userId,
        status: 'INVITED',
      },
      include: {
        expedition: {
          include: {
            creator: {
              select: {
                uuid: true,
                username: true,
                display_name: true,
                profile_picture: true,
              },
            },
          },
        },
      },
      orderBy: { expedition: { planned_date: 'asc' } },
    });

    return invites.map((invite) => ({
      expedition_id: invite.expedition_id,
      expedition: invite.expedition,
      invited_at: invite.expedition.created_at,
    }));
  }

  /**
   * Discover public expeditions
   */
  async discoverExpeditions(userId: string, query: DiscoverExpeditionsQuery) {
    const { limit = DEFAULT_PAGE_SIZE, cursor, date_from, date_to } = query;
    const decodedCursor = cursor ? decodeCursor(cursor) : null;

    const expeditions = await prisma.expedition.findMany({
      where: {
        is_public: true,
        status: 'PLANNED',
        type: 'TEAM', // Only team expeditions
        creator_id: { not: userId }, // Exclude own expeditions
        planned_date: {
          gte: date_from ? new Date(date_from) : new Date(),
          ...(date_to && { lte: new Date(date_to) }),
        },
        participants: {
          none: { user_id: userId }, // Not already joined
        },
      },
      include: {
        creator: {
          select: {
            uuid: true,
            username: true,
            display_name: true,
            profile_picture: true,
          },
        },
        _count: {
          select: {
            participants: { where: { status: 'ACCEPTED' } },
            vendors: true,
          },
        },
      },
      take: limit + 1,
      ...(decodedCursor && {
        skip: 1,
        cursor: { uuid: decodedCursor },
      }),
      orderBy: { planned_date: 'asc' },
    });

    const hasMore = expeditions.length > limit;
    const items = hasMore ? expeditions.slice(0, -1) : expeditions;
    const nextCursor = hasMore && items.length > 0
      ? encodeCursor(items[items.length - 1]!.uuid)
      : null;

    return {
      items: items.map((exp) => ({
        ...exp,
        participant_count: exp._count.participants,
        vendor_count: exp._count.vendors,
        spots_available: exp.max_participants - exp._count.participants,
      })),
      nextCursor,
      hasMore,
    };
  }

  /**
   * Request to join a public expedition
   */
  async requestJoin(expeditionId: string, userId: string) {
    const expedition = await prisma.expedition.findUnique({
      where: { uuid: expeditionId },
      include: {
        _count: { select: { participants: { where: { status: 'ACCEPTED' } } } },
      },
    });

    if (!expedition) {
      throw new Error('Expedition not found');
    }

    if (!expedition.is_public) {
      throw new Error('Expedition is not public');
    }

    if (expedition.status !== 'PLANNED') {
      throw new Error('Cannot join expedition');
    }

    if (expedition._count.participants >= expedition.max_participants) {
      throw new Error('Expedition is full');
    }

    // Check if already participant
    const existing = await prisma.expeditionParticipant.findUnique({
      where: {
        expedition_id_user_id: {
          expedition_id: expeditionId,
          user_id: userId,
        },
      },
    });

    if (existing) {
      return { already_joined: true };
    }

    // For public expeditions, auto-accept
    await prisma.expeditionParticipant.create({
      data: {
        expedition_id: expeditionId,
        user_id: userId,
        role: 'PARTICIPANT',
        status: 'ACCEPTED',
        joined_at: new Date(),
      },
    });

    // Notify creator
    await prisma.notification.create({
      data: {
        user_id: expedition.creator_id,
        type: 'EXPEDITION_UPDATE',
        title: 'New Participant',
        body: `Someone joined your expedition "${expedition.title}"`,
        data: { expedition_id: expeditionId, user_id: userId },
      },
    });

    return { joined: true };
  }
}

export const expeditionsService = new ExpeditionsService();
