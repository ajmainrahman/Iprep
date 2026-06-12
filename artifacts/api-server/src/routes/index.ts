import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import settingsRouter from "./settings";
import scoresRouter from "./scores";
import studySessionsRouter from "./study-sessions";
import practiceLogsRouter from "./practice-logs";
import vocabRouter from "./vocab";
import affirmationsRouter from "./affirmations";
import higherStudyApplicationsRouter from "./higher-study-applications";
import otherTestScoresRouter from "./other-test-scores";
import scholarshipsRouter from "./scholarships";
import checklistTemplatesRouter from "./checklist-templates";
import planningNotesRouter from "./planning-notes";
import journeyPlannerRouter from "./journey-planner";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(settingsRouter);
router.use(scoresRouter);
router.use(studySessionsRouter);
router.use(practiceLogsRouter);
router.use(vocabRouter);
router.use(affirmationsRouter);
router.use(higherStudyApplicationsRouter);
router.use(otherTestScoresRouter);
router.use(scholarshipsRouter);
router.use(checklistTemplatesRouter);
router.use(planningNotesRouter);
router.use(journeyPlannerRouter);

export default router;
