import type { Request, Response } from "express"
import Stripe from "stripe"
import SubscriptionTier from "./SubscriptionTier"
import Subscription from "./Subscription"
import Payment from "./Payment"
import mongoose from "mongoose";

interface AuthenticatedRequest extends Request {
  user?: any
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "")

// ===== TIER MANAGEMENT =====

export const createTier = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, displayName, pricePerHour, monthlyCapPrice, storage, ram, vcpu, description } = req.body

    const existingTier = await SubscriptionTier.findOne({ name: name.toLowerCase() })
    if (existingTier) {
      res.status(400).json({ error: "Tier with this name already exists" })
      return
    }

    const tier = new SubscriptionTier({
      name: name.toLowerCase(),
      displayName,
      pricePerHour,
      monthlyCapPrice,
      storage,
      ram,
      vcpu,
      description,
      isActive: true,
    })

    await tier.save()
    res.status(201).json({ message: "Tier created successfully", tier })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create tier" })
  }
}

export const getAllTiers = async (req: Request, res: Response): Promise<void> => {
  try {
    const tiers = await SubscriptionTier.find({ isActive: true }).sort({ pricePerHour: 1 })
    res.status(200).json({ tiers })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch tiers" })
  }
}

export const getTierById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tierId } = req.params
    const tier = await SubscriptionTier.findById(tierId)

    if (!tier) {
      res.status(404).json({ error: "Tier not found" })
      return
    }

    res.status(200).json({ tier })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch tier" })
  }
}

export const updateTier = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tierId } = req.params
    const updates = req.body

    const tier = await SubscriptionTier.findByIdAndUpdate(tierId, updates, {
      new: true,
      runValidators: true,
    })

    if (!tier) {
      res.status(404).json({ error: "Tier not found" })
      return
    }

    res.status(200).json({ message: "Tier updated successfully", tier })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to update tier" })
  }
}

// ===== SUBSCRIPTION MANAGEMENT =====




export const createCheckoutSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tierId } = req.body;

    console.log("this is User:", req.user)
    const userId = req.user?.id; // Middleware থেকে আসা user id
     console.log("this is User ID:", userId)
    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    const tier = await SubscriptionTier.findById(new mongoose.Types.ObjectId(tierId));
    if (!tier) {
      res.status(404).json({ error: "Tier not found" });
      return;
    }
    console.log("this is Tier:", tier)

    const existingSubscription = await Subscription.findOne({
      userId,
      status: { $in: ["active", "past_due"] },
    });

    if (existingSubscription) {
      res.status(400).json({ error: "User already has an active subscription" });
      return;
    }

    // Stripe customer
    const customers = await stripe.customers.list({
      email: req.user?.email,
      limit: 1,
    });

    let stripeCustomerId = customers.data[0]?.id;

    if (!stripeCustomerId) {
      const newCustomer = await stripe.customers.create({
        email: req.user?.email,
        metadata: { userId: userId.toString() },
      });
      stripeCustomerId = newCustomer.id;
    }

    const monthlyPrice = Math.round(tier.pricePerHour * 730 * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer: stripeCustomerId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: tier.displayName,
              description: tier.description,
            },
            unit_amount: monthlyPrice,
            recurring: { interval: "month", interval_count: 1 },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.STRIPE_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.STRIPE_CANCEL_URL}`,
      metadata: {
        userId: userId.toString(),
        tierId: tierId,
        tierName: tier.name,
      },
    });

    res.status(200).json({ sessionId: session.id, sessionUrl: session.url });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create checkout session" });
  }
};






























































































export const getUserSubscription = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id

    if (!userId) {
      res.status(401).json({ error: "User not authenticated" })
      return
    }

    const subscription = await Subscription.findOne({ userId }).populate("tierId").sort({ createdAt: -1 })

    if (!subscription) {
      res.status(404).json({ error: "No subscription found" })
      return
    }

    res.status(200).json({ subscription })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch subscription" })
  }
}

export const cancelSubscription = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id

    if (!userId) {
      res.status(401).json({ error: "User not authenticated" })
      return
    }

    const subscription = await Subscription.findOne({
      userId,
      status: { $in: ["active", "past_due"] },
    })

    if (!subscription) {
      res.status(404).json({ error: "Active subscription not found" })
      return
    }

    // Cancel on Stripe
    if (subscription.stripeSubscriptionId) {
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId)
    }

    // Update in database
    subscription.status = "canceled"
    subscription.canceledAt = new Date()
    await subscription.save()

    res.status(200).json({ message: "Subscription canceled successfully", subscription })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to cancel subscription" })
  }
}

// ===== WEBHOOK HANDLER =====

export const handleStripeWebhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers["stripe-signature"] as string
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ""

  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
  } catch (error) {
    res.status(400).json({ error: `Webhook Error: ${error instanceof Error ? error.message : "Unknown error"}` })
    return
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        const checkoutSession = event.data.object as Stripe.Checkout.Session
        await handleCheckoutSessionCompleted(checkoutSession)
        break

      case "customer.subscription.updated":
        const updatedSubscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(updatedSubscription)
        break

      case "customer.subscription.deleted":
        const deletedSubscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(deletedSubscription)
        break

      case "invoice.payment_succeeded":
        const paidInvoice = event.data.object as Stripe.Invoice
        await handleInvoicePaid(paidInvoice)
        break

      case "invoice.payment_failed":
        const failedInvoice = event.data.object as Stripe.Invoice
        await handleInvoiceFailed(failedInvoice)
        break
    }

    res.status(200).json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    res.status(500).json({ error: "Webhook processing failed" })
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const { userId, tierId, tierName } = session.metadata as any

  const subscription = new Subscription({
    userId,
    tierId,
    tierName,
    stripeCustomerId: session.customer,
    stripeSubscriptionId: session.subscription,
    status: "active",
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  })

  await subscription.save()
}

async function handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription): Promise<void> {
  const subscription = await Subscription.findOne({
    stripeSubscriptionId: stripeSubscription.id,
  })

  if (subscription) {
    subscription.status = stripeSubscription.status as any
    subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000)
    subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000)
    await subscription.save()
  }
}

async function handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription): Promise<void> {
  const subscription = await Subscription.findOne({
    stripeSubscriptionId: stripeSubscription.id,
  })

  if (subscription) {
    subscription.status = "canceled"
    subscription.canceledAt = new Date()
    await subscription.save()
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const subscription = await Subscription.findOne({
    stripeSubscriptionId: invoice.subscription,
  })

  if (subscription && invoice.payment_intent) {
    const payment = new Payment({
      userId: subscription.userId,
      subscriptionId: subscription._id,
      stripePaymentIntentId: invoice.payment_intent as string,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: "succeeded",
      invoiceUrl: invoice.hosted_invoice_url,
    })

    await payment.save()
  }
}

async function handleInvoiceFailed(invoice: Stripe.Invoice): Promise<void> {
  const subscription = await Subscription.findOne({
    stripeSubscriptionId: invoice.subscription,
  })

  if (subscription) {
    subscription.status = "past_due"
    await subscription.save()
  }
}

// ===== INITIALIZE DEFAULT TIERS =====

export const initializeDefaultTiers = async (req: Request, res: Response): Promise<void> => {
  try {
    const defaultTiers = [
      {
        name: "free",
        displayName: "Free",
        pricePerHour: 0,
        storage: "512 MB",
        ram: "Shared",
        vcpu: "Shared",
        description: "For learning and exploring MongoDB in a cloud environment.",
      },
      {
        name: "flex",
        displayName: "Flex",
        pricePerHour: 0.011,
        monthlyCapPrice: 30,
        storage: "Up to 5GB",
        ram: "Shared",
        vcpu: "Shared",
        description: "For application development and testing: resources and costs scale to your needs.",
      },
      {
        name: "dedicated",
        displayName: "Dedicated",
        pricePerHour: 0.08,
        storage: "10 GB",
        ram: "2 GB",
        vcpu: "2vCPUs",
        description: "For production applications with sophisticated workload requirements.",
      },
    ]

    // Clear existing tiers
    await SubscriptionTier.deleteMany({})

    // Insert default tiers
    const createdTiers = await SubscriptionTier.insertMany(defaultTiers)

    res.status(201).json({
      message: "Default tiers initialized successfully",
      tiers: createdTiers,
    })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to initialize tiers" })
  }
}
