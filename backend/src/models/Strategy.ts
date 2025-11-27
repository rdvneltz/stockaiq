import mongoose, { Schema, Document } from 'mongoose';

interface ICriterionConfig {
  field: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'between';
  value: number | [number, number];
  enabled: boolean;
  weight: number;
}

export interface IStrategy extends Document {
  name: string;
  description?: string;
  userId: string;
  fundamental: {
    enabled: boolean;
    criteria: ICriterionConfig[];
    logic: 'AND' | 'OR';
  };
  technical: {
    enabled: boolean;
    criteria: ICriterionConfig[];
    logic: 'AND' | 'OR';
  };
  sentiment: {
    enabled: boolean;
    minScore: number;
    maxScore: number;
  };
  overallLogic: 'AND' | 'OR';
  buyThreshold: number;
  sellThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}

const CriterionConfigSchema = new Schema({
  field: { type: String, required: true },
  operator: {
    type: String,
    required: true,
    enum: ['gt', 'gte', 'lt', 'lte', 'eq', 'between'],
  },
  value: { type: Schema.Types.Mixed, required: true },
  enabled: { type: Boolean, default: true },
  weight: { type: Number, default: 1, min: 0, max: 10 },
});

const StrategySchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    userId: {
      type: String,
      required: true,
    },
    fundamental: {
      enabled: { type: Boolean, default: true },
      criteria: [CriterionConfigSchema],
      logic: {
        type: String,
        enum: ['AND', 'OR'],
        default: 'AND',
      },
    },
    technical: {
      enabled: { type: Boolean, default: true },
      criteria: [CriterionConfigSchema],
      logic: {
        type: String,
        enum: ['AND', 'OR'],
        default: 'AND',
      },
    },
    sentiment: {
      enabled: { type: Boolean, default: false },
      minScore: { type: Number, default: -100 },
      maxScore: { type: Number, default: 100 },
    },
    overallLogic: {
      type: String,
      enum: ['AND', 'OR'],
      default: 'AND',
    },
    buyThreshold: { type: Number, default: 70, min: 0, max: 100 },
    sellThreshold: { type: Number, default: 30, min: 0, max: 100 },
  },
  {
    timestamps: true,
  }
);

StrategySchema.index({ userId: 1 });

export default mongoose.model<IStrategy>('Strategy', StrategySchema);
