# Rastreabilidade da baseline

Todos os grupos abaixo correspondem a código implementado. Cenários de aceitação são derivados por inspeção e permanecem sem execução funcional nesta entrega. Contratos são vinculados às respectivas specs, não tratados como funcionalidades independentes.

## Requisitos → implementação → aceitação

| Grupo | Requisitos | Implementação principal | Aceitação |
| --- | --- | --- | --- |
| [Arquitetura](arquitetura.md) | ARQ-001 a ARQ-006 | [App](../App.tsx), [provider](../src/context/DatabaseContext.tsx), [conexão](../src/database/connection.ts), [package](../package.json), [scripts](../scripts) | E2E-01, E2E-03; checks leves |
| [Dados](modelo-de-dados.md) | DAT-001 a DAT-005 | [schema](../src/database/migrations.ts), [connection](../src/database/connection.ts), [domain](../src/types/domain.ts), [sync](../src/types/sync.ts), [file](../src/utils/file.ts) | AC-DAT-01 a AC-DAT-03; E2E-13 |
| [Interface](navegacao-e-interface.md) | UI-001 a UI-005 | [navigator](../src/navigation/AppNavigator.tsx), [navigation types](../src/types/navigation.ts), [components](../src/components), [theme](../src/constants/theme.ts), [Ajuda](../src/screens/AjudaScreen.tsx) | AC-UI-01 a AC-UI-04 |
| [Configuração](funcionalidades/001-configuracao.md) | CFG-001 a CFG-007 | [tela](../src/screens/ConfiguracoesScreen.tsx), [repository](../src/repositories/configuracaoRepository.ts), [reset](../src/database/connection.ts) | AC-CFG-01 a AC-CFG-05; E2E-01, E2E-13 |
| [Cadastros](funcionalidades/002-cadastros.md) | CAD-001 a CAD-013 | [integrantes](../src/repositories/integrantesRepository.ts), [itens](../src/repositories/itensRepository.ts), [operadores](../src/repositories/operatorsRepository.ts), respectivas telas de gestão | AC-CAD-01 a AC-CAD-08; E2E-01, E2E-08 |
| [Pedidos](funcionalidades/003-pedidos.md) | PED-001 a PED-012 | [repository](../src/repositories/pedidosRepository.ts), [service](../src/services/pedidosService.ts), [seleção](../src/screens/SelecionarIntegranteScreen.tsx), [pedido](../src/screens/NovoPedidoScreen.tsx) | AC-PED-01 a AC-PED-09; E2E-02, E2E-03, E2E-06 |
| [Pagamento](funcionalidades/004-pagamentos.md) | PAG-001 a PAG-009 | [fechamento](../src/screens/FechamentoContaScreen.tsx), [repository](../src/repositories/pedidosRepository.ts), [cobrança](../src/services/cobrancaService.ts), [PIX](../src/utils/pix.ts), [rótulos](../src/utils/payment.ts) | AC-PAG-01 a AC-PAG-07; E2E-04, E2E-05 |
| [Consultas](funcionalidades/005-consultas.md) | CON-001 a CON-008 | [service](../src/services/relatoriosService.ts), [queries](../src/repositories/pedidosRepository.ts), [hook](../src/hooks/usePeriodFilter.ts), Home/Histórico/Pendentes/Relatórios | AC-CON-01 a AC-CON-07; E2E-07 |
| [CSV](funcionalidades/006-csv.md) | CSV-001 a CSV-010 | [importação](../src/services/importacaoCsvService.ts), [exportação](../src/services/exportacaoCsvService.ts), [parser](../src/utils/csv.ts), [validação](../src/utils/validation.ts), telas de importação/exportação | AC-CSV-01 a AC-CSV-08; E2E-07, E2E-08, E2E-13 |
| [Sincronização](funcionalidades/007-sincronizacao.md) | SYN-001 a SYN-010 | [service](../src/services/sincronizacaoService.ts), [events](../src/repositories/syncEventsRepository.ts), [imports](../src/repositories/syncImportsRepository.ts), [blobs](../src/repositories/syncBlobsRepository.ts), [hash](../src/utils/hash.ts), [tela](../src/screens/SincronizacaoScreen.tsx) | AC-SYN-01 a AC-SYN-08; E2E-09, E2E-10 |
| [Central](funcionalidades/008-central.md) | CEN-001 a CEN-010 | [service](../src/services/centralService.ts), [fila](../src/repositories/centralPushRepository.ts), [Web App](../documentacao/google-apps-script/bar13-central-webapp.gs), Home/Sincronização | AC-CEN-01 a AC-CEN-06; E2E-11, E2E-12 |
| [Planilhas](funcionalidades/009-planilhas.md) | PLN-001 a PLN-009 | [importador](../documentacao/google-apps-script/bar13-importador-consolidado.gs), [dashboards](../documentacao/google-apps-script/bar13-dashboard-estrutura.gs) | AC-PLN-01 a AC-PLN-06; E2E-12 |

O [roteiro E2E](aceitacao-e-validacao.md) integra os grupos. As [limitações](limitacoes-e-divergencias.md) qualificam os requisitos, especialmente dados concorrentes/importados e diferenças entre UI e repositório.

## Cobertura das telas

| Arquivo | Especificação |
| --- | --- |
| [HomeScreen](../src/screens/HomeScreen.tsx) | CON, PED (entrada), CEN |
| [HistoricoScreen](../src/screens/HistoricoScreen.tsx) | CON |
| [RelatoriosScreen](../src/screens/RelatoriosScreen.tsx) | CON |
| [PendentesScreen](../src/screens/PendentesScreen.tsx) | CON, PAG (cópia) |
| [ConfiguracoesScreen](../src/screens/ConfiguracoesScreen.tsx) | CFG |
| [SelecionarIntegranteScreen](../src/screens/SelecionarIntegranteScreen.tsx) | PED, UI |
| [GerenciarIntegrantesScreen](../src/screens/GerenciarIntegrantesScreen.tsx) | CAD |
| [GerenciarItensScreen](../src/screens/GerenciarItensScreen.tsx) | CAD |
| [GerenciarOperadoresScreen](../src/screens/GerenciarOperadoresScreen.tsx) | CAD |
| [NovoPedidoScreen](../src/screens/NovoPedidoScreen.tsx) | PED |
| [FechamentoContaScreen](../src/screens/FechamentoContaScreen.tsx) | PAG, PED |
| [ImportacaoCsvScreen](../src/screens/ImportacaoCsvScreen.tsx) | CSV |
| [ExportacaoCsvScreen](../src/screens/ExportacaoCsvScreen.tsx) | CSV, CON |
| [SincronizacaoScreen](../src/screens/SincronizacaoScreen.tsx) | SYN, CEN |
| [AjudaScreen](../src/screens/AjudaScreen.tsx) | UI |

## Cobertura dos contratos e da persistência

| Superfície | Especificação |
| --- | --- |
| `integrantes`, `itens_bar`, `operadores` | CAD + DAT |
| `pedidos`, `pedido_itens` | PED + PAG + DAT |
| `configuracoes` | CFG + DAT |
| `sync_events`, `sync_imports`, `known_devices`, `sync_blobs` | SYN + DAT + [contrato sync](contratos/sincronizacao.md) |
| `central_push_batches` | CEN + DAT + [contrato central](contratos/central.md) |
| CSVs de cadastro e quatro exportações | CSV + [contrato CSV](contratos/csv.md) |
| Planilhas de fatos, importação, dashboards e alertas | CEN + PLN |
| Datas e formatos comuns | CON + [dados](modelo-de-dados.md), [date](../src/utils/date.ts), [format](../src/utils/format.ts) |

## Materiais auxiliares

[README do projeto](../README.md), [AGENTS](../AGENTS.md), [manuais e apresentações](../documentacao/README.md) e [amostras CSV](../samples) compõem contexto e operação. `.agents/skills`, `.codex` e scripts AI-safe apoiam o desenvolvimento, não são módulos de atendimento. A especificação Android nativa existente é material de portabilidade; não indica que exista uma segunda implementação nativa no escopo mobile atual.
