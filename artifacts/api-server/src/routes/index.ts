import { Router, type IRouter } from "express";
import healthRouter from "./health";
import userRouter from "./user";
import gaRouter from "./ga";
import chsRouter from "./chs";
import creativeLaborRouter from "./creativeLabor";
import gatewayRouter from "./gateway";

const router: IRouter = Router();

router.use(healthRouter);
router.use(userRouter);
router.use(gaRouter);
router.use(chsRouter);
router.use(creativeLaborRouter);
router.use(gatewayRouter);

export default router;
