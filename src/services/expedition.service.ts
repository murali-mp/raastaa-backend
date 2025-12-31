import { db } from '../config/database';
import { ExpeditionType, ExpeditionStatus } from '@prisma/client';
import { NotFoundError, ValidationError } from '../utils/errors';
import { walletService } from './wallet.service';

export interface CreateExpeditionInput {
  userId: string;
  name: string;
  expeditionType: ExpeditionType;
  vendorIds: string[];
  targetDate?: Date;
  notes?: string;
}

export class ExpeditionService {
  /**
   * Create a new expedition
   */
  async createExpedition(input: CreateExpeditionInput) {
    const { userId, name, expeditionType, vendorIds, targetDate, notes } = input;

    if (!name || name.trim().length === 0) {
      throw new ValidationError('Expedition name is required');
    }

    if (!vendorIds || vendorIds.length === 0) {
      throw new ValidationError('At least one vendor is required');
    }

    // Validate all vendors exist
    const vendors = await db.vendor.findMany({
      where: { id: { in: vendorIds } },
    });

    if (vendors.length !== vendorIds.length) {
      throw new ValidationError('One or more vendors not found');
    }

    const expedition = await db.expedition.create({
      data: {
        userId,
        name: name.trim(),
        expeditionType,
        targetDate,
        notes,
        status: 'ACTIVE',
        stops: {
          create: vendorIds.map((vendorId, index) => ({
            vendorId,
            sortOrder: index,
            isVisited: false,
          })),
        },
      },
      include: {
        stops: {
          include: {
            vendor: {
              include: {
                location: true,
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return this.serializeExpedition(expedition);
  }

  /**
   * Get user's expeditions
   */
  async getUserExpeditions(userId: string, status?: ExpeditionStatus) {
    const expeditions = await db.expedition.findMany({
      where: {
        userId,
        ...(status ? { status } : {}),
      },
      include: {
        stops: {
          include: {
            vendor: {
              include: {
                location: true,
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return expeditions.map(this.serializeExpedition);
  }

  /**
   * Get a single expedition
   */
  async getExpedition(expeditionId: string, userId: string) {
    const expedition = await db.expedition.findUnique({
      where: { id: expeditionId },
      include: {
        stops: {
          include: {
            vendor: {
              include: {
                location: true,
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!expedition) {
      throw new NotFoundError('Expedition not found');
    }

    if (expedition.userId !== userId) {
      throw new NotFoundError('Expedition not found');
    }

    return this.serializeExpedition(expedition);
  }

  /**
   * Mark a stop as visited
   */
  async markStopVisited(expeditionId: string, vendorId: string, userId: string) {
    const expedition = await db.expedition.findUnique({
      where: { id: expeditionId },
      include: { stops: true },
    });

    if (!expedition || expedition.userId !== userId) {
      throw new NotFoundError('Expedition not found');
    }

    const stop = expedition.stops.find(s => s.vendorId === vendorId);
    if (!stop) {
      throw new NotFoundError('Stop not found in expedition');
    }

    if (stop.isVisited) {
      return { alreadyVisited: true };
    }

    await db.expeditionStop.update({
      where: { id: stop.id },
      data: {
        isVisited: true,
        visitedAt: new Date(),
      },
    });

    // Check if all stops are visited
    const updatedExpedition = await db.expedition.findUnique({
      where: { id: expeditionId },
      include: { stops: true },
    });

    const allVisited = updatedExpedition?.stops.every(s => s.isVisited || s.id === stop.id);

    if (allVisited) {
      await db.expedition.update({
        where: { id: expeditionId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      // Award completion bonus
      try {
        await walletService.addTransaction(
          userId,
          100,
          'CHALLENGE_COMPLETE',
          'expedition',
          expeditionId
        );
      } catch {
        // Silently fail if already awarded
      }

      return { completed: true, pointsEarned: 100 };
    }

    return { visited: true };
  }

  /**
   * Cancel an expedition
   */
  async cancelExpedition(expeditionId: string, userId: string) {
    const expedition = await db.expedition.findUnique({
      where: { id: expeditionId },
    });

    if (!expedition || expedition.userId !== userId) {
      throw new NotFoundError('Expedition not found');
    }

    if (expedition.status !== 'ACTIVE') {
      throw new ValidationError('Only active expeditions can be cancelled');
    }

    await db.expedition.update({
      where: { id: expeditionId },
      data: { status: 'CANCELLED' },
    });

    return { cancelled: true };
  }

  private serializeExpedition(expedition: any) {
    return {
      id: expedition.id,
      userId: expedition.userId,
      name: expedition.name,
      expeditionType: expedition.expeditionType,
      notes: expedition.notes,
      targetDate: expedition.targetDate,
      status: expedition.status,
      createdAt: expedition.createdAt,
      completedAt: expedition.completedAt,
      stops: expedition.stops?.map((stop: any) => ({
        id: stop.id,
        vendorId: stop.vendorId,
        sortOrder: stop.sortOrder,
        isVisited: stop.isVisited,
        visitedAt: stop.visitedAt,
        vendor: stop.vendor ? {
          id: stop.vendor.id,
          name: stop.vendor.name,
          description: stop.vendor.description,
          priceBand: stop.vendor.priceBand,
          location: stop.vendor.location,
        } : null,
      })) || [],
      progress: {
        total: expedition.stops?.length || 0,
        visited: expedition.stops?.filter((s: any) => s.isVisited).length || 0,
      },
    };
  }
}

export const expeditionService = new ExpeditionService();
