import express from 'express';
// import { createPostgresTransaction } from '../controllers/postgresController.js';
import { missionActivityController } from '../controllers/missionActivityController.js';
import surveySqlController from '../controllers/surveyController.js';
import translationController from '../controllers/translationController.js';
import multer from 'multer';

const router = express.Router();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

router.post('/mission-activity-sql', missionActivityController);
router.post('/survey-sql', surveySqlController);
router.post('/translation', upload.single('file'), translationController);

// router.post('/postgres/transaction', createPostgresTransaction);

export default router;
