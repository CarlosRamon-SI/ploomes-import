require('dotenv').config();
const { primeirasMaiusculas } = require('../utils/utils');
const { sendUpdate, startLoader, stopLoader, erase } = require('../services/socket');
const ExcelJS = require('exceljs');
const axios = require('axios');
var memoriaMacro = {};

const codigo            = process.env.PRODUTO_CODIGO_KEY;
const margem            = process.env.PRODUTO_MARGEM_KEY;
const custoUnitario     = process.env.PRODUTO_CUSTOUNITARIO_KEY;
const especificacoes    = process.env.PRODUTO_ESPECIFICACOES_KEY;
const listaMacro        = 1003435;

const checaVinculo = async (macroId, microId, req) => {
    const confereVinculo = {
        method: 'get',
        url: `https://public-api2.ploomes.com/Products@Parts?$filter=ProductId+eq+${macroId}+and+ProductPartId+eq+${microId}`, //ProductPartId+eq+{{ProductPartId}}+and+ProductId+eq+{{ProductId}}
        headers: {
            'Content-Type': 'application/json',
            'User-Key': `${process.env.TOKEN}`
        }
    };

    try {
        const response = await axios(confereVinculo);

        if(response.data.value.length > 0) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        sendUpdate(`Falha ao verificar Vinculo: ${error.message}`, req);
        console.error(error.message);
    }
};

const criaVinculo = async (macroId, microId, req) => {
    const partes = {
        "ProductId": macroId,
        "ProductPartId": microId
    };
    
    const vinculo = {
        method: 'post',
        url: `https://public-api2.ploomes.com/Products@Parts`,
        headers: {
            'Content-Type': 'application/json',
            'User-Key': `${process.env.TOKEN}`
        },
        data: partes
    };
    
    try {
        await axios(vinculo);
        sendUpdate(`Vinculo bem sucedido`, req);
    } catch (error) {
        sendUpdate(`Erro ao criar vinculo - ${error.message}`, req);
    }
}

const vinculo = async (macroId, microId, req) => {
    
    const existeVinculo = await checaVinculo(macroId, microId, req);
    
    if (!existeVinculo) {
        await criaVinculo(macroId, microId, req);
    }
};

const criarProdutoMacro = async (produtoMacro, req) => {
    const macro = {
        "Name": `${produtoMacro.newName}`,
        "GroupId": produtoMacro.groupId,
        "CurrencyId": produtoMacro.moeda,
        "Lists": [
            {
                "ListId": listaMacro
            }
        ]
    };

    const cadastroMacro = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `https://public-api2.ploomes.com/Products`,
        headers: {
            'Content-Type': 'application/json',
            'User-Key': `${process.env.TOKEN}`
        },
        data: macro
    };

    try {
        const responseMacro = await axios(cadastroMacro);
        sendUpdate(`Produto Macro criado`, req);
        const macroData = responseMacro.data.value[0]
        return { id: macroData.Id, name: macroData.Name};
    } catch (error) {
        sendUpdate(`Falha ao criar produto Macro: ${error.message}`, req);
    }
}

const criarProdutoMicro = async (produtoMicro, req) => {
    const micro = {
        "Name": `${produtoMicro.newName}`,
        "GroupId": produtoMicro.groupId,
        "Code": `${produtoMicro.codigo}`,
        "CurrencyId": produtoMicro.moeda,
        "OtherProperties": [
            {
                "FieldKey": `${codigo}`,
                "StringValue": produtoMicro.codigo
            },
            {
                "FieldKey": `${margem}`,
                "DecimalValue": produtoMicro.margem
            },
            {
                "FieldKey": `${especificacoes}`,
                "BigStringValue": produtoMicro.especificacoes
            },
            {
                "FieldKey": `${custoUnitario}`,
                "DecimalValue": produtoMicro.custoUnitario
            }
        ]
    };

    const cadastroMicro = {
        method: `post`,
        url: `https://public-api2.ploomes.com/Products`,
        headers: {
            'Content-Type': 'application/json',
            'User-Key': `${process.env.TOKEN}`
        },
        data: micro
    };

    try {
        const responseMicro = await axios(cadastroMicro);
        sendUpdate(`Produto Micro criado`, req);
        return responseMicro.data.value[0].Id;
    } catch (error) {
        sendUpdate(`Falha ao criar produto Micro: ${error.message}`, req);
    }
}

const fetchProduto = async (row) => {
    const produtoMacro = {};
    const produtoMicro = {};
    let codigoAtual;
    let codigoNovo;

    // LENDO TODOS OS DADOS    
    produtoMacro.id                 = row.getCell(3).result; // COLUNA: 3
    produtoMacro.newName            = row.getCell(8).value; // COLUNA: 8
    if (row.getCell(5).result) {
        produtoMacro.att            = row.getCell(5).result.split(',').shift(); // COLUNA: 5
    }

    if(produtoMacro.id || produtoMacro.newName) {
        produtoMacro.groupId            = row.getCell(1).result; // COLUNA: 1

        if(typeof row.getCell(7).value === 'string') { // COLUNA: 7
            produtoMacro.name               = row.getCell(7).value; // COLUNA: 7
        } else {
            produtoMacro.name               = row.getCell(7).result; // COLUNA: 7
        }

        if(typeof row.getCell(6).value === 'string') {
            row.getCell(6).value == 'R$' ? produtoMacro.moeda = 1: produtoMacro.moeda = 2;
        } else {
            row.getCell(6).result == 'R$' ? produtoMacro.moeda = 1: produtoMacro.moeda = 2;
        }
    }
    
    produtoMicro.id                 = row.getCell(4).result; // COLUNA: 4
    produtoMicro.newName            = row.getCell(13).value; // COLUNA: 13
    if (row.getCell(5).result) {
        produtoMicro.att            = row.getCell(5).result.split(',').pop(); // COLUNA: 5
        
    }

    if(produtoMicro.id || produtoMicro.newName) {
        produtoMicro.groupId            = row.getCell(2).result; // COLUNA: 2
        
        if(typeof row.getCell(10).value === 'string' || typeof row.getCell(10).value === 'number') {
            codigoAtual             = row.getCell(10).value; // COLUNA: 10
        } else {
            codigoAtual             = row.getCell(10).result; // COLUNA: 10
        }
        
        if(typeof row.getCell(11).value === 'string') { // COLUNA: 11
            produtoMicro.name               = row.getCell(11).value; // COLUNA: 11
        } else {
            produtoMicro.name               = row.getCell(11).result; // COLUNA: 11
        }

        if(typeof row.getCell(12).value === 'string' || typeof row.getCell(12).value === 'number') {
            codigoNovo             = row.getCell(12).value;
        } else {
            codigoNovo             = row.getCell(12).result;
        }

        if(codigoNovo == codigoAtual) {
            if(!codigoAtual) {
                produtoMicro.codigo = "";
            } else {
                produtoMicro.codigo = codigoAtual;
            }
        } else {
            if(!codigoNovo) {
                produtoMicro.codigo = "";
            } else {
                produtoMicro.codigo = codigoNovo;
            }
        }
        
        if(typeof row.getCell(14).value === 'number') {
            produtoMicro.custoUnitario      = row.getCell(14).value.toFixed(2); // COLUNA: 14
        } else {
            // produtoMicro.custoUnitario      = row.getCell(14).result.toFixed(2); // COLUNA: 14
            produtoMicro.custoUnitario      = 0;
        }

        if(typeof row.getCell(15).value === 'number') {
            produtoMicro.margem             = row.getCell(15).value.toFixed(2); // COLUNA: 13
        } else {
            produtoMicro.margem             = row.getCell(15).result.toFixed(2); // COLUNA: 13
        }
        
        if(typeof row.getCell(17).value === 'string') {
            produtoMicro.especificacoes     = row.getCell(17).value; // COLUNA: 16    
        } else {   
            produtoMicro.especificacoes     = "";
        }
    }

    return { produtoMacro, produtoMicro }
};

const processoMacro = async (produtoMacro, req) => {
    try {
        //caso exista um novo nome e não exista uma id
        if(produtoMacro.newName && !produtoMacro.id) {
            if(memoriaMacro.name !== produtoMacro.newName) {
                sendUpdate('Criando novo produto Macro', req);
                memoriaMacro = await criarProdutoMacro(produtoMacro, req);
            }
            return memoriaMacro.id;
        }

        //caso exista um novo nome e uma id OU a coluna de atualização esteja como 'VERDADEIRO' e não haja um novo nome
        if( (produtoMacro.newName && produtoMacro.id) || (produtoMacro.att == 'VERDADEIRO' && !produtoMacro.newName) ) {
            sendUpdate('Atualizando produto Macro', req);
            if(!produtoMacro.newName) {
                produtoMacro.newName = produtoMacro.name.split(' || ').pop();
            }
            memoriaMacro.id = await updateMacro(produtoMacro, req);
            return;
        }

        //para todo caso, é registrado em memória a id do produto macro
        memoriaMacro.id = produtoMacro.id;
    } catch (error) {
        sendUpdate(`Falha ao operar produto Macro: ${error.message}`, req);
        console.error(error);
    }
};

const processoMicro = async (produtoMicro, req) => {
    try {
        if(produtoMicro.newName && !produtoMicro.id) {
            sendUpdate('Criando novo produto Micro', req);
            return await criarProdutoMicro(produtoMicro, req);
        }
        if( (produtoMicro.newName && produtoMicro.id) || (produtoMicro.att == 'VERDADEIRO' && !produtoMicro.newName) ) {
            sendUpdate('Atualizando produto Micro', req);
            if(!produtoMicro.newName) {
                produtoMicro.newName = produtoMicro.name.split(' || ').pop();
            }
            return await updateMicro(produtoMicro, req);
        }
        return produtoMicro.id
    } catch (error) {
        sendUpdate(`Falha ao operar produto Macro: ${error.message}`, req);
        console.error(error);
    }
}

const updateMacro = async (produtoMacro, req) => {
    const macro = {
        "Name": `${produtoMacro.newName}`,
        "GroupId": produtoMacro.groupId,
        "CurrencyId": produtoMacro.moeda,
        "Lists": [
            {
                "ListId": listaMacro
            }
        ]
    };

    const atualizaMacro = {
        method: 'patch',
        url: `https://public-api2.ploomes.com/Products(${produtoMacro.id})`,
        headers: {
            'Content-Type': 'application/json',
            'User-Key': `${process.env.TOKEN}`
        },
        data: macro
    };

    try {
        const responseMacro = await axios(atualizaMacro);
        sendUpdate(`Produto Macro atualizado`, req);
        return responseMacro.data.value[0].Id;
    } catch (error) {
        sendUpdate(`Falha ao criar produto Macro: ${error.message}`, req);
    }
}

const updateMicro = async (produtoMicro, req) => {

    const propriedades = [
        { FieldKey: codigo, StringValue: produtoMicro.codigo },
        { FieldKey: margem, DecimalValue: produtoMicro.margem },
        { FieldKey: especificacoes, BigStringValue: produtoMicro.especificacoes },
        { FieldKey: custoUnitario, DecimalValue: produtoMicro.custoUnitario }
    ];

    const OtherProperties = propriedades.filter(prop => {
        const value = Object.values(prop)[1]; // Pega o valor (StringValue, DecimalValue, BigStringValue)
        return value !== null && value !== undefined && value !== '';
    });

    const micro = {
        "Name": `${produtoMicro.newName}`,
        "GroupId": produtoMicro.groupId,
        "Code": `${produtoMicro.codigo}`,
        "CurrencyId": produtoMicro.moeda,
        "OtherProperties": OtherProperties
    };

    const cadastroMicro = {
        method: `patch`,
        url: `https://public-api2.ploomes.com/Products(${produtoMicro.id})?$expand=OtherProperties`,
        headers: {
            'Content-Type': 'application/json',
            'User-Key': `${process.env.TOKEN}`
        },
        data: micro
    };

    try {
        const responseMicro = await axios(cadastroMicro);
        sendUpdate(`Produto Micro Atualizado`, req);
        return responseMicro.data.value[0].Id;
    } catch (error) {
        sendUpdate(`Falha ao atualizar produto Micro: ${error.message}`, req);
    }
}

exports.uploadProducts = async (req, res) => {
    
    startLoader();
    await erase();
    const fileName = req.file.path;
    
    sendUpdate('Iniciando processamento...', req);
    
    const wb = new ExcelJS.Workbook();
    wb.xlsx.readFile(fileName)
        .then(async () => {
            
            const produtos      = wb.getWorksheet('PRODUTOS');
            const startRow      = 3;
            const endRow        = produtos.rowCount;
            let rows = [];
                
            let plural = "";
            
            for (let rowNumber = startRow; rowNumber <= endRow; rowNumber++) {
                const row                   = produtos.getRow(rowNumber);
                
                try {
                    let { produtoMacro, produtoMicro } = await fetchProduto(row);
                    
                    if((!produtoMacro.id && !produtoMacro.newName) && (!produtoMicro.id && !produtoMicro.newName)) {
                        produtos.spliceRows(rowNumber, 1);
                    } else {
                        let row             = {};
                        row.number          = rowNumber;
                        row.produtoMacro    = produtoMacro,
                        row.produtoMicro    = produtoMicro
                        rows.push(row);
                    }
                } catch (error) {
                    console.error('Erro ao tratar linhas Vazias');
                    sendUpdate(`Erro ao tratar linhas Vazias`, req);
                }
            }

            if (rows.length > 1) {
                plural = "s";
            }

            sendUpdate(`Processando ${rows.length} linha${plural}...`, req);

            for (let row = 0; row < rows.length; row++) {
                const element = rows[row];
                try {
                    sendUpdate(`Linha ${element.number}:`, req);

                    //caso exista uma id macro OU se a coluna newName possuir valor
                    if(element.produtoMacro.id || element.produtoMacro.newName) {
                        element.produtoMacro.id = await processoMacro(element.produtoMacro, req);
                    }

                    //caso exista uma id micro OU se a coluna newName possuir valor
                    if(element.produtoMicro.id || element.produtoMicro.newName) {
                        element.produtoMicro.id = await processoMicro(element.produtoMicro, req);
                    }

                    //caso a id em memória seja igual a id do produto E haja um macro id E haja também um micro id
                    if((memoriaMacro.id == element.produtoMacro.id) && element.produtoMacro.id && element.produtoMicro.id) {
                        await vinculo(memoriaMacro.id, element.produtoMicro.id, req);
                    }
                } catch (error) {
                    sendUpdate(`Erro ao processar a linha ${element.number}: ${error.message}`, req);
                    console.warn(error.message)
                }
            }

            sendUpdate("Processo completo. Atualizando arquivo carregado ...", req);

            await wb.xlsx.writeFile(fileName);
            sendUpdate("Arquivo salvo com sucesso.", req);

            res.download(fileName, 'PRODUTOS_RESPOSTA.xlsx', (err) => {
                if (err) {
                    console.error('Erro ao enviar o arquivo:', err);
                }
            });
        })
        .catch(err => {
            sendUpdate(`Erro no processamento: ${err.message}`, req);
            stopLoader();
        })
        .finally(() => {
            sendUpdate('Fim', req);
            stopLoader();
        });
    // res.send('Produtos importados/cadastrados');
};
