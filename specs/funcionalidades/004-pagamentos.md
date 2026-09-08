# 004 — Cobrança, pagamento e comprovantes

**Estado:** implementado. **Ator:** operador atual ativo para registrar pagamento/trocar comprovante. Consulta e cópia de mensagem não exigem operador. **Precondição da UI de recebimento:** pedido fechado aguardando pagamento e não cancelado.

## Requisitos

| ID | Comportamento |
| --- | --- |
| PAG-001 | Exibir snapshots do integrante/operador, data/hora, itens, total, status e método registrado no fechamento |
| PAG-002 | Gerar QR Code PIX localmente com chave configurada e valor total não zero |
| PAG-003 | Registrar `PIX` e `CARTAO_CREDITO` somente com comprovante contendo URI e nome; a seleção da UI aceita imagem ou PDF, um arquivo por vez |
| PAG-004 | Registrar `DINHEIRO` após confirmação explícita do valor recebido, sem anexo e com campos de comprovante vazios |
| PAG-005 | Recusar pagamento de pedido inexistente, aberto, cancelado ou sem operador válido |
| PAG-006 | Copiar cobrança pronta para a área de transferência sem enviá-la a aplicativo de mensagens |
| PAG-007 | Mostrar imagem de comprovante inline quando MIME começa com `image/`; demais arquivos aparecem pelo nome e ação de abrir/compartilhar |
| PAG-008 | Permitir troca de comprovante de pedido pago, não cancelado e com método informado diferente de dinheiro |
| PAG-009 | Criar/reutilizar blob por hash e registrar evento `PEDIDO_PAGO` ou `COMPROVANTE_ANEXADO` com referência ao anexo |

## Matriz de recebimento

| Método | Ação da UI | Evidência persistida |
| --- | --- | --- |
| PIX | Escolher imagem/PDF; ao concluir seleção e persistência, marcar pago | Método, URI, nome, MIME, data do anexo, blob e evento |
| Cartão de crédito | Mesmo fluxo de arquivo; processamento de cartão ocorre fora do app | Mesmos campos do PIX |
| Dinheiro | Confirmar recebimento no alerta | Método e evento; campos do anexo vazios |

Cancelar o seletor ou o alerta de dinheiro não registra pagamento. O arquivo escolhido é copiado do cache para o diretório do app antes da gravação no banco. Falhas são exibidas em alerta. O fluxo não calcula troco, não parcela e não divide pagamentos.

## PIX efetivamente implementado

`gerarPayloadPix` remove espaços externos da chave; usa nome do estabelecimento em maiúsculas truncado em 25 caracteres, cidade literal `BRASIL`, moeda `986`, país `BR`, valor com `toFixed(2)`, referência `***` e CRC16. A tela renderiza esse texto com `QRCode` em tamanho 200. Não há consulta externa nem validação bancária do payload nesta baseline.

Sem chave ou sem total, o QR não é exibido. A mensagem de estado vazio ainda menciona escolher imagem fixa, embora não exista essa opção atual. A coluna `caminho_imagem_qr_code` é legada e não integra `Configuracao` no domínio.

## Modelo da mensagem

Cabeçalho: `🏴 COMUNICADO <NOME DO BAR EM MAIÚSCULAS> 🍻`, seguido de duas quebras de linha e do modelo configurado. Substituir todas as ocorrências:

| Variável | Valor |
| --- | --- |
| `{data_do_pedido}` | Data formatada em pt-BR |
| `{chave_pix}` | Chave ou texto “Chave PIX não configurada.” |
| `{itens_consumidos_formatados}` | Uma linha `- <quantidade>x <nome> — <subtotal BRL>` por item |
| `{total_formatado}` | Total do pedido em BRL |

Variáveis desconhecidas permanecem literais. Modelo vazio resulta apenas no cabeçalho e separação. A chave não precisa existir para copiar a mensagem nem para registrar manualmente um pagamento PIX.

## Troca e limites

Troca seleciona/copia novo arquivo, atualiza metadados e evento, depois tenta excluir a URI antiga quando diferente. Método, total e status são preservados. O registro antigo em `sync_blobs` e os eventos anteriores não são removidos; isso pode deixar referência a arquivo apagado e prejudicar exportação futura de sincronização. Arquivos idênticos também podem compartilhar blob por hash.

A UI só oferece receber quando pendente. O repositório `marcarPedidoComoPago` não recusa explicitamente pedido já `PAGO`, podendo sobrescrever método/anexo se chamado diretamente. Essa diferença não cria um fluxo de estorno ou correção de método na UI.

## Aceitação

- **AC-PAG-01 — QR:** Dado pedido com total positivo e chave preenchida, quando abrir fechamento, então renderizar payload com esse valor e nome do bar. Sem chave, mostrar ausência do QR.
- **AC-PAG-02 — Anexo:** Dado pedido pendente, quando escolher imagem/PDF para PIX ou cartão, então marcar `PAGO`, persistir método e comprovante e registrar evento. Cancelar a seleção mantém pendente.
- **AC-PAG-03 — Dinheiro:** Dado pedido pendente, quando cancelar confirmação, então manter pendente; quando confirmar, então marcar pago em dinheiro sem anexo.
- **AC-PAG-04 — Estados inválidos:** Dado pedido aberto ou cancelado, quando chamar pagamento, então recusar.
- **AC-PAG-05 — Cobrança:** Dado modelo com as quatro variáveis, quando copiar, então obter valores substituídos e itens formatados no clipboard.
- **AC-PAG-06 — Troca:** Dado pedido pago em PIX com anexo, quando trocar comprovante, então manter total/método/status e atualizar URI, nome, data e evento. Em dinheiro, a troca é recusada.
- **AC-PAG-07 — Compartilhamento:** Dado comprovante e compartilhamento suportado, quando abrir/compartilhar, então invocar a folha do sistema com sua URI; sem suporte, informar indisponibilidade.

## Fontes

[Fechamento](../../src/screens/FechamentoContaScreen.tsx), [pagamento no repositório](../../src/repositories/pedidosRepository.ts), [cobrança](../../src/services/cobrancaService.ts), [PIX](../../src/utils/pix.ts), [blobs](../../src/repositories/syncBlobsRepository.ts), [arquivos](../../src/utils/file.ts), [rótulos](../../src/utils/payment.ts).
