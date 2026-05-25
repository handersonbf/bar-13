# Especificacao para replica Android nativa

Este documento descreve o estado atual implementado do `Bar13` para servir como insumo de uma nova implementacao 100% Android. O objetivo da nova versao deve ser reproduzir o comportamento atual do app Expo/React Native, preservando fluxo operacional, telas, dados locais, regras de negocio, arquivos e identidade visual.

Fontes principais conferidas no codigo:

- `App.tsx`
- `src/navigation/AppNavigator.tsx`
- `src/screens/*`
- `src/components/*`
- `src/constants/theme.ts`
- `src/database/*`
- `src/repositories/*`
- `src/services/*`
- `src/types/*`
- `src/utils/*`

## 1. Visao do produto

O Bar13 e um app mobile local-first para operacao de balcao. Ele registra pedidos por integrante, baixa estoque imediatamente, fecha contas, registra pagamento manual por PIX, dinheiro ou cartao de credito, anexa comprovantes, consulta historico, exibe relatorios, exporta CSVs e permite sincronizacao manual entre aparelhos por arquivo.

A operacao diaria nao depende de backend. O SQLite local e a fonte principal de verdade. Internet so e usada quando o operador decide enviar dados para uma central gerencial no Google Sheets via Web App.

## 2. Principios que a versao Android deve preservar

- Funcionar offline para o fluxo principal.
- Usar banco local SQLite.
- Nao exigir login online.
- Nao depender de Firebase, Supabase ou servidor para abrir pedido, vender, cobrar ou consultar historico.
- Preservar snapshots de integrante, operador e item dentro do pedido.
- Manter comprovantes e QR Code em armazenamento local do app.
- Continuar aceitando sincronizacao manual por arquivo `.bar13sync`.
- Continuar exportando CSVs compartilhaveis pelo Android.
- Bloquear pedido novo se nenhum operador ativo estiver selecionado no aparelho.
- Manter textos operacionais em portugues-BR.

## 3. Identidade visual

O app atual tem visual escuro, operacional e de alto contraste. A aparencia e mais utilitaria do que promocional.

### Paleta

Use estes tokens como referencia:

| Uso | Hex |
| --- | --- |
| Fundo principal | `#080808` |
| Superficie de cards e barras | `#141414` |
| Superficie elevada e inputs | `#1C1C1C` |
| Borda | `#2A2A2A` |
| Primaria, dourado | `#D4A437` |
| Primaria apagada | `#8D6A1D` |
| Acento vinho | `#751C28` |
| Sucesso | `#2E9D68` |
| Alerta | `#D97A22` |
| Perigo | `#C44545` |
| Texto principal | `#F4F1EA` |
| Texto secundario | `#A7A29A` |
| Texto fraco | `#7A766F` |
| Chip | `#202020` |
| Branco de fundo de imagem QR | `#FFFFFF` |
| Botao secundario escuro | `#2A1908` |
| Press de item | `#21180B` |
| Input de preset ativo | `#221B0E` |
| Botao destrutivo borda | `#9B2A3A` |

### Espacamento e raios

- Espacamentos: `xs 6`, `sm 10`, `md 16`, `lg 22`, `xl 28`.
- Raios: `sm 10`, `md 16`, `lg 24`.
- Cards principais usam raio `24`, borda `1px`, fundo `#141414`, sombra preta suave.
- Botoes e inputs usam raio `16`.
- A tela usa padding horizontal e vertical de `16`.
- A maioria das telas e scrollavel.

### Tipografia e hierarquia

Nao ha fonte customizada. Use fonte padrao Android, com pesos fortes.

- Marca na Home: tamanho 34, peso 900, cor primaria.
- Titulo de card: tamanho 19, peso 800, cor texto principal.
- Subtitulo de card: tamanho 13, cor texto secundario, line-height aproximado 18.
- Labels de inputs: tamanho 12, peso 700, cor texto secundario.
- Valores financeiros importantes: tamanho 18 a 24, peso 800 ou 900, cor primaria.
- Botoes: tamanho 15, peso 700.

### Componentes visuais compartilhados

Replicar estes componentes ou equivalentes nativos:

- `ScreenContainer`: fundo `#080808`, scroll vertical por padrao, padding `16`, gap `16`.
- `SectionCard`: card com titulo opcional, subtitulo opcional e conteudo interno em coluna.
- `AppButton`: variantes `primary`, `secondary`, `danger`, `outline`, altura minima `48`, loading opcional, disabled com opacidade `0.45`.
- `SearchInput`: input com icone de lupa, fundo elevado, altura minima `52`, placeholder em texto fraco.
- `StatCard`: card compacto com label secundaria e valor dourado.
- `PedidoCard`: card de pedido com nome, meta, chip de status, itens, total, pagamento, comprovante e footer.
- `ItemCard`: card em grade de duas colunas, mostra nome, preco, estoque e acao.
- `OrderItemRow`: linha de item do pedido com nome, quantidade, preco unitario, subtotal e botoes `-` e `+` se nao estiver bloqueada.
- `DateRangeFilter`: dois inputs `AAAA-MM-DD`, botoes preset `Hoje`, `7 dias`, `30 dias` e texto de ajuda.
- `EmptyState`: mensagem para listas vazias.
- `ReturnToGuideButton`: aparece em telas acessadas a partir do guia quando ha parametro de retorno.

## 4. Navegacao

A navegacao atual combina abas principais e pilha de telas auxiliares.

### Abas inferiores

Barra inferior com fundo `#141414`, borda superior `#2A2A2A`, altura aproximada `72`, icones Ionicons e labels em peso 700.

Abas:

| Rota | Titulo | Icone atual |
| --- | --- | --- |
| `Home` | `Bar13` | `home` |
| `Historico` | `Historico` | `calendar` |
| `Relatorios` | `Relatorios` | `stats-chart` |
| `Pendentes` | `Pendentes` | `alert-circle` |
| `Configuracoes` | `Configuracoes` | `settings` |

### Stack

Telas empilhadas:

- `SelecionarIntegrante`
- `GerenciarIntegrantes`
- `GerenciarItens`
- `GerenciarOperadores`
- `NovoPedido`
- `FechamentoConta`
- `ImportacaoCsv`
- `Sincronizacao`
- `ExportacaoCsv`
- `Ajuda`

Headers usam fundo `#141414`, texto `#F4F1EA`, titulo peso 800.

## 5. Bootstrap do app

Ao abrir:

1. Montar provider de area segura.
2. Inicializar banco local.
3. Criar tabelas e indices se nao existirem.
4. Adicionar colunas faltantes em migracoes idempotentes.
5. Garantir configuracao principal `id = 1`.
6. Executar bootstrap de sincronizacao: identidade fixa do aparelho, `sync_id` faltantes, eventos base e registro do aparelho local.
7. Liberar navegacao.

Enquanto inicializa, mostrar tela escura com:

- marca `Bar13` em dourado
- spinner dourado
- texto `Preparando banco local e modulos operacionais...`
- se houver erro, texto em vermelho.

## 6. Modelo de dados local

Banco atual: `bar13.db`.

### `integrantes`

Consumidores cadastrados.

Campos:

- `id`
- `sync_id`
- `nome`
- `patente`
- `created_at`
- `updated_at`

Regras:

- `nome` unico no schema com `COLLATE NOCASE`.
- O app tambem normaliza nome removendo acento, caixa e espacos extras para bloquear duplicidade.
- Busca por nome e filtrada em memoria apos leitura ordenada.

### `itens_bar`

Produtos vendidos.

Campos:

- `id`
- `sync_id`
- `numero_item`
- `nome`
- `valor`
- `qtd_estoque`
- `ativo`
- `created_at`
- `updated_at`

Regras:

- Interface trabalha por nome, valor e estoque.
- `numero_item` existe internamente, mas nao e exibido no fluxo atual.
- Somente `ativo = 1` aparece nas listas usuais.
- Nome tambem e deduplicado por normalizacao.
- Valor deve ser maior que zero.
- Estoque deve ser inteiro maior ou igual a zero.

### `operadores`

Equipe que pode assumir o aparelho.

Campos:

- `id`
- `sync_id`
- `nome`
- `ativo`
- `created_at`
- `updated_at`

Regras:

- Nome obrigatorio e unico por normalizacao.
- Apenas operador ativo pode assumir o aparelho.
- Se um operador atual for desativado, a selecao atual do aparelho e limpa.

### `pedidos`

Conta principal.

Campos:

- `id`
- `sync_id`
- `integrante_id`
- `nome_integrante_snapshot`
- `patente_integrante_snapshot`
- `operador_sync_id_snapshot`
- `nome_operador_snapshot`
- `device_id_origem`
- `data_pedido`
- `hora_pedido`
- `data_hora_pedido`
- `status`
- `total`
- `cancelado`
- `cancelado_em`
- `metodo_pagamento`
- `comprovante_uri`
- `comprovante_nome`
- `comprovante_mime_type`
- `comprovante_adicionado_em`
- `created_at`
- `updated_at`

Status validos:

- `ABERTO`
- `FECHADO_AGUARDANDO_PAGAMENTO`
- `PAGO`

Cancelamento e uma flag separada: `cancelado = 1`, nao um status de banco.

### `pedido_itens`

Linhas do pedido.

Campos:

- `id`
- `sync_id`
- `pedido_id`
- `item_id`
- `numero_item_snapshot`
- `nome_item_snapshot`
- `valor_unitario_snapshot`
- `quantidade`
- `subtotal`

Regras:

- Cada linha preserva snapshot do item vendido.
- Se adicionar o mesmo item no mesmo pedido, incrementa quantidade e subtotal.
- Se remover uma unidade, decrementa quantidade ou remove linha.

### `configuracoes`

Registro unico `id = 1`.

Campos:

- `device_id`
- `nome_aparelho`
- `operador_atual_sync_id`
- `operador_atual_nome`
- `chave_pix`
- `caminho_imagem_qr_code`
- `nome_bar`
- `texto_padrao_cobranca`
- `central_web_app_url`
- `central_token`
- `sync_sequence`
- `last_exported_at`
- `last_imported_at`

Valores padrao importantes:

- `nome_aparelho`: `Caixa`
- `nome_bar`: `Bar13`
- `texto_padrao_cobranca`: template com placeholders:
  - `{data_do_pedido}`
  - `{chave_pix}`
  - `{itens_consumidos_formatados}`
  - `{total_formatado}`

### Tabelas de sincronizacao

Existem tambem:

- `sync_events`
- `sync_imports`
- `known_devices`
- `sync_blobs`

Elas guardam eventos idempotentes, pacotes importados, aparelhos conhecidos e arquivos anexos usados na sincronizacao offline.

### Central gerencial

Tabela:

- `central_push_batches`

Guarda lotes pendentes/enviados/com erro para envio ao Google Sheets.

Campos centrais:

- `batch_id`
- `status`
- `payload_json`
- `response_json`
- `error_message`
- `created_at`
- `last_attempt_at`
- `last_success_at`

## 7. Regras de negocio globais

### Operador atual

Antes de abrir, editar, cancelar, fechar, reabrir ou pagar pedido, deve existir operador atual valido e ativo no aparelho.

Se nao houver operador atual:

- bloquear acao
- mostrar mensagem para selecionar operador
- oferecer atalho para `Gerenciar operadores` quando a origem for Home.

### Pedido

- So pedidos `ABERTO` e nao cancelados podem ser editados.
- Um integrante nao pode ter mais de um pedido `ABERTO` no mesmo dia.
- Ao iniciar pedido para integrante com pedido aberto no dia, reutilizar pedido existente.
- Pedido sem item nao pode ser fechado.
- Fechar pedido muda status para `FECHADO_AGUARDANDO_PAGAMENTO`.
- Pedido pendente pode ser reaberto.
- Pedido pago nao pode ser reaberto.
- Pedido cancelado nao pode ser reaberto.
- Cancelar pedido aberto devolve todo estoque reservado e marca `cancelado = 1`, `total = 0`.
- Remover o ultimo item do pedido tambem marca o pedido como cancelado.
- Pedido cancelado permanece no historico.

### Estoque

- Adicionar item baixa `qtd_estoque` imediatamente.
- Remover unidade devolve uma unidade ao estoque.
- Cancelar pedido devolve todas as quantidades do pedido.
- Item com estoque `0` aparece na grade, mas desabilitado e sinalizado como esgotado.
- Relatorio de estoque compara vendido no periodo com saldo atual local do cadastro.

### Pagamento

Metodos:

- `PIX`
- `DINHEIRO`
- `CARTAO_CREDITO`

Regras:

- Pedido `ABERTO` nao pode ser marcado como pago.
- Pedido cancelado nao pode ser marcado como pago.
- `PIX` exige comprovante.
- `CARTAO_CREDITO` exige comprovante.
- `DINHEIRO` exige apenas confirmacao manual.
- Comprovantes aceitos: imagem ou PDF.
- Comprovante e copiado para pasta local do app.
- Pedido pago com comprovante permite troca de comprovante.
- Pedido em dinheiro nao exibe troca de comprovante.
- Nao existe integracao com gateway, maquininha, TEF ou leitura automatica de pagamento.

## 8. Especificacao tela por tela

### 8.1 Home

Arquivo atual: `src/screens/HomeScreen.tsx`.

Objetivo: tela inicial da operacao, resumo do dia e atalhos principais.

Dados carregados ao focar:

- configuracao atual
- estatisticas da Home
- pedidos abertos
- resumo da fila da central

Layout:

- Botao de retorno ao guia, quando aplicavel.
- Card de apresentacao:
  - `Abutres - Bar13`
  - nome do bar configurado ou `Bar13`
  - texto `Solucao rapida e robusta para o Bar dos Abutres.`
  - operador atual ou `Nenhum selecionado`
- Duas linhas de `StatCard`:
  - `Pedidos hoje`
  - `Total hoje`
  - `Pendentes hoje`
  - `Abertos agora`
- Card `Acoes rapidas`:
  - `Novo pedido`
  - `Pendentes de pagamento`
  - `Enviar para a central`
  - `Exportar CSVs`
  - `Guia rapido`
  - texto de estado da central: configurada ou pendente de configuracao.
- Card `Pedidos em aberto`:
  - vazio: mensagem `Nenhum pedido aberto`
  - lista: `PedidoCard` com botao `Continuar pedido`

Comportamentos:

- `Novo pedido`: se nao houver operador atual, alerta `Selecione o operador` e opcao `Abrir operadores`; se houver, navega para `SelecionarIntegrante`.
- `Pendentes de pagamento`: navega para aba Pendentes.
- `Enviar para a central`: cria lote snapshot e envia todos os lotes pendentes; mostra progresso `Enviando X/Y (Z%)`.
- `Exportar CSVs`: navega para `ExportacaoCsv`.
- `Guia rapido`: navega para `Ajuda`.

### 8.2 Selecionar integrante

Arquivo atual: `src/screens/SelecionarIntegranteScreen.tsx`.

Objetivo: escolher consumidor antes de iniciar pedido.

Layout:

- Card `Buscar integrante`:
  - input com placeholder `Nome do integrante`
  - botoes `Cadastrar integrante` e `Importar CSV`
- Card `Integrantes disponiveis`:
  - se vazio, `EmptyState` e botoes para cadastrar/importar
  - se houver resultados, lista de cards com nome, patente e acao `Selecionar`

Comportamentos:

- Busca filtra por nome com `useDeferredValue`.
- Toque no integrante chama `iniciarPedido`.
- Se houver pedido aberto para o integrante no dia, reutiliza o ID existente.
- Depois substitui a rota por `NovoPedido`.
- Erros aparecem por alerta.

### 8.3 Novo pedido

Arquivo atual: `src/screens/NovoPedidoScreen.tsx`.

Objetivo: tela principal do balcao para montar pedido.

Entrada:

- `pedidoId`

Dados carregados:

- pedido detalhado
- itens ativos filtrados pela busca

Layout:

- Card do pedido:
  - nome do integrante
  - patente e numero do pedido
  - data e hora
  - responsavel, se houver
  - total em tempo real
- Card `Buscar item`:
  - input `Nome do item`
  - botoes `Cadastrar item` e `Importar CSV`
  - feedback verde `+ item adicionado`
  - grade de `ItemCard` em duas colunas
- Card `Itens do pedido`:
  - vazio: `Pedido sem itens`
  - itens: `OrderItemRow` com controles `-` e `+`
- Rodape:
  - `Cancelar pedido`
  - `Fechar conta`

Comportamentos:

- Adicionar item:
  - se estoque `<= 0`, alerta item esgotado
  - baixa estoque
  - cria ou incrementa linha no pedido
  - recalcula total
  - registra evento de sincronizacao
- Remover item:
  - devolve estoque
  - decrementa quantidade ou remove linha
  - se era a ultima linha do pedido, marca pedido como cancelado, alerta e volta ao topo da navegacao
- `Cancelar pedido`:
  - confirma com alerta destrutivo
  - devolve estoque de todos os itens
  - marca pedido como cancelado
  - volta para raiz
- `Fechar conta`:
  - desabilitado quando nao ha itens
  - confirma com alerta
  - muda status para `FECHADO_AGUARDANDO_PAGAMENTO`
  - substitui tela por `FechamentoConta`

### 8.4 Fechamento da conta

Arquivo atual: `src/screens/FechamentoContaScreen.tsx`.

Objetivo: conferir conta, apresentar PIX, copiar cobranca e registrar pagamento.

Entrada:

- `pedidoId`

Dados carregados:

- pedido detalhado
- configuracao

Layout:

- Card resumo:
  - nome e patente
  - data e hora formatadas
  - total da conta
  - status atual, incluindo `CANCELADO` se flag cancelado estiver ativa
  - responsavel
  - pagamento confirmado, quando existir
- Card `Itens da conta`:
  - `OrderItemRow` bloqueado, sem botoes `+` e `-`
- Card `Pagamento PIX`:
  - imagem do QR Code se configurada, em fundo branco
  - vazio: `QR Code nao configurado`
  - label `Chave PIX`
  - chave ou `Nao configurada`
- Card `Comprovante anexado`, se existir:
  - subtitulo com nome do arquivo
  - preview se MIME for imagem
  - texto para PDF/outros
  - botao `Abrir / compartilhar comprovante`
  - botao `Trocar comprovante` se pedido esta `PAGO` e metodo nao e `DINHEIRO`
- Card `Registrar pagamento`, somente se status for `FECHADO_AGUARDANDO_PAGAMENTO` e nao cancelado:
  - texto explicativo
  - `PIX com comprovante`
  - `Cartao de credito`
  - `Dinheiro`
- Acoes finais:
  - `Fechar conta`, se pedido ainda estiver aberto
  - `Reabrir conta`, se pendente
  - `Copiar mensagem`, se pendente
  - `Voltar para a home`

Comportamentos:

- `PIX com comprovante`: abre seletor de documentos aceitando `image/*` e `application/pdf`; copia arquivo para pasta local com prefixo `comprovante_pedido_ID`; marca como `PAGO`.
- `Cartao de credito`: mesmo fluxo do PIX, mas metodo `CARTAO_CREDITO`.
- `Dinheiro`: alerta de confirmacao com valor; marca como `PAGO` sem comprovante.
- `Copiar mensagem`: monta mensagem de cobranca e grava na area de transferencia.
- `Reabrir conta`: permitido so para pendentes; volta para `NovoPedido`.
- `Abrir / compartilhar comprovante`: usa compartilhamento nativo se disponivel.
- `Trocar comprovante`: seleciona novo arquivo, atualiza pedido, registra evento e apaga arquivo antigo se for diferente.

### 8.5 Historico

Arquivo atual: `src/screens/HistoricoScreen.tsx`.

Objetivo: consultar pedidos por data especifica.

Layout:

- Card `Historico por data`:
  - data formatada
  - botoes `Dia anterior`, `Hoje`, `Proximo dia`
  - resumo `Pedidos: N - Total: R$`
- Lista:
  - vazia: `Nenhuma venda nesta data`
  - pedidos: `PedidoCard`

Comportamentos:

- Carrega pedidos de `data_pedido`.
- Total do dia soma `pedido.total` da lista.
- Pedido aberto e nao cancelado abre `NovoPedido`.
- Pedido fechado, pago ou cancelado abre `FechamentoConta`.
- Label do botao por estado:
  - cancelado: `Ver cancelamento`
  - pago: `Ver comprovante`
  - aberto: `Continuar pedido`
  - pendente: `Abrir fechamento`

### 8.6 Relatorios

Arquivo atual: `src/screens/RelatoriosScreen.tsx`.

Objetivo: visao analitica por periodo.

Filtro padrao:

- ultimos 30 dias.

Layout:

- Card `Relatorio por periodo`:
  - `DateRangeFilter`
  - botao `Abrir exportacao CSV`
- Cards:
  - `Pedidos`
  - `Vendido`
  - `Pago`
  - `Pendente`
  - `Devedores`
  - `Comprovantes`
- Card `Pedidos no periodo`
- Card `Consolidado de devedores`
- Card `Resumo consolidado de consumo`
- Card `Relatorio de estoque`

Regras de calculo:

- Periodo e normalizado por `clampPeriod`: se inicial > final, inverte.
- Total vendido soma pedidos nao cancelados.
- Total pago soma pedidos `PAGO` nao cancelados.
- Total pendente soma pedidos nao pagos e nao cancelados.
- Quantidade de pedidos ignora cancelados.
- Devedores sao pedidos `FECHADO_AGUARDANDO_PAGAMENTO`, agrupados por nome e patente.
- Consumo agrupa itens por nome snapshot.
- Estoque lista itens ativos e tambem itens vendidos que nao estejam mais ativos.

### 8.7 Pendentes

Arquivo atual: `src/screens/PendentesScreen.tsx`.

Objetivo: listar contas fechadas ainda nao pagas.

Filtro padrao:

- ultimos 30 dias.

Layout:

- Card `Pendentes de pagamento` com `DateRangeFilter`.
- Lista de `PedidoCard`.
- Empty state `Nenhum pendente encontrado`.

Comportamentos:

- Lista somente pedidos `FECHADO_AGUARDANDO_PAGAMENTO`.
- Cada pedido tem:
  - `Copiar mensagem`
  - `Abrir pagamento`
- Copiar mensagem usa configuracao atual e clipboard.
- Abrir pagamento navega para `FechamentoConta`.

### 8.8 Configuracoes

Arquivo atual: `src/screens/ConfiguracoesScreen.tsx`.

Objetivo: configurar aparelho, bar, PIX, QR Code, central e acessos administrativos.

Layout:

- Card `Dados do bar`:
  - `Nome deste aparelho`
  - `Nome do bar`
  - `Chave PIX`
  - `Texto padrao de cobranca`
  - `Salvar agora`
  - aviso de salvamento
- Card `QR Code fixo`:
  - preview da imagem ou texto vazio
  - `Escolher imagem do QR`
  - `Testar visualizacao do QR`
- Card `Operacoes`:
  - `Guia rapido do operador`
  - `Abrir sincronizacao`
  - `Gerenciar operadores`
  - `Gerenciar integrantes`
  - `Gerenciar itens`
  - `Importar integrantes via CSV`
  - `Importar itens via CSV`
  - `Abrir exportacao CSV`
  - `Zerar configuracoes e dados`
- Card `Central gerencial`:
  - `URL do Web App`
  - `Token da central`
  - operador atual neste aparelho

Comportamentos:

- Campos salvam no blur e tambem pelo botao.
- `nomeAparelho` vazio vira `Caixa`.
- `nomeBar` vazio vira `Bar13`.
- Escolher QR solicita permissao de galeria, abre seletor de imagem, permite edicao, copia para pasta do app e salva caminho.
- `Zerar configuracoes e dados` confirma alerta destrutivo, apaga tabelas operacionais, limpa configuracoes sensiveis locais e apaga pasta local `bar13`.

### 8.9 Gerenciar integrantes

Arquivo atual: `src/screens/GerenciarIntegrantesScreen.tsx`.

Objetivo: cadastro manual, edicao, busca e exclusao de integrantes.

Layout:

- Card `Novo integrante` ou `Editar integrante`:
  - input `Nome`
  - input `Patente`
  - botao `Cadastrar integrante` ou `Salvar edicao`
  - botao `Importar CSV` ou `Cancelar edicao`
- Card `Buscar integrante`
- Card `Lista de integrantes`

Comportamentos:

- Nome e patente obrigatorios.
- Patente e transformada para maiusculas.
- Nome e patente removem espacos duplicados.
- Duplicidade por nome normalizado bloqueia criacao/edicao.
- Tocar em card ou `Editar` carrega formulario.
- Excluir pede confirmacao.
- Excluir e bloqueado se integrante possui pedidos no historico.

### 8.10 Gerenciar itens

Arquivo atual: `src/screens/GerenciarItensScreen.tsx`.

Objetivo: cadastro manual, edicao, busca, filtro de sem estoque e exclusao de itens.

Layout:

- Card `Novo item` ou `Editar item`:
  - input `Nome`
  - input `Valor`
  - input `Estoque`
  - botao `Cadastrar item` ou `Salvar edicao`
  - botao `Importar CSV` ou `Cancelar edicao`
- Card `Buscar item`:
  - input de busca
  - switch `Mostrar so itens sem estoque`
- Card `Lista de itens`:
  - grade de duas colunas
  - cada card mostra nome, valor, estoque, editar e excluir

Comportamentos:

- Valor aceita entradas com virgula ou ponto e converte para numero.
- Valor deve ser maior que zero.
- Estoque deve ser inteiro >= 0.
- Nome duplicado bloqueia.
- Excluir e bloqueado se item ja foi usado em pedidos.

### 8.11 Gerenciar operadores

Arquivo atual: `src/screens/GerenciarOperadoresScreen.tsx`.

Objetivo: cadastrar equipe e definir operador atual do aparelho.

Layout:

- Card `Operador deste aparelho`:
  - se houver operador atual, mostra nome, dica e botao `Limpar operador atual`
  - se nao houver, empty state
- Card `Novo operador` ou `Editar operador`:
  - input `Nome`
  - `Cadastrar operador` ou `Salvar edicao`
  - `Limpar` ou `Cancelar edicao`
- Card `Buscar operador`
- Card `Equipe cadastrada`

Comportamentos:

- Lista inclui ativos e inativos.
- Card mostra `Ativo` ou `Inativo`, e `Operando este aparelho` quando for o atual.
- `Assumir aparelho` fica desabilitado se operador inativo.
- `Desativar` remove da selecao ativa; se era o atual, limpa operador atual.
- `Reativar` volta a permitir selecao.
- Edicao de nome atualiza tambem `operador_atual_nome` se esse operador esta selecionado.

### 8.12 Importacao CSV

Arquivo atual: `src/screens/ImportacaoCsvScreen.tsx`.

Entrada:

- `mode`: `integrantes` ou `itens`

Objetivo: importar cadastros via CSV e permitir limpar a base relacionada.

Layout:

- Card com titulo conforme modo:
  - `Importacao de integrantes`
  - `Importacao de itens`
- Subtitulo:
  - integrantes: `CSV esperado: nome,patente`
  - itens: `CSV esperado: nome,valor,qtdestoque`
- Texto `Registros atuais no banco local: N`
- Botao `Selecionar arquivo CSV`
- Botao destrutivo `Limpar integrantes` ou `Limpar itens`
- Card de resultado se houver:
  - inseridos
  - atualizados
  - processados

Comportamentos:

- Abre seletor de documento para `text/csv`, `text/comma-separated-values` e `text/plain`.
- Le arquivo em UTF-8.
- Parser usa virgula, aceita aspas e aspas escapadas.
- Remove BOM inicial.
- Ignora linhas vazias.
- Exige cabecalhos exatos em minusculo.
- Deduplica linhas do CSV por nome normalizado, mantendo a ultima ocorrencia.
- Faz upsert por nome normalizado.
- `Limpar integrantes` apaga integrantes, pedidos e itens de pedido.
- `Limpar itens` apaga itens, pedidos e itens de pedido.

### 8.13 Sincronizacao

Arquivo atual: `src/screens/SincronizacaoScreen.tsx`.

Objetivo: exportar/importar pacote local-first e enviar snapshot para central.

Layout:

- Card `Este aparelho`:
  - nome atual
  - identificador fixo
  - ultima exportacao
  - ultima importacao
- Card `Acoes`:
  - `Exportar sincronizacao`
  - `Importar sincronizacao`
- Card `Central gerencial`:
  - operador atual
  - configuracao da central pronta ou pendente
  - fila local
  - ultimo lote
  - erro do ultimo lote, se houver
  - `Enviar para a central`
- Card `Aparelhos conhecidos`
- Card `Pacotes importados`

Comportamentos:

- Exportar:
  - garante bootstrap de sync
  - gera arquivo `bar13_sync_DATA_HORA.bar13sync`
  - inclui eventos e comprovantes em base64
  - compartilha se Android permitir
  - atualiza `last_exported_at`
- Importar:
  - seleciona arquivo JSON ou qualquer extensao
  - previsualiza origem, horario, eventos novos, pedidos, integrantes, itens e comprovantes
  - alerta se pacote ja foi importado, veio do mesmo aparelho ou e mais antigo que ultimo pacote da origem
  - aplica eventos idempotentes por `event_id`
  - registra pacote importado
  - grava blobs em `sync-blobs`
- Central:
  - valida URL e token
  - cria lote snapshot atual
  - envia todos os lotes pendentes
  - progresso por lote
  - se falhar, lote fica com status `ERRO`.

Limite importante:

- A sincronizacao importa eventos e comprovantes, mas estoque distribuido entre aparelhos ainda nao e uma solucao completa de conciliacao multi-caixa. O estoque atual continua local.

### 8.14 Exportacao CSV

Arquivo atual: `src/screens/ExportacaoCsvScreen.tsx`.

Objetivo: gerar CSVs operacionais por periodo.

Layout:

- Card `Exportacao CSV` com `DateRangeFilter`.
- Card `Arquivos disponiveis`:
  - `Exportar vendas por periodo`
  - `Exportar devedores por periodo`
  - `Exportar consolidado por periodo`
  - `Exportar resumo de consumo por periodo`

Comportamentos:

- Cada exportacao gera arquivo local em `bar13/exports`.
- Compartilha arquivo se Android permitir.
- Alerta com URI local gerada.
- Nome de arquivo inclui tipo, periodo e timestamp.

### 8.15 Ajuda

Arquivo atual: `src/screens/AjudaScreen.tsx`.

Objetivo: guia rapido de primeiro uso e treinamento.

Layout:

- Card `Guia rapido do operador` com botoes `Novo pedido` e `Configuracoes`.
- Card `Primeiro uso` com passos numerados.
- Secoes:
  - `Preparacao inicial`
  - `Operadores e central`
  - `Operacao no balcao`
  - `Cobranca e pagamento`
  - `Pendentes e historico`
  - `Relatorios`
- Card `Qual CSV exportar?`
- Card `Cuidados importantes`

Comportamentos:

- Acoes navegam para telas relevantes com parametro `returnToAjuda`.
- Telas chamadas a partir do guia podem mostrar botao de retorno ao guia.

## 9. Mensagens, formatos e utilitarios

### Datas

- Formato interno de data: `YYYY-MM-DD`.
- Formato interno de hora: `HH:mm:ss`.
- ISO local sem timezone explicita: `YYYY-MM-DDTHH:mm:ss`.
- Historico usa data local.
- Filtros de periodo usam strings `YYYY-MM-DD`.

### Moeda

- Formatar valores em `pt-BR`, moeda `BRL`.
- Entradas de valor aceitam `7,50`, `7.50`, `1.234,56` e `1,234.56` conforme parser atual.

### Busca

Busca normalizada:

- remove diacriticos
- converte para minusculo
- aplica trim

Use essa normalizacao em integrantes, itens e operadores.

### Mensagem de cobranca

Cabecalho:

```text
🏴 COMUNICADO {NOME_BAR_EM_CAIXA_ALTA} 🍻
```

Corpo vem do template configuravel e substitui:

- `{data_do_pedido}` pela data formatada pt-BR
- `{chave_pix}` pela chave ou `Chave PIX nao configurada.`
- `{itens_consumidos_formatados}` por linhas `- QTDx NOME — R$`
- `{total_formatado}` por total em BRL

Mesmo na versao Android, preservar o texto configuravel e os placeholders.

## 10. CSVs

### Importacao de integrantes

Cabecalhos obrigatorios:

```csv
nome,patente
```

Regras:

- `nome` obrigatorio.
- `patente` obrigatoria e convertida para maiuscula.
- Upsert por nome normalizado.

### Importacao de itens

Cabecalhos obrigatorios:

```csv
nome,valor,qtdestoque
```

Regras:

- `nome` obrigatorio.
- `valor` obrigatorio e numerico.
- `qtdestoque` obrigatorio, inteiro e >= 0.
- Upsert por nome normalizado.
- Reimportar item existente reativa o item com `ativo = 1`.

### Exportacao

Tipos:

- vendas por periodo
- devedores por periodo
- consolidado por periodo
- resumo de consumo por periodo

Metadados comuns:

- `bar_nome`
- `bar_slug`
- `tipo_relatorio`
- `periodo_inicial`
- `periodo_final`
- `exportado_em_data`
- `exportado_em_hora`
- `exportado_em_iso`
- `chave_importacao`

Arquivos sao gerados em CSV com virgula e aspas quando necessario.

## 11. Arquivos locais e permissoes

No app atual os arquivos ficam sob `documentDirectory/bar13`.

Subpastas:

- `exports`: CSVs e pacotes exportados.
- `sync-blobs`: blobs recebidos via sincronizacao.

Arquivos:

- QR Code fixo: copiado para a pasta base `bar13`.
- Comprovantes: copiados para a pasta base com prefixo `comprovante_pedido_ID`.
- CSVs: criados em `exports`.
- Pacotes `.bar13sync`: criados em `exports`.

Permissoes Android equivalentes:

- Galeria/imagens para escolher QR Code.
- Seletor de documento para CSV, comprovantes e pacotes.
- Compartilhamento nativo para exportacoes e comprovantes.
- Clipboard para mensagem de cobranca.

## 12. Central gerencial

A central e opcional e unidirecional.

Configuracao necessaria:

- `central_web_app_url`
- `central_token`
- `device_id`

Envio:

- HTTP `POST` para URL configurada.
- Headers:
  - `Accept: application/json`
  - `Content-Type: application/json`
- Body:
  - `centralToken`
  - `payload`

Payload contem:

- schema version
- batch id
- dados do bar
- aparelho de origem
- aparelhos conhecidos
- operadores
- pedidos
- itens de pedido
- eventos de auditoria

Resposta esperada:

- JSON com `ok: true`
- contadores de pedidos, itens, eventos, operadores e devices atualizados.

Erros importantes:

- URL ausente: pedir configuracao.
- Token ausente: pedir configuracao.
- Resposta HTML em vez de JSON: indicar URL/implantacao incorreta.
- Resposta vazia ou invalida: informar status e previa curta.

## 13. Eventos de auditoria e sincronizacao

Eventos usados:

- `INTEGRANTE_UPSERTED`
- `ITEM_UPSERTED`
- `OPERADOR_UPSERTED`
- `PEDIDO_CRIADO`
- `PEDIDO_ITEM_ADICIONADO`
- `PEDIDO_ITEM_REMOVIDO`
- `PEDIDO_FECHADO`
- `PEDIDO_REABERTO`
- `PEDIDO_PAGO`
- `PEDIDO_CANCELADO`
- `COMPROVANTE_ANEXADO`

Cada evento guarda:

- `event_id`
- `device_id`
- `device_name`
- `sequence`
- `entity_type`
- `entity_sync_id`
- `event_type`
- operador ator, quando houver
- `payload_json`
- `created_at`

Pacote `.bar13sync`:

- `schemaVersion: 1`
- `packageId`
- `exportedAt`
- `sourceDevice`
- `events`
- `blobs`

A importacao deve ser idempotente:

- ignorar eventos com `event_id` ja visto.
- bloquear pacote ja importado.
- aplicar eventos em ordem por `createdAt`, `deviceId`, `sequence`.

## 14. Checklist para a IA Android

Para replicar corretamente:

- Criar projeto Android nativo com SQLite local.
- Implementar inicializacao idempotente do banco.
- Implementar camada de acesso a dados separada das telas.
- Reproduzir todas as rotas e estados descritos.
- Criar tema escuro com tokens da paleta.
- Implementar componentes equivalentes a cards, botoes, inputs, filtros, cards de pedido e cards de item.
- Preservar regras de operador atual.
- Preservar baixa/devolucao de estoque.
- Preservar snapshots em pedidos.
- Preservar comprovantes locais para PIX e cartao.
- Preservar pagamento em dinheiro sem comprovante.
- Preservar filtros por periodo e relatorios.
- Preservar CSVs de importacao/exportacao.
- Preservar sync `.bar13sync` com eventos idempotentes.
- Preservar envio opcional para central.
- Nao implementar backend obrigatorio.
- Nao transformar cartao em gateway de pagamento.
- Nao remover fluxos destrutivos existentes, mas manter confirmacoes fortes.

## 15. Pontos que precisam de atencao humana na replica

- O app atual tem acoes destrutivas reais: limpar integrantes, limpar itens e zerar tudo. A nova versao deve manter confirmacoes claras.
- Estoque multi-aparelho ainda nao e conciliado como ledger distribuido. Se a nova versao quiser resolver isso, sera uma evolucao, nao replica exata.
- O texto padrao de cobranca atual contem emoji e linguagem informal do bar. Preservar ou ajustar conscientemente.
- O uso de `numero_item` existe no banco, mas a interface atual nao depende dele.
- A central gerencial e opcional. A versao Android deve continuar funcionando mesmo sem URL/token.
