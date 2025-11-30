import express from "express";

import { auth } from "../../middleware/auth.middleware";

import * as subscriptionController from "./subscription.controller"




const router = express.Router();

// ===== TIER MANAGEMENT ROUTES =====
router.post("/tiers", subscriptionController.createTier)
router.get("/tiers", subscriptionController.getAllTiers)
router.get("/tiers/:tierId", subscriptionController.getTierById)
router.patch("/tiers/:tierId", subscriptionController.updateTier)
router.post("/tiers/initialize", subscriptionController.initializeDefaultTiers)

// ===== SUBSCRIPTION ROUTES =====
router.post("/checkout", auth, subscriptionController.createCheckoutSession)
router.get("/my-subscription", auth, subscriptionController.getUserSubscription)
router.post("/cancel", auth, subscriptionController.cancelSubscription)

// ===== WEBHOOK ROUTE =====
router.post("/webhook", express.raw({ type: "application/json" }), subscriptionController.handleStripeWebhook)






export const subscriptionsRoutes = router;