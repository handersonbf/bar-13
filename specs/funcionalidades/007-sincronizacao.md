# 007 — Sincronização offline por eventos

**Estado:** MVP implementado. **Ator:** pessoa usando o aparelho e aparelho de origem. **Precondições:** banco pronto, arquivo acessível para importar ou armazenamento disponível para exportar. Não exige operador atual; eventos podem ter ator vazio.

## Requisitos

| ID | Comportamento |
| --- | --- |
| SYN-001 | Preparar identidade persistente, sync IDs ausentes e eventos de base para registros legados antes da operação de sincronização |
| SYN-002 | Exportar JSON `.bar13sync` versão 1 com todos os eventos conhecidos, inclusive os recebidos de outros aparelhos, e blobs referenciados disponíveis no cadastro |
| SYN-003 | Registrar data da exportação na configuração e aparelho conhecido; compartilhar o arquivo quando suportado |
| SYN-004 | Ler e mostrar prévia com origem, exportação, total/eventos novos, pedidos, integrantes, itens, comprovantes e avisos |
| SYN-005 | Impedir nova importação do mesmo `packageId`; ignorar eventos cujo `eventId` já existe mesmo em pacote diferente |
| SYN-006 | Avisar sobre pacote do próprio aparelho ou anterior ao último da origem, sem proibir importação só por esses avisos |
| SYN-007 | Após confirmação, importar blobs e depois aplicar eventos ordenados por `createdAt`, `deviceId` e `sequence` |
| SYN-008 | Aplicar registros de domínio, eventos, importação e timestamps em transação SQLite; desfazer escrita SQL em erro |
| SYN-009 | Deduplicar blobs pelo hash informado e gravar Base64 em `bar13/sync-blobs` quando o hash ainda não existe |
| SYN-010 | Mostrar identidade local, datas, aparelhos conhecidos e até oito importações mais recentes na tela |

## Bootstrap

Identidade nasce de timestamp e componente aleatório, fica em `configuracoes.device_id`. IDs de entidade/evento usam prefixo, os seis últimos caracteres alfanuméricos do device ID e sequência decimal com preenchimento mínimo de seis posições. Sequência é incrementada localmente e também pode ser consumida por blobs e atribuição de IDs sem evento.

Bootstrap atribui IDs ausentes a integrantes, itens, pedidos e linhas. Produz upserts de integrantes/itens/operadores quando não existe evento equivalente. Para pedidos antigos, produz criação, linhas, cancelamento ou fechamento/pagamento conforme estado e ausência do tipo de evento. Anexos antigos precisam estar legíveis para gerar blob. Esse backfill descreve o estado encontrado, não recupera toda a cronologia original nem autoria histórica ausente.

## Fluxo de importação

1. Escolher um arquivo (`application/json` ou qualquer tipo), copiar para cache e parsear JSON.
2. Validar envelope; a extensão por si só não decide validade.
3. Construir prévia. Se pacote já importado, exibir aviso e parar.
4. Confirmar “Importar agora”; executar bootstrap novamente e reler pacote.
5. Iniciar transação, atualizar aparelho conhecido e materializar blobs.
6. Para cada evento novo na ordenação, aplicar domínio e inserir evento.
7. Registrar pacote com contagens totais do arquivo, atualizar última importação e confirmar transação.
8. Retornar quantidades efetivamente novas; recarregar tela e informar sucesso. Falha desfaz SQL e gera alerta.

## Semântica de aplicação

| Evento/grupo | Efeito no destino |
| --- | --- |
| Integrante/operador | Procura primeiro sync ID, depois nome SQL `COLLATE NOCASE`; atualiza cadastro e pode substituir sync ID do destino |
| Item existente | Atualiza sync ID, nome, preço, atividade e timestamp; **preserva estoque local** |
| Item novo | Cria com estoque do payload e número interno disponível |
| Pedido criado | Exige integrante por sync ID; cria aberto/total zero ou atualiza identificação/snapshots de pedido existente |
| Linha adicionada/removida | Exige pedido/item por sync ID; aplica quantidade/subtotal absolutos, exclui linha com quantidade ≤ 0 e recalcula total; não movimenta estoque do destino |
| Fechado/reaberto/pago | Atualiza status diretamente, sem executar as mesmas guardas do atendimento local |
| Cancelado | Marca cancelamento e zera total, sem devolver estoque do destino |
| Comprovante | Resolve blob pelo mapa da importação ou ID já registrado, atualiza metadados/URI; ausência de blob pode resultar em URI vazia |

## Limites do MVP

Não há sincronização de configurações comerciais, PIX/token, escolha atual de operador ou fila da central. `CONFIGURACAO` existe no union de entidades, mas não há evento/handler correspondente implementado. Também não há exclusão sincronizada de cadastro, saldo distribuído, transferências ou reconciliação interativa.

A ordenação vale dentro do pacote: não compara a idade do evento novo com a versão já aplicada no domínio, nem reexecuta todo o log global. Assim, pacote antigo com eventos ainda desconhecidos pode sobrescrever estado mais recente. A igualdade por nome na importação usa SQL NOCASE, diferente da normalização com acentos do cadastro/CSV, e substituir sync IDs por nome pode comprometer referências posteriores.

O envelope é validado superficialmente; eventos e blobs não passam por schema completo. O hash é de 32 bits sobre texto Base64 na geração local e não é recalculado na recepção. Não existe assinatura, criptografia, limite explícito de tamanho ou verificação de integridade criptográfica. Arquivos gravados não são removidos por rollback SQL. Esses limites impedem tratar o pacote como backup integral ou mecanismo de convergência garantida.

## Aceitação

- **AC-SYN-01 — Identidade:** Dado aparelho já inicializado, quando reiniciar, renomear ou exportar, então preservar `device_id` e continuar sequência local.
- **AC-SYN-02 — Transferência simples:** Dado A com cadastro e pedido pago com comprovante legível, quando exportar e importar em B vazio após prévia, então reconstruir cadastro, pedido, linhas, pagamento e arquivo local.
- **AC-SYN-03 — Mesmo pacote:** Dado pacote aceito, quando selecioná-lo novamente, então informar já importado e não reaplicar.
- **AC-SYN-04 — Eventos repetidos:** Dado outro pacote contendo eventos conhecidos e novos, quando importar, então aplicar somente os novos.
- **AC-SYN-05 — Avisos:** Dado pacote antigo ou do próprio aparelho ainda não registrado, quando ler prévia, então avisar sem bloqueio automático por esses motivos.
- **AC-SYN-06 — Estoque local:** Dado B com item correspondente e saldo 5, quando importar consumo/cancelamento de A, então preservar saldo 5 no destino.
- **AC-SYN-07 — Falha:** Dado pacote com evento não suportado ou referência inexistente, quando importar, então rejeitar e reverter escrita SQL da transação, sem prometer remoção de arquivos já materializados.
- **AC-SYN-08 — Versão:** Dado envelope com `schemaVersion` diferente de 1, quando ler, então informar formato incompatível.

## Fontes

[Serviço](../../src/services/sincronizacaoService.ts), [UI](../../src/screens/SincronizacaoScreen.tsx), [eventos](../../src/repositories/syncEventsRepository.ts), [importações](../../src/repositories/syncImportsRepository.ts), [blobs](../../src/repositories/syncBlobsRepository.ts), [tipos](../../src/types/sync.ts), [contrato](../contratos/sincronizacao.md).
