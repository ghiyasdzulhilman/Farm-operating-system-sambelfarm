import { Router, type IRouter } from "express";
import healthRouter from "./health";
import expensesRouter from "./expenses";
import harvestRouter from "./harvest";
import perawatanRoutes from "./perawatan";
import inspeksiRoutes from "./inspeksi";
import operasionalRoutes from "./operasional";
import dashboardRouter from "./dashboard";
import produkRoutes from "./produk";
import financeRouter from "./finance"; 

const router: IRouter = Router();

router.use(healthRouter);
router.use(expensesRouter);
router.use(harvestRouter);
router.use(perawatanRoutes);
router.use(inspeksiRoutes);
router.use(operasionalRoutes);
router.use(dashboardRouter);
router.use(produkRoutes);
router.use("/finance", financeRouter); 

export default router;
