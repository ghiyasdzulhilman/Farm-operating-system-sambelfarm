import { Router, type IRouter } from "express";
import healthRouter from "./health";
import notionRouter from "./notion";
import expensesRouter from "./expenses";
import harvestRouter from "./harvest";
import perawatanRoutes from "./perawatan";
import inspeksiRoutes from "./inspeksi";
import mappingsRouter from "./mappings";
import dashboardRouter from "./dashboard";
import stagingRouter from "./staging";

const router: IRouter = Router();

router.use(healthRouter);
router.use(notionRouter);
router.use(expensesRouter);
router.use(harvestRouter);
router.use(perawatanRoutes);
router.use(inspeksiRoutes);
router.use(mappingsRouter);
router.use(dashboardRouter);
router.use(stagingRouter);

export default router;
