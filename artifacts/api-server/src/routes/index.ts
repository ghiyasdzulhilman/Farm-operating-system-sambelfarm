import { Router, type IRouter } from "express";
import healthRouter from "./health";
import notionRouter from "./notion";
import expensesRouter from "./expenses";
import harvestRouter from "./harvest";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(notionRouter);
router.use(expensesRouter);
router.use(harvestRouter);
router.use(dashboardRouter);

export default router;
