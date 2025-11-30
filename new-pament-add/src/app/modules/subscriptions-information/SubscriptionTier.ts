import mongoose, { Schema, type Document } from "mongoose"

export interface ISubscriptionTier extends Document {
  name: string
  displayName: string
  pricePerHour: number
  monthlyCapPrice?: number
  storage: string
  ram: string
  vcpu: string
  description: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const SubscriptionTierSchema = new Schema<ISubscriptionTier>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    pricePerHour: {
      type: Number,
      required: true,
      min: 0,
    },
    monthlyCapPrice: {
      type: Number,
      default: null,
    },
    storage: {
      type: String,
      required: true,
    },
    ram: {
      type: String,
      required: true,
    },
    vcpu: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
)

export default mongoose.model<ISubscriptionTier>("SubscriptionTier", SubscriptionTierSchema)
