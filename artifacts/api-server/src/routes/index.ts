import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import roomsRouter from "./rooms";
import messagesRouter from "./messages";
import blocksRouter from "./blocks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(roomsRouter);
router.use(messagesRouter);
router.use(blocksRouter);

export default router;
