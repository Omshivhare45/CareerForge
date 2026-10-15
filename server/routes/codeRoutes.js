const express = require('express');
const { run, submit, execute, judge, status } = require('../controllers/codeController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/status', protect, status);
router.post('/run', protect, run);
router.post('/execute', protect, execute);
router.post('/judge', protect, judge);
router.post('/submit', protect, submit);

module.exports = router;
