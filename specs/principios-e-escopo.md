# Princípios e escopo

## Finalidade

Registrar o atendimento do Bar13 em Android e iOS: identificar integrante e operador, montar pedidos, controlar saldo de itens, fechar contas, registrar recebimento manual, preservar histórico e produzir informações gerenciais. A operação diária usa o SQLite e arquivos do próprio aparelho.

## Atores e fronteiras

| Ator | Responsabilidade atual |
| --- | --- |
| Operador | Assume o aparelho, cadastra dados, registra consumo, cobra e confirma pagamento |
| Integrante | Pessoa vinculada ao consumo; não possui login ou interface própria no app |
| Responsável pela unidade | Usa as mesmas telas para configuração, cadastros, exportação e manutenção |
| Gestor da central | Consulta planilhas e executa scripts externos quando configurados |
| Outro aparelho | Troca pacotes `.bar13sync` mediante ação manual |
| Sistema operacional | Oferece seleção de documentos, armazenamento e compartilhamento |

Esses são papéis operacionais, não perfis de autorização: não há login, senha, PIN, permissões por cargo ou autenticação do operador. Selecionar um nome identifica o responsável declarado.

## Princípios da baseline

1. O atendimento funciona sem conexão com backend. A central Google é opcional e recebe dados apenas mediante envio manual.
2. Expo, React Native, TypeScript strict e SQLite compõem a implementação atual. Esta especificação não prescreve troca de stack.
3. Registros de pedidos preservam snapshots para manter os nomes e referências do momento da operação, com a ressalva de preço descrita em [pedidos](funcionalidades/003-pedidos.md).
4. Cancelamento operacional preserva histórico; exclusões de manutenção possuem outro alcance e são especificadas separadamente.
5. Cada aparelho mantém identidade e sequência locais; IDs numéricos do banco não são identidades globais.
6. O registro de pagamento é manual. QR Code e anexo não comprovam liquidação bancária automaticamente.

## Vocabulário

| Termo | Significado nesta especificação |
| --- | --- |
| Pedido/conta | Registro de consumo de um integrante, contendo linhas e total |
| Linha do pedido | Item cadastrado associado ao pedido, com quantidade e snapshots |
| Aberto | `status = ABERTO` e `cancelado = false`, editável no fluxo local |
| Pendente | Na lista de cobrança, conta `FECHADO_AGUARDANDO_PAGAMENTO`; no total financeiro do app, também inclui abertos não cancelados |
| Pago | Recebimento marcado manualmente como `PAGO` |
| Cancelado | Marca `cancelado = true`, independente do enum de status |
| Estoque | Saldo atual `qtd_estoque` do cadastro neste aparelho |
| Snapshot | Valores copiados de um cadastro para o pedido ou linha |
| Evento | Registro de mutação com identidade, origem, ator e payload |
| Blob | Metadados de comprovante associados a um arquivo local |
| Pacote | JSON `.bar13sync` com eventos e arquivos codificados em Base64 |
| Lote da central | Snapshot JSON persistido em fila antes de tentar envio HTTP |

## Fora do que está implementado

Não há pagamento parcial, divisão de conta, troco calculado, desconto, estorno, débito, TEF, integração com maquininha ou consulta bancária. Também não há emissão fiscal, backend obrigatório, sincronização contínua, estoque distribuído com transferências, restauração integral de backup, múltiplos bares locais isolados ou gestão de acesso por perfil.

Há código de Apps Script para ferramentas gerenciais; isso não demonstra que esteja publicado em uma conta Google. Os documentos HTML/DOCX de apresentação são materiais de apoio, não telas nem serviços do app.

## Evolução por especificação

Para uma mudança futura:

1. Localizar os IDs e contratos impactados; escrever o comportamento proposto e os casos de erro antes de implementar.
2. Distinguir alteração desejada de mera descrição da baseline. Uma limitação não constitui autorização automática para corrigir código.
3. Registrar impacto em dados, migração, estoque, eventos e consumidores de CSV/JSON.
4. Implementar e verificar os cenários relevantes; anotar ambiente e resultado real.
5. Revisar diff e links; atualizar [rastreabilidade](rastreabilidade.md) e a data/revisão da spec alterada.

Para novas funcionalidades, usar o mesmo formato: objetivo, atores/precondições, requisitos identificados, fluxo, dados/eventos, exceções, cenários e fontes. Não é necessário criar tarefas fictícias de implementação para funcionalidades já existentes.
