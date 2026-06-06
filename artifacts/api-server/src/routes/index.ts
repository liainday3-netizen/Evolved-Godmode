import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import codegenRouter from "./codegen";
import stripeRouter from "./stripe";
import communityRouter from "./community";
import conversationsRouter from "./conversations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatRouter);
router.use(codegenRouter);
router.use(stripeRouter);
router.use(communityRouter);
router.use(conversationsRouter);

export default router;
