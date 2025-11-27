import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  name: string;
  passwordHash: string;
  role: 'user' | 'admin';
  settings: {
    notifications: {
      email: boolean;
      push: boolean;
      telegram: boolean;
      sound: boolean;
    };
    theme: 'light' | 'dark' | 'auto';
    language: 'tr' | 'en';
    defaultStrategy?: string;
    riskTolerance: 'low' | 'medium' | 'high';
    priceAlerts: boolean;
    sentimentAlerts: boolean;
    signalAlerts: boolean;
  };
  createdAt: Date;
  lastLogin: Date;
}

const UserSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    settings: {
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        telegram: { type: Boolean, default: false },
        sound: { type: Boolean, default: true },
      },
      theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'dark',
      },
      language: {
        type: String,
        enum: ['tr', 'en'],
        default: 'tr',
      },
      defaultStrategy: String,
      riskTolerance: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium',
      },
      priceAlerts: { type: Boolean, default: true },
      sentimentAlerts: { type: Boolean, default: true },
      signalAlerts: { type: Boolean, default: true },
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.index({ email: 1 });

export default mongoose.model<IUser>('User', UserSchema);
