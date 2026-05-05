import { Router, type IRouter } from "express";
import healthRouter from "./health";
import notionRouter from "./notion";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(notionRouter);
router.use(dashboardRouter);

export default router;
