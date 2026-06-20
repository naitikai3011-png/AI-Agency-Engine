import { Router, type IRouter } from "express";
import healthRouter from "./health";
import userRouter from "./user";
import gaRouter from "./ga";
import chsRouter from "./chs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(userRouter);
router.use(gaRouter);
router.use(chsRouter);

export default router;
