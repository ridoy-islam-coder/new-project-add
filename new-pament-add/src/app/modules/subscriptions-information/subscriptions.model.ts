import { Schema, model } from "mongoose";

export interface ICard {
  userId: string;
  stripePaymentMethodId: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

const cardSchema = new Schema<ICard>({
  userId: { type: String, required: true },
  stripePaymentMethodId: { type: String, required: true },
  brand: { type: String, required: true },
  last4: { type: String, required: true },
  expMonth: { type: Number, required: true },
  expYear: { type: Number, required: true },
}, { timestamps: true });














export const Card = model<ICard>("Card", cardSchema);