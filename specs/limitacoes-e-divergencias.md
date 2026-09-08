# Limitações e divergências da baseline

Observações obtidas por leitura de código. São limites do estado atual, não solicitações de correção, garantias de exploração nem decisões de produto aprovadas. Nenhuma alteração de negócio foi feita na criação das specs.

| ID | Observação | Implicação e evidência |
| --- | --- | --- |
| LIM-001 | Documentação anterior e texto vazio do fechamento mencionam QR fixo | A tela gera QR a partir de chave/valor usando [PIX](../src/utils/pix.ts); configuração não oferece imagem. Coluna de caminho é legada |
| LIM-002 | Texto do cancelamento manual diz que removerá pedido | [Repositório](../src/repositories/pedidosRepository.ts) preserva pedido e linhas, marca cancelado e zera total |
| LIM-003 | Preço snapshot e subtotal podem divergir após mudança de preço | Incremento de linha existente usa preço recebido, sem atualizar snapshot; decremento usa snapshot salvo. Ver [PED](funcionalidades/003-pedidos.md) |
| LIM-004 | Um aberto por integrante/dia não é restrição global | Busca antes da criação não cobre reabertura, importação ou concorrência; não há UNIQUE correspondente |
| LIM-005 | “Devedores” conta contas, e “pendente” financeiro inclui abertos | [Relatórios](../src/services/relatoriosService.ts) não calcula pessoas distintas; lista de cobrança usa apenas fechados |
| LIM-006 | Pendentes por período não filtra cancelado explicitamente | Dados importados com status fechado e cancelado podem aparecer na lista/CSV, embora agregados excluam cancelados |
| LIM-007 | Intervalos não são compartilhados entre telas | Hook é reutilizado, mas cada tela mantém estado próprio, inicialmente 30 dias |
| LIM-008 | Entrada de datas aceita texto incompleto/inválido | Filtro não usa validação de calendário; clampPeriod apenas ordena strings |
| LIM-009 | Parser CSV não suporta campos multiline | Divide por quebra de linha antes de analisar aspas; exportador pode produzir campos multiline |
| LIM-010 | Preço com ponto só é decimal se tiver duas posições finais | `7.5` vira 75 em [parseCurrencyInput](../src/utils/validation.ts); usar exemplos explicitamente formatados |
| LIM-011 | Seleção/NovoPedido não recarregam automaticamente ao foco | `useEffect` depende de busca/ID; retorno do cadastro auxiliar pode deixar lista desatualizada. `+` da linha depende da lista filtrada |
| LIM-012 | Busy e transações não são serialização global de ações | Guardas de saldo/estado e algumas sequências são obtidas antes da transação; toques concorrentes não têm garantia documentada de exclusão mútua |
| LIM-013 | Troca de comprovante pode quebrar referências históricas de blob | UI apaga arquivo antigo, mas blob/evento permanece; exportador tenta ler anexos referenciados em todo o log |
| LIM-014 | Registros pagos podem ser sobrescritos por chamada direta de pagamento | UI só oferece recebimento pendente, mas `marcarPedidoComoPago` não rejeita explicitamente `PAGO`; não equivale a estorno implementado |
| LIM-015 | Limpeza CSV apaga todos os pedidos e preserva log de eventos | Não é exclusão individual protegida nem reset completo; não emite tombstones e não devolve estoque. Dados podem reaparecer em outros aparelhos |
| LIM-016 | Reset conserva identidade, sequência e nome do aparelho | Mensagem “tudo” tem alcance menor nesses campos; SQLite e arquivos são limpos em paralelo, sem atomicidade conjunta |
| LIM-017 | Estoque não converge por sincronização | Item existente preserva saldo local; linha/cancelamento importados não movimentam saldo; item novo recebe saldo do payload |
| LIM-018 | Ordenação de eventos não resolve conflitos globalmente | Ordena dentro do pacote, não rejeita eventos inéditos mais antigos que estado local; handlers podem sobrescrever estado recente |
| LIM-019 | Reconciliação de cadastros por nome pode trocar sync IDs | Sync usa SQL NOCASE, diferente da normalização local de acentos; não mantém aliases persistentes de identidade |
| LIM-020 | Blobs não têm integridade criptográfica validada | Hash local de 32 bits, confiança no hash recebido, aliases somente no mapa da importação; arquivo ausente pode gerar URI vazia ou falha na exportação |
| LIM-021 | Pacote não é restauração integral de backup | Não inclui configuração comercial, operador selecionado, token, fila da central ou garantia de saldo reconstruído |
| LIM-022 | Central não remove registros ausentes nem compara versões | Upsert mantém linhas de consumo removidas localmente e pode aceitar snapshot antigo sobre novo; log não é idempotente por lote |
| LIM-023 | Dashboard `Todos` exclui campos vazios | Critérios exigem operador/aparelho/método preenchidos; pedidos não pagos costumam ter método vazio. Métricas podem divergir do mobile |
| LIM-024 | Alertas de planilha precisam de atualização por função | `doPost` prepara base, mas não recria alertas; data de exportação do aparelho não comprova último envio HTTP |
| LIM-025 | Arquivos exportados usam precisão de minuto no nome | Mesmo tipo/período/minuto pode sobrescrever a URI; pacotes diferentes podem ter mesmo nome local |
| LIM-026 | Ausência de testes funcionais automatizados e validação em dispositivos nesta tarefa | Scripts existentes verificam tipos/lint, não equivalem a teste de SQLite nativo, seletor, compartilhamento ou leitura bancária de QR |
| LIM-027 | Operador é identificação declarada, sem autenticação | Não há controle de acesso por perfil nem senha; token é texto local, sem armazenamento seguro dedicado |
| LIM-028 | Sem limites operacionais de volume ou recuperação global de erro | Listas, eventos e anexos são carregados em memória; vários loads não capturam rejeição; falha de bootstrap deixa app bloqueado |
| LIM-029 | CSV não neutraliza fórmulas de planilha | Escape é sintático para CSV, não transformação de conteúdo iniciado por caracteres de fórmula |

Prioridade e correção dessas limitações dependem de uma mudança explicitamente especificada e validada. A baseline não deve transformar comportamentos inconsistentes em requisitos futuros obrigatórios.
