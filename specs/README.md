# Especificações do Bar13

Baseline SDD (Spec-Driven Development) do sistema implementado, levantada em **08/09/2026**, a partir do código da revisão **`87ff86f`**. A árvore de trabalho estava limpa antes desta documentação. Versão declarada no `package.json`: `1.0.0`.

Esta é uma especificação retrospectiva: estabelece a base verificável para orientar futuras mudanças por especificação. Não representa um plano de reimplementação, uma certificação de funcionamento em aparelho ou a adoção de um framework SDD externo.

## Como ler

| Documento | Conteúdo |
| --- | --- |
| [Princípios e escopo](principios-e-escopo.md) | Produto, atores, vocabulário e processo de evolução das specs |
| [Arquitetura](arquitetura.md) | Camadas, bootstrap, dependências, persistência e operação |
| [Modelo de dados](modelo-de-dados.md) | Dicionário completo do SQLite, relações e migrações |
| [Navegação e interface](navegacao-e-interface.md) | Todas as 15 telas, parâmetros e componentes compartilhados |
| [Configuração e manutenção](funcionalidades/001-configuracao.md) | Dados do bar, identidade local, salvamento e reset |
| [Cadastros e operadores](funcionalidades/002-cadastros.md) | Integrantes, itens, estoque cadastral e equipe |
| [Pedidos e estoque](funcionalidades/003-pedidos.md) | Abertura, retomada, consumo, cancelamento e estados |
| [Cobrança e pagamento](funcionalidades/004-pagamentos.md) | PIX, dinheiro, cartão, anexos e mensagem |
| [Consultas e relatórios](funcionalidades/005-consultas.md) | Home, histórico, pendentes e fórmulas de consolidação |
| [Importação e exportação CSV](funcionalidades/006-csv.md) | Validação, upsert, limpeza, geração e compartilhamento |
| [Sincronização offline](funcionalidades/007-sincronizacao.md) | Eventos, pacotes, arquivos e limites de reconciliação |
| [Central gerencial](funcionalidades/008-central.md) | Snapshot HTTP, fila local e receptor Apps Script |
| [Planilhas auxiliares](funcionalidades/009-planilhas.md) | Importador de consolidado, dashboards e alertas |
| [Contrato CSV](contratos/csv.md) | Cabeçalhos, formatos e exemplos fictícios |
| [Contrato de sincronização](contratos/sincronizacao.md) | Envelope, catálogo de eventos e blobs |
| [Contrato da central](contratos/central.md) | Requisição, payload, resposta e chaves de upsert |
| [Aceitação e validação](aceitacao-e-validacao.md) | Roteiro transversal, comandos e evidências de validação |
| [Limitações e divergências](limitacoes-e-divergencias.md) | Comportamentos que exigem cuidado ao evoluir o sistema |
| [Rastreabilidade](rastreabilidade.md) | Correspondência entre requisitos, módulos e aceitação |

## Convenções

- `CFG`, `CAD`, `PED`, `PAG`, `CON`, `CSV`, `SYN`, `CEN` e `PLN` identificam requisitos das funcionalidades; `ARQ`, `DAT` e `UI` identificam requisitos transversais.
- `AC-<prefixo>-<número>` identifica um cenário de aceitação. Os cenários foram derivados por inspeção do código; sua existência não significa que foram executados.
- **Implementado** significa que há um caminho de código correspondente. **Limitação observada** registra uma restrição ou inconsistência atual, sem transformá-la em comportamento desejado para sempre.
- “Deve”, nos requisitos, descreve o contrato do fluxo atual dentro das precondições declaradas. Ressalvas explícitas delimitam garantias que o código não oferece.
- Todos os valores de exemplos são fictícios. URLs de implantação, tokens, credenciais e dados de operação não integram esta baseline.

## Fonte de verdade e documentação anterior

A evidência desta baseline é o código em [src](../src), [App.tsx](../App.tsx) e os scripts distribuídos em [documentacao/google-apps-script](../documentacao/google-apps-script). Os [manuais existentes](../documentacao/README.md) continuam úteis para treinamento. Quando divergem do código, a diferença fica registrada em [limitações e divergências](limitacoes-e-divergencias.md), especialmente quanto ao QR Code PIX e ao alcance das métricas.

Alterações futuras devem atualizar requisitos, contratos e cenários afetados junto do código, preservando os identificadores para manter a rastreabilidade.
