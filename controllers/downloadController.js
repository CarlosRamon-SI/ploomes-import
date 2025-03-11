require('dotenv').config();
const { sendUpdate, startLoader, stopLoader, erase } = require('../services/socket');
const ExcelJS = require('exceljs');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const PRODUTO_ENDPOINT  = process.env.PRODUTO_ENDPOINT;
const margem            = process.env.PRODUTO_MARGEM_KEY;
const custoUnitario     = process.env.PRODUTO_CUSTOUNITARIO_KEY;
const especificacoes    = process.env.PRODUTO_ESPECIFICACOES_KEY;
const marcadoresId      = process.env.MARCADOR_ID || 1003435; // Marcadores = Macro - Products?$select=Name&$filter=Lists/any(l: l/ListId+eq+${marcador})
const wb                = new ExcelJS.Workbook();
const arquivoModelo = path.join(__dirname, '..', 'model', 'PRODUTOS_V11.xlsx');
const arquivoTemp   = path.join(__dirname, '..', 'temp', '~PRODUTOS_V11.xlsx');

async function fetchProdutosMicro(url) {
    let todosProdutos = [];

    while (url) {
        let produtos = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `${url}`,
            headers: {
                'Content-Type': 'application/json',
                'User-Key': `${process.env.TOKEN}`
            }
        };
        try {
            const response = await axios(produtos);
            todosProdutos = todosProdutos.concat(response.data.value)
            url = response.data["@odata.nextLink"]
        } catch (error) {
            console.error(error.message)
        }
    }

    return todosProdutos;
}

async function montaData(req) {

    const produtosMacro = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `${PRODUTO_ENDPOINT}?$select=Name,Id,GroupId,CurrencyId&$filter=Lists/any(l: l/ListId+eq+${marcadoresId})&$orderby=Name+asc`,
        headers: {
            'Content-Type': 'application/json',
            'User-Key': `${process.env.TOKEN}`
        }
    };

    const grupos = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `${PRODUTO_ENDPOINT}@Groups?$select=Id,Name&$orderby=Name+asc`,
        headers: {
            'Content-Type': 'application/json',
            'User-Key': `${process.env.TOKEN}`
        }
    };

    sendUpdate('Obtendo Grupos e Produtos cadastrados no Ploomes...', req);
    const respostaProdutosMacro = await axios(produtosMacro);
    const respostaProdutosMicro = await fetchProdutosMicro(`${PRODUTO_ENDPOINT}?$select=Name,Id,GroupId,Code,CurrencyId&$orderby=Name+asc&$filter=not+Lists/any(L: L/ListId+eq+${marcadoresId})&$expand=OtherProperties($filter=FieldKey+eq+'${custoUnitario}'+or+FieldKey+eq+'${margem}'+or+FieldKey+eq+'${especificacoes}';$select=FieldKey,DecimalValue,BigStringValue)`);
    //                                                                          ?$select=Name,Id,GroupId,Code,CurrencyId&$orderby=Name+asc&$filter=not+Lists/any(L: L/ListId+eq+${marcadoresId})&$expand=OtherProperties($filter=FieldKey+eq+'${custoUnitario}'+or+FieldKey+eq+'${margem}'+or+FieldKey+eq+'${especificacoes}';$select=FieldKey,DecimalValue,BigStringValue)`,
    //                                                                          ?$select=Name,Id,GroupId,Code,CurrencyId&$orderby=Name+asc&$filter=not+Lists/any(L: L/ListId+eq+{{marcadoresId})&$expand=OtherProperties($select=FieldKey,DecimalValue,BigStringValue;$filter=FieldKey+eq+\'{{custoUnitario}\'+or+FieldKey+eq+\'{{margem}\'+or+FieldKey+eq+\'{{especificacoes}\')
    // const respostaProdutosMicro = await axios(produtosMicro);
    const respostaGrupos = await axios(grupos);
    const sheetDados    = wb.getWorksheet('dados');
    
    for (let x = 0; x  < respostaGrupos.data.value.length; x++) {
        sheetDados.getCell(`A${x+1}`).value = respostaGrupos.data.value[x].Name;
        sheetDados.getCell(`B${x+1}`).value = respostaGrupos.data.value[x].Id;
        sheetDados.getCell(`C${x+1}`).value = respostaGrupos.data.value[x].Name;
    }

    for (let x = 0; x  < respostaProdutosMacro.data.value.length; x++) {
        sheetDados.getCell(`G${x+1}`).value = respostaProdutosMacro.data.value[x].Id + ' || ' + respostaProdutosMacro.data.value[x].Name;
        sheetDados.getCell(`H${x+1}`).value = respostaProdutosMacro.data.value[x].Id;
        sheetDados.getCell(`I${x+1}`).value = respostaProdutosMacro.data.value[x].GroupId;
        if (respostaProdutosMacro.data.value[x].CurrencyId == 1) {
            sheetDados.getCell(`J${x+1}`).value = "R$";
        } else {
            sheetDados.getCell(`J${x+1}`).value = "US$";
        }
    }

    for (let x = 0; x  < respostaProdutosMicro.length; x++) {
        sheetDados.getCell(`K${x+1}`).value = respostaProdutosMicro[x].Code;
        sheetDados.getCell(`L${x+1}`).value = respostaProdutosMicro[x].Id + ' || ' + respostaProdutosMicro[x].Name;
        sheetDados.getCell(`M${x+1}`).value = respostaProdutosMicro[x].Id;
        sheetDados.getCell(`N${x+1}`).value = respostaProdutosMicro[x].GroupId;

        if (respostaProdutosMicro[x].CurrencyId == 1) {
            sheetDados.getCell(`O${x+1}`).value = "R$";
        } else {
            sheetDados.getCell(`O${x+1}`).value = "US$";
        }
        sheetDados.getCell(`P${x+1}`).value = respostaProdutosMicro[x].Code;

        let produto = respostaProdutosMicro[x]; 
        let margemKey = produto.OtherProperties.find(prop => prop.FieldKey === margem); //MARGEM
        
        if(margemKey) {
            sheetDados.getCell(`Q${x+1}`).value = margemKey.DecimalValue;
        }
        
        let custoKey = produto.OtherProperties.find(prop => prop.FieldKey === custoUnitario); //CUSTO
        
        if(custoKey){
            sheetDados.getCell(`R${x+1}`).value = custoKey.DecimalValue;
        }
        
        let especificacoesKey = produto.OtherProperties.find(prop => prop.FieldKey === especificacoes); //MARGEM
        
        if(especificacoesKey){
            sheetDados.getCell(`S${x+1}`).value = especificacoesKey.BigStringValue;
        }

        let groupName = respostaGrupos.data.value.find(prop => prop.Id === produto.GroupId );
        if(groupName){
            sheetDados.getCell(`T${x+1}`).value = groupName.Name;
        }
    }
}

async function montaPlanilha(req){

    const sheetProdutos = wb.getWorksheet('PRODUTOS');
    const startCol = 1;
    const endCol = 17;
    const startRow = 3;
    const endRow = 100;
    
    sendUpdate('Aplicando formulas e seletores...', req);
    for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
            const cell = sheetProdutos.getCell(row, col);
            switch (col) {
                case 1:     // ID GRUPO MACRO '=SEERRO(PROCV($F3;dados!$A:$B;2;FALSO);"")'
                    cell.value = {
                        formula: `IFERROR(VLOOKUP($I${row}, dados!$A:$B, 2, FALSE), "")`
                    };
                    break;
                case 2:     // ID GRUPO MICRO '=SEERRO(PROCV($L3;dados!$A:$B;2;FALSO);"")'
                    cell.value = {
                        formula: `IFERROR(VLOOKUP($P${row}, dados!$A:$B, 2, FALSE), "")`
                    };
                    break;
                case 3:     // ID PRODUTO MACRO '=SEERRO(PROCV($E3;dados!$G:$H;2;FALSO);"")'
                    cell.value = {
                        formula: `IFERROR(VLOOKUP($G${row}, dados!$G:$H, 2, FALSE), "")`
                    };
                    break;
                case 4:     // ID PRODUTO MICRO '=SEERRO(PROCV($I3;dados!$K:$L;2;FALSO);"")'
                    cell.value = {
                        formula: `IFERROR(VLOOKUP($K${row}, dados!$L:$M, 2, FALSE), "")`
                    };
                    break;
                case 5:     // ATUALIZAÇÃO FORMULA = =E(F3=SEERRO(PROCV($G3; dados!$G:$J; 4; FALSO); "");H3="";I3=SEERRO(PROCV(PROCV($G3; dados!$G:$I; 3; FALSO); dados!$B:$C; 2; FALSO); "");J3=SEERRO(PROCV($K3; dados!$K:$O; 5; FALSO); "");L3="";M3=SEERRO(PROCV($K3; dados!$K:$R; 6; FALSO); "");N3=SEERRO(PROCV($K3; dados!$K:$R; 7; FALSO); "");O3=SEERRO(PROCV(PROCV(K3;dados!$K:$M;3;FALSO);dados!$B:$C;2;FALSO);"");P3=SEERRO(PROCV($K3;dados!$K:$R;8;FALSO);""))
                    cell.value = {
                        formula: `=NOT(AND(
                                $F${row}=IFERROR(VLOOKUP($G${row},  dados!$G:$J,  4,  FALSE),  ""), 
                                $H${row}="", 
                                $I${row}=IFERROR(VLOOKUP(VLOOKUP($G${row},  dados!$G:$I,  3,  FALSE),  dados!$B:$C,  2,  FALSE),  "")
                            ))&","&NOT(AND(
                                OR(
                                    $L${row}=$J${row},
                                    $L${row}=""
                                ),
                                $M${row}="",
                                $N${row}=IFERROR(IF(VLOOKUP($K${row},  dados!$L:$S,  7,  FALSE)=0,"",VLOOKUP($K${row},  dados!$L:$S,  7,  FALSE)),  ""), 
                                $O${row}=IFERROR(VLOOKUP($K${row},  dados!$L:$S,  6,  FALSE),  ""), 
                                OR(
                                    $P${row}=IFERROR(VLOOKUP(VLOOKUP($G${row}, dados!$G:$J, 3, FALSE), dados!$B:$C, 2, FALSE), ""), 
                                    $P${row}=IFERROR(VLOOKUP(VLOOKUP($K${row}, dados!$L:$N, 3, FALSE), dados!$B:$C, 2, FALSE), "")
                                ),
                                $Q${row}=IFERROR(VLOOKUP($K${row}, dados!$L:$S, 8, FALSE), "")
                            ))`
                    };
                    break;
                case 6:     // MOEDA
                    cell.value = {
                        formula: `IFERROR(IF(VLOOKUP($G${row}, dados!$G:$J, 4, FALSE)=0,"",VLOOKUP($G${row}, dados!$G:$J, 4, FALSE)), "")`
                    };
                    cell.dataValidation = {
                        type: "list",
                        formulae:["dados!$D:$D"],
                        allowBlank: false,
                        showInputMessage: false,
                        showErrorMessage: false
                    };
                    break;
                case 7:     // PRODUTO MACRO
                    cell.dataValidation = {
                        type: "list",
                        formulae:["dados!$G:$G"],
                        allowBlank: true,
                        showInputMessage: false,
                        showErrorMessage: true,
                        errorStyle: 'warn',
                        errorTitle: 'Aviso',
                        error: 'Coluna apenas para Seleção'
                    };
                    break;
                case 9:    // GRUPO MACRO 
                        cell.value = {
                            formula: `=IFERROR(IF(VLOOKUP(VLOOKUP($G${row}, dados!$G:$I, 3, FALSE), dados!$B:$C, 2, FALSE)=0,"",VLOOKUP(VLOOKUP($G${row}, dados!$G:$I, 3, FALSE), dados!$B:$C, 2, FALSE)), "")`
                        };
                        cell.dataValidation = {
                            type: "list",
                            formulae:["dados!$A:$A"],
                            allowBlank: false,
                            showInputMessage: false,
                            showErrorMessage: false
                        };
                    break;
                case 10: // ATUAL - COD. P/N
                    cell.value = {
                        formula: `IFERROR(IF(VLOOKUP($K${row}, dados!$L:$P, 5, FALSE)=0,"",VLOOKUP($K${row}, dados!$L:$P, 5, FALSE)), "")`
                    };
                    break;
                case 11: // CODE P/N
                    cell.value = {
                        formula: `IFERROR(IF(VLOOKUP(TEXT($L${row}, "0"), dados!$K:$O, 2, FALSE)=0,"",VLOOKUP(TEXT($L${row}, "0"), dados!$K:$O, 2, FALSE)), "")`
                    };
                    cell.dataValidation = {
                        type: "list",
                        formulae:["dados!$L:$L"],
                        allowBlank: true,
                        showInputMessage: false,
                        showErrorMessage: true,
                        errorStyle: 'warn',
                        errorTitle: 'Aviso',
                        error: 'Coluna apenas para Seleção'
                    };
                    break;
                case 14: // CUSTO UNITÁRIO PRODUTO MICRO
                        cell.value = {
                            formula: `IFERROR(IF(VLOOKUP($K${row}, dados!$L:$R, 7, FALSE)=0,"",VLOOKUP($K${row}, dados!$L:$R, 7, FALSE)), "")`
                        }
                    break;
                case 15: // MARGEM PRODUTO MICRO
                    cell.value = {
                        formula: `IFERROR(IF(VLOOKUP($K${row}, dados!$L:$R, 6, FALSE)=0,"",VLOOKUP($K${row}, dados!$L:$R, 6, FALSE)), "")`
                    }
                    break;
                case 16:     // GRUPO MICRO
                    cell.value = {
                        formula: `
                        =IF(
                            $D${row}="", 
                                IFERROR(IF(VLOOKUP(VLOOKUP($G${row}, dados!$G:$I, 3, FALSE), dados!$B:$C, 2, FALSE)=0,"",VLOOKUP(VLOOKUP($G${row}, dados!$G:$I, 3, FALSE), dados!$B:$C, 2, FALSE)), ""), 
                                IFERROR(IF(VLOOKUP(VLOOKUP($K${row}, dados!$L:$N, 3, FALSE), dados!$B:$C, 2, FALSE)=0,"",VLOOKUP(VLOOKUP($K${row}, dados!$L:$N, 3, FALSE), dados!$B:$C, 2, FALSE)), "")
                        )`
                    };
                    cell.dataValidation = {
                        type: "list",
                        formulae:["dados!$A:$A"],
                        allowBlank: false,
                        showInputMessage: false,
                        showErrorMessage: false
                    };
                    break;
                case 17: // ESPECIFICAÇOES PRODUTO MICRO
                    cell.value = {
                        formula: `IFERROR(IF(VLOOKUP($K${row}, dados!$L:$S, 8, FALSE)=0,"",VLOOKUP($K${row}, dados!$L:$S, 8, FALSE)), "")`
                    }
                    break;
                default:
                    break;
            }
        }
    }

    let options = {
        selectLockedCells:	    false,	// Lets the user select locked cells
        selectUnlockedCells:	true,	// Lets the user select unlocked cells
        formatCells:	        true,	// Lets the user format cells
        formatColumns:	        true,	// Lets the user format columns
        formatRows:	            true,	// Lets the user format rows
        insertRows:	            false,	// Lets the user insert rows
        insertColumns:	        false,	// Lets the user insert columns
        insertHyperlinks:	    false,	// Lets the user insert hyperlinks
        deleteRows:	            true,	// Lets the user delete rows
        deleteColumns:	        false,	// Lets the user delete columns
        sort:	                false,	// Lets the user sort data
        autoFilter:	            false,	// Lets the user filter data in tables
        pivotTables:	        false,	// Lets the user use pivot tables
        spinCount:	            1
    }

    await sheetProdutos.protect('', options);
}

exports.getDownload = async (req, res) => {
    startLoader();
    await erase();
    sendUpdate('Processo iniciado...', req);
    
    try {
        
        sendUpdate('Construindo Arquivo...', req);
        await wb.xlsx.readFile(arquivoModelo);
        await montaData(req);
        await montaPlanilha(req);

        sendUpdate('Salvando arquivo...', req);

        wb.xlsx
        await wb.xlsx.writeFile(arquivoTemp);

        sendUpdate('Arquivo pronto, enviando download...', req);

        res.download(arquivoTemp, 'PRODUTOS_V11.xlsx', (err) => {
            if (err) {
                sendUpdate(`Erro ao enviar o arquivo: ${err}`, req);
                console.error('Erro ao enviar o arquivo:', err);
            } else {
                sendUpdate('Download liberado', req);
                fs.unlinkSync(arquivoTemp);
            }
        });
    } catch (err) {
        sendUpdate(`Erro ao processar o arquivo: ${err}`, req);
        console.error('Erro ao processar o arquivo:', err);
    }
    stopLoader();
}