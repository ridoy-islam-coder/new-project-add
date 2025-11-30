import express from "express";

import { auth } from "../../middleware/auth.middleware";
import { addpalndatails, createsubscription, creatsubscriptionplan, getsubscriptionplan } from "./subscription.controller";





const router = express.Router();

// add-plan
router.post("/add-plan",creatsubscriptionplan)

// get-plan
router.get("/get-plan",auth,getsubscriptionplan)



// add-plan
router.post("/plan-details",auth,addpalndatails)

// add-plan
router.post("/create-subscription",auth,createsubscription)






export const subscriptionsRoutes = router;