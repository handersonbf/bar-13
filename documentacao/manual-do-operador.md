# Manual do Operador

Este guia é para quem vai usar o `Bar13` no balcão. Ele explica a rotina principal do app sem entrar em detalhes técnicos de desenvolvimento.

## Antes de começar

O app funciona localmente no celular, sem depender de backend para registrar pedidos, pagamentos, comprovantes, relatórios e exportações.

Antes do primeiro uso, abra `Configurações` e confira:

- nome deste aparelho
- nome do bar
- chave PIX
- imagem fixa do QR Code
- texto padrão da mensagem de cobrança
- base de integrantes
- base de itens e estoque inicial

Se a base ainda estiver vazia, cadastre manualmente ou importe CSVs:

- integrantes: `nome,patente`
- itens: `nome,valor,qtdestoque`

O CSV usa vírgula como separador. No app atual, itens são identificados no fluxo de importação pelo nome, valor e estoque; o número interno do item é gerado automaticamente.

## Sincronização entre aparelhos (MVP atual)

Quando houver mais de um aparelho operando offline, use a tela `Sincronização` para trocar pacotes entre eles.

Fluxo recomendado:

1. no aparelho de origem, tocar em `Exportar sincronização`
2. enviar o arquivo `.bar13sync` para o aparelho de destino
3. no destino, tocar em `Importar sincronização`
4. revisar o resumo e confirmar

O app mostra alertas quando:

- o pacote já foi importado
- o pacote é mais antigo que o último da mesma origem
- o pacote veio do próprio aparelho atual

## Rotina de balcão

1. Abra a `Home`.
2. Toque em `Novo pedido`.
3. Busque o integrante pelo nome.
4. Toque no integrante correto.
5. Adicione os itens consumidos pelos cards.
6. Confira quantidade, subtotal e total.
7. Toque em `Fechar conta`.
8. Copie a mensagem de cobrança se precisar enviar.
9. Registre o pagamento como `PIX com comprovante`, `Cartão de crédito` ou `Dinheiro`.

Se o mesmo integrante já tiver um pedido aberto no dia, o app reaproveita esse pedido em vez de criar outro. Isso evita duas contas abertas para a mesma pessoa no mesmo dia.

## Cadastro de integrantes

Use `Gerenciar integrantes` quando precisar:

- cadastrar uma pessoa manualmente
- corrigir nome ou patente
- buscar integrante já cadastrado
- excluir integrante que ainda não tenha pedido salvo
- importar uma base CSV

Campos obrigatórios:

- `nome`
- `patente`

Ao importar CSV, nomes repetidos são tratados como a mesma pessoa para evitar duplicidade.

## Cadastro de itens

Use `Gerenciar itens` quando precisar:

- cadastrar item manualmente
- corrigir preço
- ajustar estoque
- buscar item pelo nome
- ver itens sem estoque
- importar uma base CSV

Campos obrigatórios:

- `nome`
- `valor`
- `qtdestoque`

O estoque baixa automaticamente quando um item entra no pedido. Se uma unidade for removida de um pedido aberto, o estoque volta automaticamente.

## Pedido aberto

Enquanto o pedido estiver aberto, o operador pode:

- adicionar itens
- remover unidades
- acompanhar o total em tempo real
- cancelar o pedido
- fechar a conta

Se o último item for removido, o pedido é cancelado automaticamente e preservado no histórico.

Pedidos pagos, fechados aguardando pagamento ou cancelados não ficam livres para edição.

## Fechamento e cobrança

Ao fechar a conta, o pedido muda para `FECHADO_AGUARDANDO_PAGAMENTO`.

Nessa tela, o operador pode:

- conferir dados do integrante
- conferir itens e total
- mostrar o QR Code PIX
- copiar a mensagem de cobrança
- reabrir a conta, se ainda não foi paga
- registrar o pagamento

Use `Copiar mensagem` para enviar a cobrança pelo WhatsApp ou outro canal. A mensagem usa os dados salvos em `Configurações`, incluindo chave PIX, itens consumidos e total.

## Pagamento por PIX

Para pagamento via PIX:

1. Mostre o QR Code ou informe a chave PIX.
2. Na seção `Registrar pagamento`, toque em `PIX com comprovante`.
3. Anexe o comprovante em imagem ou PDF.
4. Aguarde a confirmação.

O app não permite marcar PIX como pago sem comprovante.

Depois do pagamento, o comprovante fica salvo localmente no pedido. Se necessário, ele pode ser aberto, compartilhado ou substituído depois.

## Pagamento por cartão

O app já permite registrar pagamento manual em `Cartão de crédito`.

Fluxo atual:

1. Na seção `Registrar pagamento`, toque em `Cartão de crédito`.
2. Anexe o comprovante em imagem ou PDF.
3. Aguarde a confirmação.

Importante:

- o app não conversa com maquininha, adquirente ou gateway
- o operador registra manualmente que o pagamento foi recebido
- o método salvo hoje é apenas `CARTAO_CREDITO`

## Pagamento em dinheiro

Para pagamento em dinheiro:

1. Na seção `Registrar pagamento`, toque em `Dinheiro`.
2. Confirme o recebimento.

Pagamento em dinheiro não exige comprovante.

## Pendentes de pagamento

Use `Pendentes de pagamento` para localizar contas fechadas que ainda não foram pagas.

Essa tela ajuda a:

- conferir quem está devendo
- copiar a mensagem de cobrança novamente
- abrir a tela de pagamento
- baixar a conta quando o pagamento for confirmado

Pedidos cancelados não entram na lista de pendentes.

## Histórico

Use `Histórico` para consultar pedidos de uma data específica.

A tela mostra:

- pedidos abertos
- pedidos fechados aguardando pagamento
- pedidos pagos
- pedidos cancelados
- resumo do dia

Pedidos abertos podem ser retomados. Pedidos fechados, pagos ou cancelados abrem em modo de consulta ou fechamento, conforme o estado.

## Relatórios

Use `Relatórios` para conferir a operação por período.

A tela possui filtro de data inicial e final, com atalhos para períodos comuns. As mesmas datas alimentam a exportação CSV.

Principais indicadores:

- quantidade de pedidos válidos
- total vendido
- total pago
- total pendente
- quantidade de devedores
- quantidade de comprovantes anexados

Consolidados disponíveis:

- pedidos no período
- devedores agrupados por nome e patente
- consumo agrupado por item
- estoque, com vendido no período e saldo atual do cadastro

Use essa tela para conferência do dia, fechamento de evento, acompanhamento de dívidas e análise de itens mais consumidos.

## Exportação CSV

Use `Exportação CSV` quando precisar gerar arquivos para conferência externa, prestação de contas ou planilhas.

Todos os arquivos usam o período selecionado na tela.

### Vendas por período

Use para auditar pedidos do intervalo.

Inclui dados como:

- pedido
- data e hora
- integrante
- patente
- status
- método de pagamento
- itens formatados
- comprovante
- total

### Devedores por período

Use para cobrar contas ainda pendentes.

Inclui pedidos com status `FECHADO_AGUARDANDO_PAGAMENTO` dentro do período selecionado.

### Consolidado por período

Use para resumo geral ou integração com Google Planilhas.

Inclui:

- total de pedidos
- total vendido
- total pago
- total pendente
- quantidade de devedores
- quantidade de comprovantes
- chave de importação para evitar duplicidade em planilhas

### Resumo de consumo por período

Use para entender a saída dos itens.

Inclui:

- item
- quantidade total vendida
- valor total

## Rotina recomendada de fechamento

Ao fim do dia ou evento:

1. Abra `Pendentes de pagamento`.
2. Resolva ou registre as contas que já foram pagas.
3. Abra `Relatórios`.
4. Escolha o período correto.
5. Confira vendido, pago e pendente.
6. Abra `Exportação CSV`.
7. Exporte `Consolidado por período`.
8. Se precisar de auditoria detalhada, exporte também vendas, devedores e resumo de consumo.
9. Compartilhe os arquivos para o canal definido pela equipe.

## Cuidados importantes

- Antes de limpar bases de integrantes ou itens, confirme que você realmente quer apagar o histórico relacionado.
- Antes de usar `Zerar configurações e dados`, exporte o que precisar guardar.
- O app salva dados localmente no dispositivo. Para trocar dados entre aparelhos, use exportação/importação em `Sincronização`.
- Pagamento PIX só deve ser baixado depois de anexar o comprovante correto.
- Se usar `Cartão de crédito`, lembre que o app só registra manualmente a baixa e o anexo do comprovante.
- Se reexportar o mesmo período, confira se a planilha externa está preparada para atualizar linhas existentes.
- O controle de estoque por aparelho ainda não está ativo no MVP atual; o saldo segue no cadastro local.

## Primeiro uso sugerido

Para treinar um novo operador, siga esta ordem:

1. Configurar nome do bar, chave PIX e QR Code.
2. Importar ou cadastrar integrantes.
3. Importar ou cadastrar itens.
4. Abrir um pedido de teste.
5. Adicionar e remover itens para entender o estoque.
6. Fechar a conta.
7. Copiar a mensagem de cobrança.
8. Simular pagamento em dinheiro.
9. Simular pagamento com comprovante.
10. Exportar e importar um pacote de sincronização entre dois aparelhos de teste.
11. Abrir `Histórico`, `Pendentes`, `Relatórios` e `Exportação CSV`.

Essa sequência também aparece no `Guia rápido` dentro do app, acessível pela Home e por `Configurações`.
