import { Router, type IRouter } from "express";
import healthRouter from "./health";
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

const router: IRouter = Router();

router.use(healthRouter);
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

export default router;
