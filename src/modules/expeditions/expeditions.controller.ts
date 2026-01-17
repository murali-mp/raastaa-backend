import { Response, NextFunction } from 'express';
import { expeditionsService } from './expeditions.service';
import { successResponse, errorResponse, notFoundResponse } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth';

export class ExpeditionsController {
  createExpedition = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const expedition = await expeditionsService.createExpedition(req.userId, req.body);
      successResponse(res, expedition, 201);
    } catch (error: any) {
      if (error.message === 'Some vendors not found') {
        errorResponse(res, error.message, 400);
        return;
      }
      next(error);
    }
  };

  getExpedition = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const expedition = await expeditionsService.getExpeditionById(
        req.params.expeditionId!,
        req.userId
      );
      if (!expedition) {
        notFoundResponse(res, 'Expedition not found');
        return;
      }
      successResponse(res, expedition);
    } catch (error: any) {
      if (error.message === 'Access denied') {
        errorResponse(res, error.message, 403);
        return;
      }
      next(error);
    }
  };

  updateExpedition = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const expedition = await expeditionsService.updateExpedition(
        req.params.expeditionId!,
        req.userId,
        req.body
      );
      successResponse(res, expedition);
    } catch (error: any) {
      if (error.message === 'Expedition not found') {
        notFoundResponse(res, error.message);
        return;
      }
      if (error.message.includes('Not authorized') || error.message.includes('Cannot edit')) {
        errorResponse(res, error.message, 403);
        return;
      }
      next(error);
    }
  };

  publishExpedition = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await expeditionsService.publishExpedition(
        req.params.expeditionId!,
        req.userId
      );
      successResponse(res, result);
    } catch (error: any) {
      if (error.message === 'Expedition not found') {
        notFoundResponse(res, error.message);
        return;
      }
      if (error.message.includes('Not authorized') || error.message.includes('Only draft')) {
        errorResponse(res, error.message, 400);
        return;
      }
      next(error);
    }
  };

  startExpedition = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await expeditionsService.startExpedition(
        req.params.expeditionId!,
        req.userId
      );
      successResponse(res, result);
    } catch (error: any) {
      if (error.message === 'Expedition not found') {
        notFoundResponse(res, error.message);
        return;
      }
      if (error.message.includes('Not authorized') || error.message.includes('Only planned')) {
        errorResponse(res, error.message, 400);
        return;
      }
      next(error);
    }
  };

  checkInVendor = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await expeditionsService.checkInVendor(
        req.params.expeditionId!,
        req.userId,
        req.body
      );
      successResponse(res, result);
    } catch (error: any) {
      if (error.message === 'Expedition not found' || error.message === 'Vendor not in this expedition') {
        notFoundResponse(res, error.message);
        return;
      }
      if (error.message.includes('not part') || error.message.includes('not in progress')) {
        errorResponse(res, error.message, 400);
        return;
      }
      next(error);
    }
  };

  skipVendor = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await expeditionsService.skipVendor(
        req.params.expeditionId!,
        req.userId,
        req.params.vendorId!
      );
      successResponse(res, result);
    } catch (error: any) {
      if (error.message === 'Expedition not found') {
        notFoundResponse(res, error.message);
        return;
      }
      if (error.message.includes('Only the expedition creator') || error.message.includes('not in progress')) {
        errorResponse(res, error.message, 403);
        return;
      }
      next(error);
    }
  };

  completeExpedition = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await expeditionsService.completeExpedition(
        req.params.expeditionId!,
        req.userId,
        req.body
      );
      successResponse(res, result);
    } catch (error: any) {
      if (error.message === 'Expedition not found') {
        notFoundResponse(res, error.message);
        return;
      }
      if (error.message.includes('Only the expedition creator') || error.message.includes('not in progress')) {
        errorResponse(res, error.message, 403);
        return;
      }
      next(error);
    }
  };

  cancelExpedition = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await expeditionsService.cancelExpedition(
        req.params.expeditionId!,
        req.userId
      );
      successResponse(res, result);
    } catch (error: any) {
      if (error.message === 'Expedition not found') {
        notFoundResponse(res, error.message);
        return;
      }
      if (error.message.includes('Only the expedition creator') || error.message.includes('cannot be cancelled')) {
        errorResponse(res, error.message, 403);
        return;
      }
      next(error);
    }
  };

  inviteParticipants = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await expeditionsService.inviteParticipants(
        req.params.expeditionId!,
        req.userId,
        req.body
      );
      successResponse(res, result);
    } catch (error: any) {
      if (error.message === 'Expedition not found') {
        notFoundResponse(res, error.message);
        return;
      }
      if (error.message.includes('Not authorized') || error.message.includes('Cannot invite') || error.message.includes('Would exceed')) {
        errorResponse(res, error.message, 400);
        return;
      }
      next(error);
    }
  };

  respondToInvite = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await expeditionsService.respondToInvite(
        req.params.expeditionId!,
        req.userId,
        req.body.action
      );
      successResponse(res, result);
    } catch (error: any) {
      if (error.message === 'Invite not found') {
        notFoundResponse(res, error.message);
        return;
      }
      if (error.message === 'Invite already responded') {
        errorResponse(res, error.message, 400);
        return;
      }
      next(error);
    }
  };

  leaveExpedition = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await expeditionsService.leaveExpedition(
        req.params.expeditionId!,
        req.userId
      );
      successResponse(res, result);
    } catch (error: any) {
      if (error.message === 'Not part of this expedition') {
        notFoundResponse(res, error.message);
        return;
      }
      if (error.message.includes('Creator cannot') || error.message.includes('Cannot leave')) {
        errorResponse(res, error.message, 400);
        return;
      }
      next(error);
    }
  };

  getUserExpeditions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await expeditionsService.getUserExpeditions(req.userId, req.query as any);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  };

  getPendingInvites = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await expeditionsService.getPendingInvites(req.userId);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  };

  discoverExpeditions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await expeditionsService.discoverExpeditions(req.userId, req.query as any);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  };

  requestJoin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await expeditionsService.requestJoin(
        req.params.expeditionId!,
        req.userId
      );
      successResponse(res, result);
    } catch (error: any) {
      if (error.message === 'Expedition not found') {
        notFoundResponse(res, error.message);
        return;
      }
      if (error.message.includes('not public') || error.message.includes('Cannot join') || error.message.includes('full')) {
        errorResponse(res, error.message, 400);
        return;
      }
      next(error);
    }
  };
}

export const expeditionsController = new ExpeditionsController();
