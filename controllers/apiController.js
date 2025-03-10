const axios = require('axios');

async function projetos() {

    var todosProjetos = [];
    var pagina = 1;
    var totalPaginas = 1;

    try {
        do {
            const raw = JSON.stringify({
                call: "ListarProjetos",
                app_key: "389964610035",
                app_secret: "562a3701809cbb9900f488f6d2eb0115",
                param: [
                    {
                        "pagina": pagina,
                        "registros_por_pagina": 50,
                        "apenas_importado_api": "N"
                    }
                ]
            });
            
            const response = await axios.post('https://app.omie.com.br/api/v1/geral/projetos/', raw, {
                headers: {
                    "omie_app_key": "389964610035",
                    "omie_app_secret": "562a3701809cbb9900f488f6d2eb0115",
                    "omie_call": "ListarProjetos",
                    "Content-Type": "application/json"
                }
            });
            
            if(totalPaginas == 1) { 
                totalPaginas = response.data.total_de_paginas;
            }

            todosProjetos = todosProjetos.concat(response.data.cadastro);
            pagina++;
            
        } while (pagina <= totalPaginas);

        return todosProjetos.filter(projeto => projeto.inativo == 'N').map(projeto => ({ id: projeto.codigo, nome: projeto.nome }));

    } catch (error) {
        console.error(error.message)
    }

}

exports.getProjetos = async (req, res) => {
    return res.json(await projetos())
}