# Contrato CSV

**Versão:** formato observado na baseline; não há campo numérico `schemaVersion` no CSV. Fontes: [parser](../../src/utils/csv.ts), [validações](../../src/utils/validation.ts), [importação](../../src/services/importacaoCsvService.ts), [exportação](../../src/services/exportacaoCsvService.ts).

## Entrada de integrantes

Cabeçalhos obrigatórios exatos: `nome`, `patente`. Valores obrigatórios após trim; patente será convertida para maiúscula. Exemplo fictício:

```csv
nome,patente
Integrante Exemplo,SGT
Outro Integrante,CB
```

## Entrada de itens

Cabeçalhos obrigatórios exatos: `nome`, `valor`, `qtdestoque`.

```csv
nome,valor,qtdestoque
Agua,3.00,10
Cerveja,"7,50",24
```

Valor deve resultar em número finito > 0. Saldo deve resultar em inteiro ≥ 0; zero é válido. Colunas extras são ignoradas pelas validações de domínio. Ordem dos cabeçalhos pode variar. Arquivo somente com cabeçalhos válidos resulta em zero processados.

Parser remove BOM inicial, linhas vazias e espaços externos das linhas/células. Trata vírgula entre aspas e aspas duplicadas. Não suporta campos multiline na entrada nem valida estritamente quantidade de colunas ou fechamento de aspas; cabeçalhos não têm conversão de caixa.

## Conversão de preço atual

Se houver ponto e vírgula no valor, o último separador decide o decimal. Somente vírgula é convertida para ponto. Somente ponto é decimal apenas quando existem exatamente duas posições após o último ponto; caso contrário, todos os pontos são removidos. Exemplos:

| Entrada textual | Número obtido |
| --- | --- |
| `7,50` ou `7.50` | 7.5 |
| `1.234,56` ou `1,234.56` | 1234.56 |
| `1.000` | 1000 |
| `7.5` | 75 |

Essa última conversão é uma limitação atual, não uma convenção decimal recomendada. A conversão não remove símbolo `R$`. Quando há vírgula no preço do CSV, o valor precisa estar entre aspas.

## Metadados comuns de saída

Todas as linhas dos quatro relatórios começam, nesta ordem, com:

```text
bar_nome,bar_slug,tipo_relatorio,periodo_inicial,periodo_final,exportado_em_data,exportado_em_hora,exportado_em_iso,chave_importacao
```

| Campo | Contrato |
| --- | --- |
| `bar_nome` | Nome configurado após trim; fallback `Bar13` |
| `bar_slug` | Nome sem diacríticos, minúsculo, grupos não alfanuméricos viram `_`, sem `_` nas pontas; fallback `bar13` |
| `tipo_relatorio` | `vendas_periodo`, `devedores_periodo`, `consolidado_periodo`, `resumo_consumo_periodo` |
| `periodo_inicial`, `periodo_final` | Intervalo reordenado; datas `YYYY-MM-DD` esperadas |
| `exportado_em_data` | Data local `YYYY-MM-DD` |
| `exportado_em_hora` | Hora local `HH:mm:ss` |
| `exportado_em_iso` | Data/hora local sem timezone |
| `chave_importacao` | `<bar_slug>__<tipo_relatorio>__<inicial>__<final>` |

## Colunas específicas, em ordem

### Vendas

```text
pedido_id,data,hora,integrante,patente,status,metodo_pagamento,itens_formatados,comprovante_nome,comprovante_anexado,total
```

Uma linha por pedido do intervalo, inclusive cancelado. `pedido_id` é ID local. `status` é `CANCELADO` se a marca estiver ativa, senão enum do pedido. Método usa rótulo `PIX`, `Dinheiro`, `Cartão de crédito` ou `Não informado`. Anexado é `SIM`/`NAO` pela presença do nome, não existência física. `itens_formatados` é texto multiline do snapshot. Total usa ponto decimal e duas casas.

### Devedores

```text
pedido_id,data,hora,integrante,patente,metodo_pagamento,itens_formatados,comprovante_nome,comprovante_anexado,total,status
```

Uma linha por conta retornada por `getPendentesPeriodo`, não uma linha por pessoa. Campos têm semântica equivalente à venda; observe posição final de `status` e a ressalva sobre cancelados em [consultas](../funcionalidades/005-consultas.md).

### Consolidado

```text
total_de_pedidos,total_vendido,total_pago,total_pendente,quantidade_devedores,quantidade_comprovantes,resumo_legivel
```

Sempre uma linha. Valores financeiros com ponto/duas casas. Resumo legível contém vendido, pago e pendente em BRL. Devedores conta pedidos pendentes, não pessoas distintas. Esse contrato é consumido pelo importador Apps Script de consolidado.

### Resumo de consumo

```text
posicao,item,quantidade_total,valor_total,valor_unitario_medio,estoque_atual,resumo_legivel
```

Uma linha por par ID local/nome snapshot com consumo não cancelado. Ordenado por valor total decrescente; posição começa em 1. Média = valor total/quantidade com duas casas; estoque atual vem do cadastro por ID ou string vazia se inexistente. O ID não é exportado como coluna desse arquivo. Resumo legível inclui item, unidades, valor e estoque ou `N/D`.

## Serialização e nomes

UTF-8, vírgula, linhas `\n`, sem BOM adicionado. Campos com vírgula, aspas ou quebra de linha são envolvidos em aspas; aspas internas duplicadas. Não há neutralização de fórmulas de planilha. Consumidores devem tratar nomes e descrições como dados.

Arquivos ficam em `bar13/exports` com os padrões:

```text
bar13_vendas_<inicial>_<final>_<YYYY-MM-DD_HH-mm>.csv
bar13_devedores_<inicial>_<final>_<YYYY-MM-DD_HH-mm>.csv
bar13_consolidado_<inicial>_<final>_<YYYY-MM-DD_HH-mm>.csv
bar13_resumo_consumo_<inicial>_<final>_<YYYY-MM-DD_HH-mm>.csv
```

Sem registros, vendas/devedores/consumo produzem arquivo vazio, inclusive sem cabeçalho. Mesmo tipo/intervalo/minuto pode reutilizar o nome e sobrescrever o arquivo local anterior. Os exemplos mantidos no projeto estão em [integrantes](../../samples/integrantes_exemplo.csv) e [itens](../../samples/itens_exemplo.csv).
