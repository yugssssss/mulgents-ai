import express from "express";

import {
    deductCredits,
 login,
 logout,
 updatePlan
}
from "../controllers/auth.controllers.js";

const router =
express.Router();

router.post("/login",login);
router.get("/logout",logout);
router.patch(
    "/internal/update-plan",
    updatePlan
);
router.patch(

"/internal/deduct-credits",

deductCredits

);


export default router;