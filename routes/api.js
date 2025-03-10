const express = require('express');
const cors = require('cors');
const router = express.Router();
const apiController = require('../controllers/apiController');

router.use(cors());
router.get('/api/projetos', apiController.getProjetos);

module.exports = router;