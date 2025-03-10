function primeirasMaiusculas(nomeProduto) {
    const excecoes = ["da", "de", "para", "com", "os", "e", "a", "do", "dos", "das", "no", "na", "nos", "nas", "em", "por", "ou", "um", "uma"];
    
    return nomeProduto
        .split(' ')
        .map(palavra => {
            const palavraMinuscula = palavra.toLowerCase();
            if (excecoes.includes(palavraMinuscula)) {
                return palavraMinuscula;
            } else {
                return palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase();
            }
        })
        .join(' ');
}

module.exports = {
    primeirasMaiusculas
};