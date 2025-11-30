import mongoose, { Schema, type Document } from "mongoose"

export interface IPayment extends Document {
  userId: mongoose.Types.ObjectId
  subscriptionId: mongoose.Types.ObjectId
  stripePaymentIntentId: string
  amount: number
  currency: string
  status: "succeeded" | "processing" | "requires_action" | "failed"
  paymentMethod: string
  invoiceUrl?: string
  createdAt: Date
  updatedAt: Date
}

const PaymentSchema = new Schema<IPayment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
    },
    stripePaymentIntentId: {
      type: String,
      required: true,
      unique: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "usd",
    },
    status: {
      type: String,
      enum: ["succeeded", "processing", "requires_action", "failed"],
      default: "processing",
    },
    paymentMethod: {
      type: String,
    },
    invoiceUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
)

export default mongoose.model<IPayment>("Payment", PaymentSchema)
