# Fluxo Principal do App

Este documento descreve o fluxo operacional principal do `Bar13` do ponto de vista do atendente.

## Fluxo principal resumido

1. abrir o app
2. conferir se o operador atual, o bar e o PIX estão configurados
3. iniciar um novo pedido
4. buscar e selecionar o integrante
5. adicionar itens ao pedido
6. fechar a conta
7. apresentar cobrança
8. copiar mensagem de cobrança, se necessário
9. registrar o pagamento
10. enviar para a central, se o bar usar Google Sheets
11. consultar depois em histórico, pendentes, relatórios, exportações ou central

## Passo a passo detalhado

## Etapa 1. Abrir o app

Ao abrir o aplicativo:

- o app prepara o banco local
- carrega tabelas e configuração
- mostra a `Home`

Se houver falha ao inicializar o banco:

- a navegação principal não é liberada
- o app permanece na tela de carregamento com mensagem de erro

Na `Home`, o atendente já consegue ver:

- pedidos do dia
- total do dia
- valor pendente
- pedidos em aberto para retomada

## Etapa 2. Conferir configurações iniciais

Antes da operação diária, é recomendado abrir `Configurações` e validar:

- nome deste aparelho
- nome do bar
- chave PIX
- imagem do QR Code
- texto padrão de cobrança
- URL do Web App e token da central, se o bar usar a central gerencial

Também é recomendado conferir se o aparelho já está com o operador atual correto:

- abrir `Gerenciar operadores`
- localizar o nome do atendente do turno
- usar `Assumir aparelho`, quando necessário

Se o QR Code não estiver configurado, a cobrança por PIX continuará exibindo a chave textual, mas a imagem do QR não aparecerá no fechamento.

Se a operação usar mais de um aparelho, também é recomendado abrir `Sincronização` e conferir:

- se o nome do aparelho está correto para a equipe
- quando foi a última importação local
- se o aparelho já conhece as outras origens esperadas

Se a operação usar ranking e auditoria por pessoa:

- todos os operadores precisam estar cadastrados
- cada aparelho precisa estar com o operador atual correto antes de abrir pedido

## Etapa 3. Iniciar novo pedido

Na `Home`, tocar em:

- `Novo pedido`

O app leva para `Selecionar integrante`.

Se não houver operador atual definido:

- o app bloqueia o início do pedido
- oferece atalho para abrir `Gerenciar operadores`

## Etapa 4. Selecionar integrante

Na tela de seleção:

1. digitar o nome no campo de busca
2. localizar o integrante filtrado em tempo real
3. tocar no integrante desejado

O que acontece internamente:

- se ele não tiver pedido aberto hoje, o app cria um novo pedido
- se ele já tiver pedido aberto hoje, o app reutiliza esse pedido
- o app entra em `Novo pedido`

Se o integrante ainda não existir:

- usar `Cadastrar integrante`
- ou `Importar CSV`

Se o integrante existir, mas já tiver um pedido aberto no dia:

- o atendente continua exatamente esse pedido
- isso evita abrir duas contas abertas simultâneas para a mesma pessoa no mesmo dia

## Etapa 5. Montar o pedido

Na tela `Novo pedido`:

1. conferir o nome do integrante
2. conferir o operador responsável exibido no pedido
3. buscar item por nome
4. tocar nos cards para adicionar itens
5. repetir até concluir o consumo

Durante essa etapa:

- o total sobe em tempo real
- o estoque vai sendo baixado
- a lista de itens do pedido mostra quantidade e subtotal
- o pedido preserva quem era o operador atual no momento da abertura

Se um item estiver sem estoque:

- o card continua visível
- o card fica desabilitado
- a interface sinaliza `Esgotado`

Se precisar corrigir:

- usar o controle de remover unidade na linha do pedido

Se o último item for removido:

- o pedido passa a cancelado
- o app volta para a navegação principal

Se o atendente tocar em `Cancelar pedido` manualmente:

- o app devolve ao estoque tudo que havia sido reservado
- o pedido é marcado como cancelado
- o fluxo volta para a navegação principal

## Etapa 6. Fechar a conta

Quando o pedido estiver pronto:

1. tocar em `Fechar conta`
2. confirmar a ação

Resultado:

- o pedido sai do modo de edição
- o status muda para `FECHADO_AGUARDANDO_PAGAMENTO`
- a tela de `Fechamento da conta` é aberta

Se o pedido estiver sem item:

- o fechamento é bloqueado
- o operador precisa adicionar pelo menos um item antes de seguir

## Etapa 7. Apresentar cobrança

Na tela de fechamento, o atendente pode:

- conferir os itens da conta
- conferir o total final
- conferir o responsável pela venda
- mostrar o QR Code PIX
- ler ou informar a chave PIX textual

Se o QR Code ainda não tiver sido configurado:

- o fechamento informa a ausência da imagem
- a chave PIX textual ainda pode ser usada se estiver preenchida

Se quiser enviar mensagem pronta:

1. tocar em `Copiar mensagem`
2. colar no WhatsApp ou canal desejado

A mensagem já sai com:

- data do pedido
- chave PIX
- lista de itens
- total formatado

## Etapa 8. Tratar exceções antes do pagamento

Se o cliente pedir ajuste:

1. tocar em `Reabrir conta`
2. voltar para `Novo pedido`
3. corrigir os itens
4. fechar novamente

Essa reabertura só funciona enquanto o pedido ainda não foi pago.

Depois da reabertura:

- a navegação volta para `Novo pedido`
- o pedido torna a ficar editável
- o estoque volta a ser controlado normalmente a partir das novas alterações

## Etapa 9. Registrar pagamento

Na tela de fechamento, o pedido pendente exibe a seção `Registrar pagamento`.

### Se o pagamento for PIX

1. tocar em `PIX com comprovante`
2. selecionar o comprovante em imagem ou PDF
3. aguardar o registro

Resultado:

- o pedido fica com status `PAGO`
- o método de pagamento fica salvo como `PIX`
- o comprovante fica anexado ao pedido

Se o operador cancelar a seleção do comprovante:

- o pagamento não é concluído
- o pedido continua pendente

### Se o pagamento for cartão

1. tocar em `Cartão de crédito`
2. selecionar o comprovante em imagem ou PDF
3. aguardar o registro

Resultado:

- o pedido fica com status `PAGO`
- o método de pagamento fica salvo como `CARTAO_CREDITO`
- o comprovante fica anexado ao pedido

Limitação atual:

- o app não integra com maquininha ou gateway
- o registro do pagamento é manual

### Se o pagamento for dinheiro

1. tocar em `Dinheiro`
2. confirmar o valor recebido

Resultado:

- o pedido fica com status `PAGO`
- o método de pagamento fica salvo como `DINHEIRO`

## Etapa 10. Pós-pagamento

Depois que a conta é paga, a tela de fechamento passa a funcionar como tela de consulta.

O operador pode:

- ver o método de pagamento registrado
- ver o nome do comprovante, quando houver
- compartilhar o comprovante salvo

Se o pagamento foi via `PIX` ou `CARTAO_CREDITO`:

- o comprovante pode ser substituído depois

Se o pagamento foi em `DINHEIRO`:

- não existe comprovante para trocar

## Etapa 11. Enviar para a central

Se o bar usar a central gerencial no Google Sheets:

1. voltar para a `Home`
2. tocar em `Enviar para a central`

Ou:

1. abrir `Sincronização`
2. usar a seção `Central gerencial`
3. tocar em `Enviar para a central`

Resultado esperado:

- o app envia pedidos, itens, operadores, aparelhos e auditoria por JSON
- a planilha é atualizada por `upsert`
- o app mostra um resumo do lote enviado

Se houver falha:

- o lote continua salvo localmente
- a tela de `Sincronização` mostra pendências e último erro

## Etapa 12. Consultar depois

Depois que a operação termina, o pedido pode ser acompanhado em diferentes visões.

### Histórico

Usado para consultar por um dia específico.

### Pendentes

Usado para localizar contas ainda não pagas e reenviar cobrança.

### Relatórios

Usado para análise por período.

### Exportação CSV

Usado para gerar arquivos de vendas, devedores e consolidado.

### Central gerencial

Usada para ranking por atendente, auditoria e visão consolidada online.

## Fluxos auxiliares importantes

## Fluxo de operador atual no início do turno

1. abrir `Configurações`
2. tocar em `Gerenciar operadores`
3. localizar o nome correto
4. tocar em `Assumir aparelho`
5. voltar para a `Home` e conferir o selo `Operador atual`

## Fluxo de sincronização entre aparelhos

1. no aparelho de origem, abrir `Configurações`
2. tocar em `Abrir sincronização`
3. tocar em `Exportar sincronização`
4. enviar o arquivo `.bar13sync` para o outro aparelho
5. no aparelho de destino, abrir `Sincronização`
6. tocar em `Importar sincronização`
7. revisar o resumo e confirmar a importação

Durante a importação, o app pode alertar:

- pacote já importado
- pacote mais antigo da mesma origem
- pacote do próprio aparelho

Se a importação falhar, o app faz rollback e evita aplicar dados pela metade.

## Fluxo de retomada de pedido aberto pela Home

1. abrir a `Home`
2. localizar a seção `Pedidos em aberto`
3. tocar em `Continuar pedido`
4. retomar a montagem do pedido

## Fluxo de envio para a central

1. abrir a `Home` ou `Sincronização`
2. tocar em `Enviar para a central`
3. aguardar o resumo do envio
4. se houver erro, conferir internet, URL do Web App e token

## Fluxo de cadastrar integrante manualmente

1. abrir `Configurações`
2. tocar em `Gerenciar integrantes`
3. preencher nome e patente
4. salvar

## Fluxo de cadastrar item manualmente

1. abrir `Configurações`
2. tocar em `Gerenciar itens`
3. preencher nome, valor e estoque
4. salvar

## Fluxo de importar integrantes por CSV

1. abrir `Configurações`
2. tocar em `Importar integrantes via CSV`
3. selecionar o arquivo
4. conferir o resultado de inseridos, atualizados e processados

## Fluxo de importar itens por CSV

1. abrir `Configurações`
2. tocar em `Importar itens via CSV`
3. selecionar o arquivo
4. conferir o resultado de inseridos, atualizados e processados

## Fluxo de exportar CSV

1. abrir `Exportação CSV`
2. definir `data inicial` e `data final`
3. escolher o tipo de exportação
4. compartilhar ou guardar o arquivo gerado

## Fluxo de consulta de pendências

1. abrir a aba `Pendentes`
2. ajustar o período
3. localizar a conta desejada
4. copiar mensagem ou abrir o pagamento

## Fluxo de conferência diária

1. abrir a aba `Histórico`
2. posicionar a data desejada
3. revisar pedidos, totais e status
4. abrir a conta que precisar de inspeção

## Fluxo de análise gerencial

1. abrir `Relatórios`
2. definir intervalo
3. revisar métricas gerais
4. conferir lista de pedidos
5. revisar consolidado de devedores
6. revisar consolidado de consumo
7. abrir `Exportação CSV` se precisar compartilhar números

## Resumo operacional ideal

Para o uso diário no balcão, o fluxo recomendado é:

1. abrir o app
2. validar rapidamente operador atual, PIX e QR
3. tocar em `Novo pedido`
4. selecionar integrante
5. adicionar itens
6. fechar conta
7. mostrar PIX, registrar cartão ou receber em dinheiro
8. copiar mensagem se necessário
9. registrar o pagamento
10. enviar para a central nos momentos definidos pelo bar
11. seguir para o próximo atendimento
