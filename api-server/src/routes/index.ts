import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tasksRouter from "./tasks";
import habitsRouter from "./habits";
import financesRouter from "./finances";
import tagsRouter from "./tags";
import statsRouter from "./stats";
import pdfRouter from "./pdf";
import problemsRouter from "./problems";
import notesRouter from "./notes";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/tasks", tasksRouter);
router.use("/habits", habitsRouter);
router.use("/finances", financesRouter);
router.use("/tags", tagsRouter);
router.use("/stats", statsRouter);
router.use("/pdf", pdfRouter);
router.use("/problems", problemsRouter);
router.use("/notes", notesRouter);

export default router;
