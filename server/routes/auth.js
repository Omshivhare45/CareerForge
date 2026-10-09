
const express = require('express');
const router = express.Router();

const {
  googleLogin,
  getMe,
  updateProfile,
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');

router.post('/google', googleLogin);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

module.exports = router;
