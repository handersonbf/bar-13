# 009 — Scripts auxiliares de planilhas

**Estado:** código distribuído em `documentacao/google-apps-script`; execução e implantação externas não verificadas nesta baseline. **Ator:** gestor com acesso à planilha/Drive e Apps Script. **Precondições:** configuração e autorização na conta Google, fora do app.

## Requisitos

| ID | Comportamento |
| --- | --- |
| PLN-001 | Importador de consolidado prepara abas de dados/log e menu para importar, instalar gatilho horário e remover gatilhos próprios |
| PLN-002 | Localizar pastas configuradas por sequência de nomes a partir de Meu Drive e processar arquivos CSV cujo nome começa com `bar13_consolidado_` |
| PLN-003 | Ignorar versão de arquivo já processada por par ID/data de atualização; ordenar candidatos por atualização crescente |
| PLN-004 | Exigir os cabeçalhos do consolidado e fazer upsert por `<unidade>::<chave_importacao>`, preservando procedência e registrando resultado |
| PLN-005 | Construir configuração, três bases auxiliares, alertas e dois dashboards a partir das abas brutas da central |
| PLN-006 | Disponibilizar filtros de período, operador, aparelho e método; manter valores configurados ao recriar a estrutura |
| PLN-007 | Exibir indicadores operacionais, rankings, consumo, séries de faturamento e auditoria na planilha |
| PLN-008 | Gerar alertas de cancelamentos, pedidos pendentes, aparelhos sem sincronização e erros de importação |
| PLN-009 | Permitir ocultar/exibir abas auxiliares por funções próprias |

## Importador de CSV consolidado

`configurarPlanilhaBar13` prepara `bar13_consolidado_importado` e `bar13_importacoes_log`. `importarArquivosBar13` lê fontes configuradas, usa `Utilities.parseCsv` (parser do Google, diferente do mobile) e grava metadados de unidade, pasta, arquivo, atualização e importação junto das colunas originais. Requer conteúdo não vazio e todos os cabeçalhos definidos no [contrato CSV](../contratos/csv.md).

Document Properties guarda `processed:<fileId>` com timestamp da versão aceita. Arquivo sem alteração gera log `IGNORADO`; sucesso gera `OK`; erro de leitura/aplicação de um arquivo gera `ERRO` e permite seguir para outros arquivos. Pasta não encontrada lança erro fora desse tratamento por arquivo. Ao final, mostra toast com contagens.

`instalarGatilhoHorarioBar13` remove gatilhos existentes do handler e cria execução a cada hora. `removerGatilhosBar13` filtra somente o handler `importarArquivosBar13`. Isso é automação externa de planilha, não sincronização automática no mobile.

## Bases e filtros do dashboard

| Aba | Conteúdo |
| --- | --- |
| `config` | Datas em B4/B5, operador B6, aparelho B7, método B8, atualização B9 e limite de horas B10 (padrão 6) |
| `dash_base_pedidos` | Dados de pedido, mês/dia/faixa de horário, operador/aparelho/método, total e flags válido/pago/pendente/cancelado |
| `dash_base_itens` | Linhas de consumo enriquecidas por lookup do pedido, data, responsável, método e validade |
| `dash_base_auditoria` | Eventos e agrupamento textual em cancelamento, pagamento, criação, edição, fechamento ou outros |
| `dash_alertas` | Até 500 linhas com tipo, gravidade, referência, detalhe, data e status |
| `dashboard_operacao` | Indicadores do atendimento e acompanhamento |
| `dashboard_gerencial` | Rankings e consolidação para gestão |

Datas iniciais usam mínimo/máximo dos pedidos (ou hoje na ausência), exceto quando há valores previamente salvos. Listas de filtro incluem `Todos`. A base usa fórmulas `ARRAYFORMULA`, `FILTER`, `QUERY` e `VLOOKUP`; não há serviço online adicional próprio.

Válido = não cancelado; pago = status `PAGO` e não cancelado; pendente = status contendo `AGUARDANDO` ou `PENDENTE` e não cancelado. **Nos filtros atuais, `Todos` ainda exige campo não vazio de operador, aparelho e método.** Portanto registros sem método — comuns nos pedidos abertos/pendentes — podem ficar fora dos indicadores, mesmo com `Todos`. O valor pendente da planilha também não inclui abertos como o app inclui. Não há garantia de igualdade entre dashboards e métricas mobile.

## Painéis

Operacional: total vendido, caixa recebido, pedidos pagos, última sincronização, pedidos/valor pendente, cancelados, ticket médio; vendas por operador/método; relação de pendentes; últimos 20 eventos e alertas.

Gerencial: faturamento válido/recebido/pendente, pedidos válidos, produto mais vendido, produto com maior faturamento, melhor operador, percentual de cancelamento; top 10 por quantidade/valor, ranking de operadores, faturamento por dia, vendas por aparelho e resumo por status.

Rankings usam valores dos snapshots nas bases da central. Percentual de cancelamento divide cancelados pelo total filtrado; divisões vazias resultam em zero via `IFERROR`. Últimos eventos, alertas e indicador de última sincronização usam consultas próprias e não obedecem necessariamente a todos os filtros gerais.

## Alertas e recriação

Cancelamento tem gravidade média; pendência, ausência/atraso de sincronização e erro de importação, alta. Aparelho usa `last_exported_at`, com fallback `last_seen_at`, comparado ao relógio do script e limite de horas. Não é uma confirmação confiável de último envio HTTP da central.

Alertas são materializados quando `criarDashAlertasBar13_` roda pela criação da estrutura ou `atualizarAlertasBar13`; o `doPost` não chama automaticamente essa atualização. Configuração/abas auxiliares/painéis são limpos e reconstruídos, inclusive remoção de gráficos existentes nessas abas; abas brutas são preparadas separadamente. Alterações manuais nas áreas reconstruídas podem ser perdidas.

Os scripts do importador de CSV e da central possuem ambos funções globais como `onOpen`. São fluxos auxiliares distintos; não se deve supor que colar todos no mesmo projeto Apps Script funcione sem resolver nomes duplicados.

## Aceitação

- **AC-PLN-01 — CSV repetido:** Dado arquivo e versão já aceitos, quando importar novamente, então ignorar e registrar log, sem duplicar dados.
- **AC-PLN-02 — Atualização:** Dado novo CSV para mesma unidade/chave de período, quando importar, então atualizar a linha correspondente e metadados de procedência.
- **AC-PLN-03 — Estrutura:** Dadas abas brutas de teste, quando executar criação dos dashboards, então gerar as sete abas descritas e preservar filtros anteriormente salvos.
- **AC-PLN-04 — Alertas:** Dados cancelado, pendente, aparelho acima do limite e log de erro, quando atualizar alertas, então gerar as categorias correspondentes até o limite de 500 linhas.
- **AC-PLN-05 — Filtros atuais:** Dado pedido sem método e filtros em `Todos`, quando calcular cartões que usam critérios gerais, então observar sua exclusão atual; registrar diferença em relação ao app.
- **AC-PLN-06 — Gatilho:** Dado importador configurado, quando instalar gatilho horário novamente, então remover handlers anteriores desse importador antes de criar o novo.

## Fontes

[Importador](../../documentacao/google-apps-script/bar13-importador-consolidado.gs), [dashboards](../../documentacao/google-apps-script/bar13-dashboard-estrutura.gs), [central](../../documentacao/google-apps-script/bar13-central-webapp.gs), [guia de dashboards](../../documentacao/google-planilhas-dashboard.md), [guia de importação](../../documentacao/google-planilhas-importacao.md).
