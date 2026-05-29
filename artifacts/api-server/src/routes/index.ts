import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import codegenRouter from "./codegen";
import stripeRouter from "./stripe";
import communityRouter from "./community";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatRouter);
router.use(codegenRouter);
router.use(stripeRouter);
router.use(communityRouter);

export default router;
