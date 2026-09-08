# 005 — Home, histórico, pendentes e relatórios

**Estado:** implementado. **Ator:** pessoa usando o aparelho. **Precondição:** banco pronto; não exige operador para consulta.

## Requisitos

| ID | Comportamento |
| --- | --- |
| CON-001 | Home mostra nome do bar, operador atual, pedidos de hoje, total de hoje, valor pendente de hoje e quantidade de abertos de qualquer data |
| CON-002 | Home lista todos os pedidos abertos não cancelados para continuação e oferece atalhos de atendimento, cobrança, CSV, guia e envio à central |
| CON-003 | Histórico inicia em hoje, permite dia anterior/próximo/hoje e lista todos os pedidos da data, incluindo cancelados |
| CON-004 | Histórico encaminha aberto não cancelado para edição; demais estados para fechamento/consulta |
| CON-005 | Pendentes lista status `FECHADO_AGUARDANDO_PAGAMENTO` no período, com copiar cobrança e abrir pagamento |
| CON-006 | Relatórios, Pendentes e Exportação usam filtro de data inicial/final e presets hoje, 7 e 30 dias; cada tela inicia com últimos 30 dias |
| CON-007 | Relatórios apresenta seis métricas, pedidos do intervalo, devedores agrupados, consumo agrupado e vendido versus estoque atual |
| CON-008 | Datas invertidas são ordenadas por `clampPeriod` antes da consulta; limites são inclusivos por `data_pedido`, não pela data de recebimento |

## Fórmulas do app

Considere `P` = pedidos cuja data de criação operacional está no intervalo e `V` = subconjunto de `P` sem cancelamento.

| Campo | Fórmula atual |
| --- | --- |
| `totalPedidos` | Quantidade de pedidos em `V` |
| `totalVendido` | Soma de `total` em `V`, incluindo abertos |
| `totalPago` | Soma de `total` de `V` com status `PAGO` |
| `totalPendente` | Soma de `total` de `V` com status diferente de `PAGO`, incluindo abertos |
| `quantidadeDevedores` | Contagem de pedidos fechados aguardando pagamento em `V`; não é contagem distinta de pessoas |
| `quantidadeComprovantes` | Contagem de pedidos em `V` com nome de comprovante não vazio; não verifica arquivo físico |
| Devedores agrupados | Apenas fechados pendentes não cancelados; agrupa pelo par exato de nome e patente dos snapshots, soma total e quantidade de pedidos, ordena total decrescente |
| Consumo na UI | Todos os pedidos em `V`; agrupa pelo nome exato do item snapshot, soma quantidades/subtotais, ordena total decrescente |
| Estoque | Inicia com todos os itens ativos; soma unidades de `V` por `itemId` como “Vendido”; “Em estoque” é saldo atual, independente do período |

Se consumo referenciar item ausente da lista de ativos, o relatório de estoque acrescenta linha com nome snapshot e saldo zero. Ordena o relatório de estoque por nome. “Vendido” representa unidades registradas em pedidos não cancelados, não apenas pagas.

Home calcula contagens/valores do dia pelos mesmos critérios; `abertos` considera qualquer data. `pagosHoje` e `pendentesGerais` também são calculados pelo serviço, mas não têm cartões próprios na Home. Histórico usa `pedidos.length` incluindo cancelados e soma os totais persistidos; o cancelamento local normalmente deixou total zero.

## Filtro e atualização

Presets usam datas locais: 7 dias significa hoje e os seis dias anteriores; 30 significa hoje e os 29 anteriores. Entrada manual desmarca o preset. O estado não é global: abrir Exportação a partir de Relatórios não transfere automaticamente o intervalo selecionado. As telas reutilizam a lógica, não uma seleção compartilhada.

Campos aceitam texto livre `AAAA-MM-DD`; não chamam `isValidDateInput`. A ordenação de datas e consulta assume strings nesse formato. Não há rejeição de datas impossíveis ou incompletas na interface.

Consultas recarregam ao focar a tela e ao mudar o filtro. Listas vazias têm mensagens específicas. Pedidos são ordenados por data e hora decrescentes; itens do pedido, por nome snapshot crescente. Relatórios não oferece botão de continuar para pedidos abertos; a retomada está na Home/Histórico.

## Ressalva da lista de pendentes

`getPendentesPeriodo` filtra somente status e período, sem `cancelado = 0`. No fluxo local de cancelamento o status fica `ABERTO`, então o caso usual não aparece. Dados importados inconsistentes podem manter cancelado com status fechado e aparecer nessa lista e no CSV de devedores. As métricas consolidadas excluem cancelados explicitamente.

## Aceitação

- **AC-CON-01 — Métricas:** Dados pedidos no período: aberto R$ 10, pendente R$ 20, pago R$ 30 e cancelado com total zero, quando consultar, então `totalPedidos=3`, vendido R$ 60, pago R$ 30, pendente R$ 30 e `quantidadeDevedores=1`.
- **AC-CON-02 — Devedor repetido:** Dados dois pedidos pendentes com mesmo nome/patente snapshot, quando consolidar, então mostrar uma linha agrupada com dois pedidos, mas métrica “Devedores” igual a 2.
- **AC-CON-03 — Data operacional:** Dado pedido criado em um dia e pago depois, quando filtrar pelo dia de criação, então contar seu estado atual de pagamento nesse dia.
- **AC-CON-04 — Intervalo:** Dadas datas válidas invertidas, quando consultar/exportar, então usar o intervalo reordenado com ambas as extremidades incluídas.
- **AC-CON-05 — Histórico:** Dado pedido cancelado, quando consultar sua data, então incluí-lo na contagem e abrir “Ver cancelamento”, sem edição.
- **AC-CON-06 — Estoque atual:** Dado consumo antigo e saldo posteriormente editado para 12, quando consultar período antigo, então exibir saída daquele período e saldo atual 12.
- **AC-CON-07 — Seleção independente:** Dado Relatórios com período manual, quando abrir Exportação pela primeira vez, então iniciar no preset de 30 dias próprio da tela.

## Fontes

[Relatórios service](../../src/services/relatoriosService.ts), [queries](../../src/repositories/pedidosRepository.ts), [Home](../../src/screens/HomeScreen.tsx), [Histórico](../../src/screens/HistoricoScreen.tsx), [Pendentes](../../src/screens/PendentesScreen.tsx), [Relatórios](../../src/screens/RelatoriosScreen.tsx), [hook](../../src/hooks/usePeriodFilter.ts), [filtro](../../src/components/DateRangeFilter.tsx), [datas](../../src/utils/date.ts).
