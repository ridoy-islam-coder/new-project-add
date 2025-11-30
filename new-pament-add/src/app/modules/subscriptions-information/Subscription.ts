import mongoose, { Schema, type Document } from "mongoose"

export interface ISubscription extends Document {
  userId: mongoose.Types.ObjectId
  tierId: mongoose.Types.ObjectId
  tierName: string
  stripeCustomerId: string
  stripeSubscriptionId?: string
  status: "active" | "canceled" | "paused" | "past_due" | "free"
  currentPeriodStart: Date
  currentPeriodEnd: Date
  canceledAt?: Date
  totalUsageHours: number
  totalCost: number
  createdAt: Date
  updatedAt: Date
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tierId: {
      type: Schema.Types.ObjectId,
      ref: "SubscriptionTier",
      required: true,
    },
    tierName: {
      type: String,
      required: true,
    },
    stripeCustomerId: {
      type: String,
      required: true,
    },
    stripeSubscriptionId: {
      type: String,
    },
    status: {
      type: String,
      enum: ["active", "canceled", "paused", "past_due", "free"],
      default: "free",
    },
    currentPeriodStart: {
      type: Date,
      default: Date.now,
    },
    currentPeriodEnd: {
      type: Date,
    },
    canceledAt: {
      type: Date,
    },
    totalUsageHours: {
      type: Number,
      default: 0,
    },
    totalCost: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
)

export default mongoose.model<ISubscription>("Subscription", SubscriptionSchema)
