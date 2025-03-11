const axios = require("axios");

const CRM_API_URL = "https://seu-crm.com/api"; // 🔹 Substitua pela URL real do seu CRM
const CRM_API_KEY = "SUA_CHAVE_DE_API"; // 🔹 Substitua pela chave de API real

// 🔍 1️⃣ Buscar produto no CRM pelo nome
const buscarProdutoNoCRM = async (nomeProduto) => {
    try {
        const response = await axios.get(`${CRM_API_URL}/produtos`, {
            params: { nome: nomeProduto },
            headers: { Authorization: `Bearer ${CRM_API_KEY}` }
        });

        return response.data.length > 0 ? response.data[0] : null; // Retorna o primeiro produto encontrado ou null
    } catch (error) {
        console.error(`❌ Erro ao buscar produto '${nomeProduto}':`, error.message);
        return null;
    }
};

// ✨ 2️⃣ Criar ou atualizar produto no CRM
const criarOuAtualizarProduto = async (nome, grupo, custo, margem) => {
    try {
        let produtoExistente = await buscarProdutoNoCRM(nome);

        const produtoData = {
            nome,
            grupo,
            custo,
            margem,
        };

        if (produtoExistente) {
            // Atualiza produto existente
            await axios.put(`${CRM_API_URL}/produtos/${produtoExistente.id}`, produtoData, {
                headers: { Authorization: `Bearer ${CRM_API_KEY}` }
            });

            console.log(`🔄 Produto atualizado: ${nome}`);
            return { ...produtoExistente, ...produtoData }; // Retorna os dados atualizados
        } else {
            // Cria novo produto
            const response = await axios.post(`${CRM_API_URL}/produtos`, produtoData, {
                headers: { Authorization: `Bearer ${CRM_API_KEY}` }
            });

            console.log(`✅ Produto criado: ${nome}`);
            return response.data; // Retorna os dados do novo produto
        }
    } catch (error) {
        console.error(`❌ Erro ao criar/atualizar produto '${nome}':`, error.message);
        return null;
    }
};

// 🔗 3️⃣ Criar vínculo entre produtos MACRO e MICRO
const criarVinculo = async (idMacro, idMicro) => {
    try {
        // Verificar se o vínculo já existe
        const response = await axios.get(`${CRM_API_URL}/vinculos`, {
            params: { macro_id: idMacro, micro_id: idMicro },
            headers: { Authorization: `Bearer ${CRM_API_KEY}` }
        });

        if (response.data.length > 0) {
            console.log(`⚠️ Vínculo já existente entre produtos ${idMacro} e ${idMicro}`);
            return false;
        }

        // Criar vínculo
        await axios.post(`${CRM_API_URL}/vinculos`, { macro_id: idMacro, micro_id: idMicro }, {
            headers: { Authorization: `Bearer ${CRM_API_KEY}` }
        });

        console.log(`🔗 Vínculo criado entre produtos ${idMacro} e ${idMicro}`);
        return true;
    } catch (error) {
        console.error(`❌ Erro ao criar vínculo entre produtos ${idMacro} e ${idMicro}:`, error.message);
        return false;
    }
};

module.exports = { buscarProdutoNoCRM, criarOuAtualizarProduto, criarVinculo };