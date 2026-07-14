import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import jobsRouter from "./jobs";
import applicationsRouter from "./applications";
import workshopsRouter from "./workshops";
import certificatesRouter from "./certificates";
import tracksRouter from "./tracks";
import usersRouter from "./users";
import statsRouter from "./stats";
import leaderboardRouter from "./leaderboard";
import mockInterviewRouter from "./mock_interview";
import consultationsRouter from "./consultations";
import pointsRouter from "./points";
import uploadRouter from "./upload";
import videoStreamRouter from "./video-stream";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(jobsRouter);
router.use(applicationsRouter);
router.use(workshopsRouter);
router.use(certificatesRouter);
router.use(tracksRouter);
router.use(usersRouter);
router.use(statsRouter);
router.use(leaderboardRouter);
router.use(mockInterviewRouter);
router.use(consultationsRouter);
router.use(pointsRouter);
router.use(uploadRouter);
router.use(videoStreamRouter);

export default router;
