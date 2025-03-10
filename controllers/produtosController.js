exports.getProdutos = (req, res) => {
    // Sua lógica para listar os produtos
    res.send('Lista de produtos');
};

exports.updateProduto = (req, res) => {
    // Sua lógica para atualizar um produto
    res.send(`Produto ${req.params.id} atualizado`);
};

exports.deleteProduto = (req, res) => {
    // Sua lógica para deletar um produto
    res.send(`Produto ${req.params.id} deletado`);
};
