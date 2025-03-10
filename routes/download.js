const express = require('express');
const router = express.Router();
const downloadController = require('../controllers/downloadController');

router.get('/download', downloadController.getDownload);

module.exports = router;