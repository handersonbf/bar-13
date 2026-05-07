# Funcionalidades do Projeto

## 1. Cadastro e busca de integrantes

O app permite manter uma base local de integrantes usada no início dos pedidos.

### O que a funcionalidade faz

- cadastro manual
- edição manual
- exclusão manual
- busca incremental por nome
- importação por CSV
- atualização por reimportação

### Regras de negócio

- nome é obrigatório
- patente é obrigatória
- o nome é normalizado para evitar duplicidade por diferenças de acento, caixa e espaços
- não é permitido excluir integrante que já tenha pedido salvo

## 2. Cadastro e busca de itens

O app mantém um catálogo local de itens vendidos pelo bar.

### O que a funcionalidade faz

- cadastro manual
- edição manual
- exclusão manual
- busca por nome
- filtro de itens sem estoque
- importação por CSV
- atualização por reimportação

### Regras de negócio

- nome é obrigatório
- não pode existir duplicidade por nome normalizado
- valor deve ser positivo
- estoque não pode ser negativo
- item já usado em pedido não pode ser excluído

## 3. Controle de estoque

O estoque é controlado diretamente durante a montagem do pedido.

### Comportamento

- ao adicionar item, o estoque do cadastro é reduzido em 1
- ao remover unidade do pedido, o estoque é devolvido em 1
- ao cancelar pedido aberto, todo o estoque do pedido é devolvido
- item com estoque zerado aparece indisponível para adição

### Limitação atual

- o saldo ainda é local por cadastro (`qtd_estoque`)
- estoque por aparelho e transferência entre aparelhos entram na próxima fase

## 4. Abertura de pedido

O pedido é iniciado a partir da seleção de um integrante.

### Regras

- o pedido nasce com status `ABERTO`
- data e hora são registradas automaticamente
- nome e patente do integrante são congelados em snapshot no pedido
- se o integrante já tiver um pedido aberto no mesmo dia, o app reaproveita esse pedido em vez de criar outro

## 5. Montagem do pedido

Durante a operação no balcão, os itens são adicionados por cards clicáveis.

### O que é salvo

- item original vinculado
- nome do item em snapshot
- valor unitário em snapshot
- quantidade
- subtotal

### Benefício do snapshot

Se o preço ou o nome do item mudar no cadastro depois, o histórico do pedido continua fiel ao momento da venda.

### Observação

- o schema ainda possui `numero_item_snapshot`
- o fluxo atual do app não depende desse número para operação ou consulta

## 6. Cancelamento de pedido

Existe cancelamento preservado em histórico.

### Situações possíveis

- cancelamento manual do pedido aberto
- cancelamento automático quando o último item é removido

### Efeito do cancelamento

- o pedido fica marcado como cancelado
- o total fica zerado
- a data de cancelamento é registrada
- o pedido não volta a ser editável
- o histórico continua preservado

## 7. Fechamento da conta

Quando o atendente encerra a montagem, o pedido passa para cobrança.

### Regras

- não é possível fechar pedido sem item
- ao fechar, o status muda para `FECHADO_AGUARDANDO_PAGAMENTO`
- a partir daí o pedido sai do modo de edição

## 8. Reabertura da conta

A conta pode voltar para edição apenas em situação controlada.

### Regras

- só pode ser reaberta se estiver `FECHADO_AGUARDANDO_PAGAMENTO`
- conta `PAGO` não pode ser reaberta
- conta cancelada não pode ser reaberta

## 9. Pagamento PIX

O app suporta confirmação manual de pagamento via PIX.

### O que a funcionalidade faz

- exibe QR Code fixo configurado
- exibe chave PIX textual
- permite anexar comprovante em imagem ou PDF
- grava o pagamento com método `PIX`

### Regra obrigatória

- não é possível marcar como pago via PIX sem comprovante

## 10. Pagamento em cartão

O app também suporta registro manual de pagamento em `CARTAO_CREDITO`.

### O que a funcionalidade faz

- permite anexar comprovante em imagem ou PDF
- grava o pagamento com método `CARTAO_CREDITO`
- exibe o método no histórico, nos cards e nas exportações

### Limitação importante

- não existe integração com maquininha, TEF, adquirente ou gateway no código atual

## 11. Pagamento em dinheiro

O app também suporta baixa manual em dinheiro.

### O que a funcionalidade faz

- solicita confirmação final do operador
- grava o pagamento com método `DINHEIRO`
- não exige comprovante

## 12. Comprovantes

Comprovantes são tratados como anexos locais vinculados ao pedido.

### O que a funcionalidade faz

- aceita imagem ou PDF
- copia o arquivo para a pasta interna do app
- permite abrir ou compartilhar o comprovante
- permite substituir comprovante depois do pagamento, desde que o método não seja `DINHEIRO`

### Regras

- comprovante só pode ser trocado quando o pedido já está `PAGO`
- comprovante existe para pagamentos `PIX` e `CARTAO_CREDITO`

## 13. Mensagem de cobrança

O app gera uma cobrança pronta para copiar.

### A mensagem inclui

- cabeçalho com nome do bar
- data do pedido
- chave PIX
- lista formatada dos itens
- total em reais

### Fonte do conteúdo

O texto vem do modelo salvo em configurações, com substituição de placeholders.

Placeholders usados hoje:

- `{data_do_pedido}`
- `{chave_pix}`
- `{itens_consumidos_formatados}`
- `{total_formatado}`

## 14. Histórico por data

O histórico permite consultar pedidos salvos em uma data específica.

### O que mostra

- pedidos abertos
- pedidos fechados aguardando pagamento
- pedidos pagos
- pedidos cancelados

### Uso prático

Serve para conferência diária e recuperação rápida de contas antigas.

## 15. Pendentes de pagamento

Existe uma visão separada só para contas ainda não quitadas.

### Critério usado

- pedidos com status `FECHADO_AGUARDANDO_PAGAMENTO`
- pedidos cancelados ficam fora dessa lista

### Ações disponíveis

- copiar cobrança
- abrir tela de pagamento

## 16. Relatórios por período

O módulo de relatórios oferece consolidação operacional por intervalo de datas.

### Métricas disponíveis

- total de pedidos válidos
- total vendido
- total pago
- total pendente
- quantidade de devedores
- quantidade de comprovantes anexados

### Consolidados disponíveis

- lista de pedidos no período
- devedores agrupados por nome e patente
- consumo agrupado por item
- estoque com quantidade vendida no período e saldo atual do cadastro

## 17. Exportação CSV

O app gera arquivos CSV locais a partir dos mesmos filtros do relatório.

### Exportações atuais

- vendas por período
- devedores por período
- consolidado por período
- resumo de consumo por período

### Garantias do fluxo

- respeita data inicial e data final
- gera arquivo local
- usa nome claro de arquivo
- tenta compartilhar automaticamente quando possível

## 18. Guia rápido do operador

O app possui uma tela de ajuda operacional para consulta no próprio celular.

### O que a funcionalidade faz

- resume o primeiro uso
- orienta a rotina de balcão
- explica cobrança por PIX, cartão e dinheiro
- resume pendentes, histórico, relatórios e exportações CSV
- oferece atalhos para novo pedido, configurações, cadastros, importações, pendentes, histórico, relatórios e exportação CSV
- exibe retorno ao guia nas telas abertas por esses atalhos

### Uso prático

Serve para treinamento rápido e para consulta durante a operação sem abrir documentação externa.

## 19. Configurações operacionais

O app tem uma configuração única central no SQLite.

### Campos configuráveis

- nome do bar
- chave PIX
- imagem do QR Code
- texto padrão de cobrança

### Comportamento

- persistência local
- salvamento manual
- salvamento automático ao sair do campo

## 20. Reset total do app

Existe uma operação administrativa para zerar tudo.

### O que é apagado

- integrantes
- itens
- pedidos
- itens de pedido
- configuração
- comprovantes
- QR Code salvo
- outros arquivos locais do diretório interno

### Uso esperado

Deve ser usada apenas quando houver decisão consciente de limpar completamente a operação local.

## 21. Identidade de aparelho para sincronização

O app mantém identidade própria por dispositivo para suportar importação e exportação offline.

### O que a funcionalidade faz

- gera `device_id` fixo na configuração local
- permite editar apenas o `nome_aparelho`
- registra último horário de exportação e importação

### Regras

- `device_id` não muda depois de criado
- alterar `nome_aparelho` não quebra sincronização existente

## 22. IDs globais (`sync_id`)

Entidades principais agora possuem identificador global de sincronização.

### O que a funcionalidade faz

- atribui `sync_id` em integrantes, itens, pedidos e itens do pedido
- usa `sync_id` para deduplicar importação entre aparelhos

### Regras

- `id` local continua existindo para relacionamento interno
- `sync_id` é usado para reconciliação entre bases diferentes

## 23. Eventos de sincronização idempotentes

Mudanças operacionais relevantes passam a gerar eventos locais.

### O que a funcionalidade faz

- grava eventos em `sync_events` com `event_id`, origem e payload
- registra criação e atualização de integrantes e itens
- registra criação, alteração de itens, fechamento, reabertura, pagamento e cancelamento de pedidos
- registra anexação/troca de comprovante

### Regras

- evento já importado não é reaplicado
- importação deve manter consistência em transação

## 24. Pacote de sincronização offline (`.bar13sync`)

A troca entre aparelhos é feita por arquivo local, sem backend.

### O que a funcionalidade faz

- exporta pacote JSON com metadados do aparelho, eventos e blobs
- importa pacote com resumo prévio e alertas de segurança
- registra pacotes importados para bloquear duplicidade
- mantém aparelhos conhecidos e histórico de origem

### Alertas do fluxo

- pacote já importado
- pacote mais antigo que último da mesma origem
- pacote exportado pelo mesmo aparelho atual

## 25. Comprovantes sincronizáveis

Comprovantes passaram a participar do pacote de sincronização.

### O que a funcionalidade faz

- registra blobs de comprovante com `blob_id` e hash
- exporta anexo em base64 no pacote
- importa anexo para diretório local e religa o pedido ao novo caminho local

### Regras

- blobs iguais são deduplicados por hash
- pedido importado usa o comprovante local recém gravado no aparelho de destino
