# Documentação das Telas

## 1. Home

Arquivo principal: [HomeScreen.tsx](/Users/handersonfrota/Abutres/Projetos/bar-13/src/screens/HomeScreen.tsx)

### Objetivo

É a tela de entrada operacional do app. Resume o dia, oferece ações rápidas e mostra pedidos em aberto para retomada.

### O que a tela exibe

- nome visual da marca `Abutres - Bar13`
- nome do bar configurado
- resumo da operação
- cartões de estatísticas
- ações rápidas
- lista de pedidos em aberto

### Estatísticas exibidas

- pedidos hoje
- total vendido hoje
- valor pendente hoje
- quantidade de pedidos abertos agora

### Ações rápidas

- `Novo pedido`
- `Pendentes de pagamento`
- `Exportar CSVs`

### Comportamento

- ao focar na tela, ela recarrega configuração, estatísticas e pedidos abertos
- cada pedido aberto pode ser retomado pelo botão `Continuar pedido`

## 2. Selecionar integrante

Arquivo principal: [SelecionarIntegranteScreen.tsx](/Users/handersonfrota/Abutres/Projetos/bar-13/src/screens/SelecionarIntegranteScreen.tsx)

### Objetivo

Permitir localizar rapidamente o integrante antes de iniciar um pedido.

### O que a tela exibe

- campo de busca por nome
- botão para cadastrar integrante
- botão para importar CSV de integrantes
- lista filtrada de integrantes

### Comportamento

- a lista filtra dinamicamente enquanto o usuário digita
- ao tocar em um integrante, o app tenta iniciar um pedido
- se já existir pedido aberto para aquele integrante no dia atual, o app reaproveita o pedido existente
- após selecionar, a navegação substitui a tela atual e entra em `Novo pedido`

## 3. Novo pedido

Arquivo principal: [NovoPedidoScreen.tsx](/Users/handersonfrota/Abutres/Projetos/bar-13/src/screens/NovoPedidoScreen.tsx)

### Objetivo

É a tela operacional principal do balcão. Aqui o atendente monta o pedido em tempo real.

### O que a tela exibe

- nome e patente do integrante
- número do pedido
- data e hora do pedido
- total atualizado em tempo real
- busca por item
- atalhos para cadastrar item ou importar CSV
- grade de cards de itens disponíveis
- lista dos itens já incluídos no pedido
- ações de cancelar pedido e fechar conta

### Comportamento ao adicionar item

- o app verifica se há estoque
- se houver estoque, decrementa a quantidade no cadastro do item
- se o item já existir no pedido, incrementa a quantidade da linha
- se ainda não existir, cria uma nova linha no pedido
- o total do pedido é recalculado

### Comportamento ao remover item

- remove uma unidade da linha
- devolve uma unidade ao estoque
- recalcula subtotal e total
- se aquele item era a última linha restante, o pedido é marcado como cancelado

### Restrições

- somente pedidos com status `ABERTO` podem ser editados
- não é possível fechar a conta se não houver item no pedido

## 4. Fechamento da conta

Arquivo principal: [FechamentoContaScreen.tsx](/Users/handersonfrota/Abutres/Projetos/bar-13/src/screens/FechamentoContaScreen.tsx)

### Objetivo

Centralizar a conferência final da conta, a cobrança e a confirmação manual de pagamento.

### O que a tela exibe

- dados do integrante
- data e hora do pedido
- total da conta
- status atual
- método de pagamento, quando já houver
- lista de itens da conta em modo bloqueado
- QR Code PIX configurado
- chave PIX textual
- comprovante anexado, quando existir
- ações conforme o status do pedido

### Ações possíveis conforme o estado

Se o pedido estiver `ABERTO`:

- `Fechar conta`

Se o pedido estiver `FECHADO_AGUARDANDO_PAGAMENTO`:

- `Reabrir conta`
- `Marcar como pago`
- `Copiar mensagem`

Sempre:

- `Voltar para a home`

Se houver comprovante salvo:

- `Abrir / compartilhar comprovante`

Se estiver `PAGO` via `PIX`:

- `Trocar comprovante`

### Comportamento de pagamento

Ao tocar em `Marcar como pago`, o usuário escolhe:

- `PIX`
- `Dinheiro`

Para `PIX`:

- o app abre o seletor de documento
- aceita imagem ou PDF
- copia o comprovante para a pasta interna do app
- grava o pedido como `PAGO`
- salva método de pagamento e metadados do comprovante

Para `Dinheiro`:

- o app pede confirmação manual
- grava o pedido como `PAGO`
- não exige comprovante

### Reabertura

- a conta pode ser reaberta somente se ainda estiver pendente
- conta paga não pode ser reaberta
- conta cancelada não pode ser reaberta

## 5. Histórico

Arquivo principal: [HistoricoScreen.tsx](/Users/handersonfrota/Abutres/Projetos/bar-13/src/screens/HistoricoScreen.tsx)

### Objetivo

Permitir consulta de pedidos por dia específico.

### O que a tela exibe

- data atual do filtro
- botões `Dia anterior`, `Hoje` e `Próximo dia`
- resumo com quantidade de pedidos e total do dia
- lista de pedidos daquela data

### Comportamento

- cada pedido pode ser aberto novamente para inspeção
- pedidos abertos levam para `Novo pedido`
- pedidos fechados, pagos ou cancelados levam para `Fechamento da conta`

## 6. Relatórios

Arquivo principal: [RelatoriosScreen.tsx](/Users/handersonfrota/Abutres/Projetos/bar-13/src/screens/RelatoriosScreen.tsx)

### Objetivo

Oferecer visão analítica por período, usando a mesma base que alimenta a exportação CSV.

### O que a tela exibe

- filtro de período com data inicial e final
- atalhos rápidos para `Hoje`, `7 dias` e `30 dias`
- botão para abrir exportação CSV
- cartões de métricas
- lista de pedidos do período
- consolidado de devedores
- resumo consolidado de consumo por item

### Métricas mostradas

- quantidade de pedidos
- total vendido
- total pago
- total pendente
- quantidade de devedores
- quantidade de comprovantes

### Comportamento

- o filtro de datas recarrega pedidos e consolidados
- o consolidado de devedores agrupa por nome e patente
- o consolidado de consumo agrupa por nome do item salvo no snapshot

## 7. Pendentes

Arquivo principal: [PendentesScreen.tsx](/Users/handersonfrota/Abutres/Projetos/bar-13/src/screens/PendentesScreen.tsx)

### Objetivo

Listar contas fechadas que ainda aguardam marcação manual como pagas.

### O que a tela exibe

- filtro por período
- lista de pedidos pendentes
- botão `Copiar mensagem`
- botão `Abrir pagamento`

### Comportamento

- o botão `Copiar mensagem` monta a cobrança com base na configuração atual
- o botão `Abrir pagamento` leva para a tela de fechamento da conta

## 8. Configurações

Arquivo principal: [ConfiguracoesScreen.tsx](/Users/handersonfrota/Abutres/Projetos/bar-13/src/screens/ConfiguracoesScreen.tsx)

### Objetivo

Concentrar dados fixos do bar e operações administrativas.

### O que a tela exibe

- nome do bar
- chave PIX
- texto padrão de cobrança
- área de QR Code fixo
- atalhos administrativos

### Comportamento dos campos

- os campos podem ser salvos manualmente
- também existe salvamento automático ao sair do campo
- o QR Code é escolhido da galeria e copiado para armazenamento interno

### Operações disponíveis

- gerenciar integrantes
- gerenciar itens
- importar integrantes via CSV
- importar itens via CSV
- abrir exportação CSV
- zerar configurações e dados

### Ação destrutiva

`Zerar configurações e dados` apaga:

- configurações
- comprovantes
- imagem do QR Code
- exportações salvas no diretório interno
- base SQLite local

## 9. Cadastro de integrantes

Arquivo principal: [GerenciarIntegrantesScreen.tsx](/Users/handersonfrota/Abutres/Projetos/bar-13/src/screens/GerenciarIntegrantesScreen.tsx)

### Objetivo

Permitir cadastro, edição, busca e exclusão manual de integrantes.

### O que a tela exibe

- formulário de criação/edição
- botão de salvar
- botão de importar CSV ou cancelar edição
- campo de busca
- lista de integrantes
- ações de editar e excluir

### Regras

- nome e patente são obrigatórios
- não pode existir duplicidade por nome normalizado
- integrantes com pedidos no histórico não podem ser excluídos

## 10. Cadastro de itens

Arquivo principal: [GerenciarItensScreen.tsx](/Users/handersonfrota/Abutres/Projetos/bar-13/src/screens/GerenciarItensScreen.tsx)

### Objetivo

Permitir cadastro, edição, busca, filtro por estoque e exclusão manual de itens.

### O que a tela exibe

- formulário de criação/edição
- campos de número, nome, valor e estoque
- campo de busca
- alternância para mostrar só itens sem estoque
- cards com ações de editar e excluir

### Regras

- `numero_item` deve ser inteiro e maior que zero
- valor deve ser maior que zero
- estoque deve ser inteiro maior ou igual a zero
- não pode existir duplicidade por `numero_item`
- itens usados em pedidos no histórico não podem ser excluídos

## 11. Importação CSV

Arquivo principal: [ImportacaoCsvScreen.tsx](/Users/handersonfrota/Abutres/Projetos/bar-13/src/screens/ImportacaoCsvScreen.tsx)

### Objetivo

Importar integrantes ou itens a partir de arquivo CSV local.

### Modos

- importação de integrantes
- importação de itens

### Layout esperado dos arquivos

Para integrantes:

- `nome,patente`

Para itens:

- `numero_item,nome,valor,qtdestoque`

### O que a tela exibe

- quantidade atual de registros no banco
- botão para selecionar arquivo CSV
- botão para limpar a base atual
- resultado da última importação

### Comportamento

- o app lê o arquivo localmente
- valida cabeçalhos
- valida campos obrigatórios
- deduplica as linhas do CSV antes de gravar
- faz `upsert`, inserindo novos registros e atualizando existentes

### Ação destrutiva

Limpar integrantes ou limpar itens também remove:

- `pedido_itens`
- `pedidos`
- o histórico relacionado

## 12. Exportação CSV

Arquivo principal: [ExportacaoCsvScreen.tsx](/Users/handersonfrota/Abutres/Projetos/bar-13/src/screens/ExportacaoCsvScreen.tsx)

### Objetivo

Gerar arquivos CSV locais com base em um período.

### O que a tela exibe

- filtro de data inicial e final
- botões para exportar:
- vendas por período
- devedores por período
- consolidado por período

### Comportamento

- o arquivo é gerado localmente
- quando o dispositivo suporta compartilhamento, o app abre o fluxo de share
- o nome do arquivo inclui tipo, período e carimbo de data/hora
