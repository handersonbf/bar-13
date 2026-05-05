# Manual do Operador

Este guia e para quem vai usar o `Bar13` no balcao. Ele explica a rotina principal do app sem entrar em detalhes tecnicos de desenvolvimento.

## Antes de Comecar

O app funciona localmente no celular, sem depender de backend para registrar pedidos, pagamentos, comprovantes, relatorios e exportacoes.

Antes do primeiro uso, abra `Configuracoes` e confira:

- nome do bar
- chave PIX
- imagem fixa do QR Code
- texto padrao da mensagem de cobranca
- base de integrantes
- base de itens e estoque inicial

Se a base ainda estiver vazia, cadastre manualmente ou importe CSVs:

- integrantes: `nome,patente`
- itens: `nome,valor,qtdestoque`

O CSV usa virgula como separador. No app atual, itens sao identificados no fluxo de importacao pelo nome, valor e estoque; o numero interno do item e gerado automaticamente.

## Rotina de Balcao

1. Abra a `Home`.
2. Toque em `Novo pedido`.
3. Busque o integrante pelo nome.
4. Toque no integrante correto.
5. Adicione os itens consumidos pelos cards.
6. Confira quantidade, subtotal e total.
7. Toque em `Fechar conta`.
8. Cobre por PIX ou dinheiro.
9. Marque como pago quando o recebimento for confirmado.

Se o mesmo integrante ja tiver um pedido aberto no dia, o app reaproveita esse pedido em vez de criar outro. Isso evita duas contas abertas para a mesma pessoa no mesmo dia.

## Cadastro de Integrantes

Use `Gerenciar integrantes` quando precisar:

- cadastrar uma pessoa manualmente
- corrigir nome ou patente
- buscar integrante ja cadastrado
- excluir integrante que ainda nao tenha pedido salvo
- importar uma base CSV

Campos obrigatorios:

- `nome`
- `patente`

Ao importar CSV, nomes repetidos sao tratados como a mesma pessoa para evitar duplicidade.

## Cadastro de Itens

Use `Gerenciar itens` quando precisar:

- cadastrar item manualmente
- corrigir preco
- ajustar estoque
- buscar item pelo nome
- ver itens sem estoque
- importar uma base CSV

Campos obrigatorios:

- `nome`
- `valor`
- `qtdestoque`

O estoque baixa automaticamente quando um item entra no pedido. Se uma unidade for removida de um pedido aberto, o estoque volta automaticamente.

## Pedido Aberto

Enquanto o pedido estiver aberto, o operador pode:

- adicionar itens
- remover unidades
- acompanhar o total em tempo real
- cancelar o pedido
- fechar a conta

Se o ultimo item for removido, o pedido e cancelado automaticamente e preservado no historico.

Pedidos pagos, fechados aguardando pagamento ou cancelados nao ficam livres para edicao.

## Fechamento e Cobranca

Ao fechar a conta, o pedido muda para `FECHADO_AGUARDANDO_PAGAMENTO`.

Nessa tela, o operador pode:

- conferir dados do integrante
- conferir itens e total
- mostrar o QR Code PIX
- copiar a mensagem de cobranca
- reabrir a conta, se ainda nao foi paga
- marcar como pago

Use `Copiar mensagem` para enviar a cobranca pelo WhatsApp ou outro canal. A mensagem usa os dados salvos em `Configuracoes`, incluindo chave PIX, itens consumidos e total.

## Pagamento por PIX

Para pagamento via PIX:

1. Mostre o QR Code ou informe a chave PIX.
2. Toque em `Marcar como pago`.
3. Escolha `PIX`.
4. Anexe o comprovante em imagem ou PDF.
5. Aguarde a confirmacao.

O app nao permite marcar PIX como pago sem comprovante.

Depois do pagamento, o comprovante fica salvo localmente no pedido. Se necessario, ele pode ser aberto, compartilhado ou substituido depois.

## Pagamento em Dinheiro

Para pagamento em dinheiro:

1. Toque em `Marcar como pago`.
2. Escolha `Dinheiro`.
3. Confirme o recebimento.

Pagamento em dinheiro nao exige comprovante.

## Pendentes de Pagamento

Use `Pendentes de pagamento` para localizar contas fechadas que ainda nao foram pagas.

Essa tela ajuda a:

- conferir quem esta devendo
- copiar a mensagem de cobranca novamente
- abrir a tela de pagamento
- baixar a conta quando o pagamento for confirmado

Pedidos cancelados nao entram na lista de pendentes.

## Historico

Use `Historico` para consultar pedidos de uma data especifica.

A tela mostra:

- pedidos abertos
- pedidos fechados aguardando pagamento
- pedidos pagos
- pedidos cancelados
- resumo do dia

Pedidos abertos podem ser retomados. Pedidos fechados, pagos ou cancelados abrem em modo de consulta ou fechamento, conforme o estado.

## Relatorios

Use `Relatorios` para conferir a operacao por periodo.

A tela possui filtro de data inicial e final, com atalhos para periodos comuns. As mesmas datas alimentam a exportacao CSV.

Principais indicadores:

- quantidade de pedidos validos
- total vendido
- total pago
- total pendente
- quantidade de devedores
- quantidade de comprovantes anexados

Consolidados disponiveis:

- pedidos no periodo
- devedores agrupados por nome e patente
- consumo agrupado por item
- estoque, com vendido no periodo e saldo atual do cadastro

Use essa tela para conferencia do dia, fechamento de evento, acompanhamento de dividas e analise de itens mais consumidos.

## Exportacao CSV

Use `Exportacao CSV` quando precisar gerar arquivos para conferencia externa, prestacao de contas ou planilhas.

Todos os arquivos usam o periodo selecionado na tela.

### Vendas por periodo

Use para auditar pedidos do intervalo.

Inclui dados como:

- pedido
- data e hora
- integrante
- patente
- status
- metodo de pagamento
- itens formatados
- comprovante
- total

### Devedores por periodo

Use para cobrar contas ainda pendentes.

Inclui pedidos com status `FECHADO_AGUARDANDO_PAGAMENTO` dentro do periodo selecionado.

### Consolidado por periodo

Use para resumo geral ou integracao com Google Planilhas.

Inclui:

- total de pedidos
- total vendido
- total pago
- total pendente
- quantidade de devedores
- quantidade de comprovantes
- chave de importacao para evitar duplicidade em planilhas

### Resumo de consumo por periodo

Use para entender a saida dos itens.

Inclui:

- item
- quantidade total vendida
- valor total
- valor unitario medio
- estoque atual

## Rotina Recomendada de Fechamento

Ao fim do dia ou evento:

1. Abra `Pendentes de pagamento`.
2. Resolva ou registre as contas que ja foram pagas.
3. Abra `Relatorios`.
4. Escolha o periodo correto.
5. Confira vendido, pago e pendente.
6. Abra `Exportacao CSV`.
7. Exporte `consolidado por periodo`.
8. Se precisar de auditoria detalhada, exporte tambem vendas, devedores e resumo de consumo.
9. Compartilhe os arquivos para o canal definido pela equipe.

## Cuidados Importantes

- Antes de limpar bases de integrantes ou itens, confirme que voce realmente quer apagar o historico relacionado.
- Antes de usar `Zerar configuracoes e dados`, exporte o que precisar guardar.
- O app salva dados localmente no dispositivo. Trocar de aparelho nao transfere automaticamente o banco.
- Pagamento PIX so deve ser baixado depois de anexar o comprovante correto.
- Se reexportar o mesmo periodo, confira se a planilha externa esta preparada para atualizar linhas existentes.

## Primeiro Uso Sugerido

Para treinar um novo operador, siga esta ordem:

1. Configurar nome do bar, chave PIX e QR Code.
2. Importar ou cadastrar integrantes.
3. Importar ou cadastrar itens.
4. Abrir um pedido de teste.
5. Adicionar e remover itens para entender o estoque.
6. Fechar a conta.
7. Copiar a mensagem de cobranca.
8. Simular pagamento em dinheiro.
9. Abrir `Historico`, `Pendentes`, `Relatorios` e `Exportacao CSV`.

Essa sequencia tambem aparece no `Guia rapido` dentro do app, acessivel pela Home e por `Configuracoes`.
