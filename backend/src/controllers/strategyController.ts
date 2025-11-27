import { Response, NextFunction } from 'express';
import { AuthRequest } from '../utils/auth';
import Strategy from '../models/Strategy';

export const getStrategies = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const strategies = await Strategy.find({ userId: req.user!.userId });
    res.json({ success: true, data: strategies });
  } catch (error) {
    next(error);
  }
};

export const createStrategy = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const strategy = await Strategy.create({
      ...req.body,
      userId: req.user!.userId,
    });
    res.status(201).json({ success: true, data: strategy });
  } catch (error) {
    next(error);
  }
};

export const updateStrategy = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const strategy = await Strategy.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.userId },
      req.body,
      { new: true }
    );
    res.json({ success: true, data: strategy });
  } catch (error) {
    next(error);
  }
};

export const deleteStrategy = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await Strategy.findOneAndDelete({ _id: req.params.id, userId: req.user!.userId });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
