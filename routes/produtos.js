const express = require('express');
const router = express.Router();
const produtosController = require('../controllers/produtosController');

router.get('/produtos', produtosController.getProdutos);
router.put('/produtos/:id', produtosController.updateProduto);
router.delete('/produtos/:id', produtosController.deleteProduto);

module.exports = router;