import express from 'express';
// import { createPostgresTransaction } from '../controllers/postgresController.js';
import { missionActivityController } from '../controllers/missionActivityController.js';
import surveySqlController from '../controllers/surveyController.js';

const router = express.Router();

router.post('/mission-activity-sql', missionActivityController);
router.post('/survey-sql', surveySqlController);

// router.post('/postgres/transaction', createPostgresTransaction);

export default router;
