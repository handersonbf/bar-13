# Plano — Alterações no App Mobile (bar13) para o Novo Dashboard Central

> Este documento cobre **só as mudanças dentro deste repositório** (`bar13`, Expo/React Native + SQLite). A construção do backend + dashboard web (projeto novo, separado) está em [plano-dashboard-central-novo-sistema.md](plano-dashboard-central-novo-sistema.md) — os dois documentos são complementares e devem ser lidos juntos, mas podem ser executados por pessoas/agentes/ferramentas diferentes. Nenhuma alteração aqui depende de código do outro projeto existir fisicamente; depende apenas do **contrato de API** descrito no outro documento (mesmas rotas/formatos, para o backend poder ser trocado por outro no futuro sem reabrir este documento).

## Contexto

Hoje o app envia dados de forma manual e unidirecional para uma planilha Google via Apps Script: token único fraco (mesmo segredo para todos os aparelhos do bar), sem device próprio, sem leitura de volta. O novo dashboard central exige mudanças pontuais no app para: autenticar por dispositivo (não mais um token compartilhado), efetivamente enviar o cardápio/estoque e a imagem do comprovante (hoje só metadados são enviados), e sincronizar automaticamente em vez de depender de um clique manual.

**Princípio geral: minimizar o diff.** O formato do payload (`CentralPayload`, schemaVersion 1) e da resposta (`CentralResponse`) que o app já monta/interpreta em [src/services/centralService.ts](../src/services/centralService.ts) permanecem os mesmos onde possível — só o destino (URL + autenticação) muda, e o payload ganha campos novos sem quebrar os existentes.

---

## O que muda, em detalhe

### 1. Autenticação por dispositivo (substitui o token único global)

Hoje: `configuracoes.central_token`, um texto livre comparado por igualdade no Apps Script, igual para todos os aparelhos do bar.

Depois: cada aparelho recebe um **token próprio**, emitido pelo admin no dashboard web (`dispositivos.create`/`regenerateToken` no outro documento) e colado manualmente na tela de Configurações — mesmo padrão de hoje (colar um valor gerado em outro lugar), só que por aparelho, não por bar.

- `centralService.ts`: ao montar a requisição HTTP, enviar dois headers novos, `X-Device-Id` (o `deviceId` local já existente, gerado em [syncEventsRepository.ts](../src/repositories/syncEventsRepository.ts)) e `X-Device-Token` (o novo segredo colado nas Configurações), em vez do campo `centralToken` dentro do corpo da requisição.
- `configuracaoRepository.ts`/schema de `configuracoes`: renomear/adicionar coluna para o novo segredo (ex.: `central_device_token`), mantendo `central_webapp_url` (ou renomeando para `central_api_url`) apontando para a nova API em vez do Apps Script.
- Migração de dado existente: não há como migrar automaticamente o `central_token` antigo para um `device_token` novo (são conceitos diferentes, emitidos em sistemas diferentes) — cada aparelho precisa colar o novo token manualmente uma vez, igual fizeram com o token antigo.

### 2. Tela de Configurações ([ConfiguracoesScreen.tsx](../src/screens/ConfiguracoesScreen.tsx))

- Trocar os dois campos atuais ("URL do Web App", "Token da central") por: "URL da API" (aponta para o novo backend) e "Token do dispositivo" (o token por-aparelho emitido no dashboard).
- Mesmo padrão de auto-save no `onBlur` já existente (`handleSaveOnBlur`).
- Texto de ajuda atualizado: hoje explica como publicar um Web App no Apps Script; passa a explicar que o token é gerado pelo admin no dashboard, na tela de dispositivos, e é mostrado **uma única vez** (mesma UX de "copie agora" que o dashboard vai ter do lado dele).
- Mensagens de erro de sync (hoje tratam resposta HTML/404 do Apps Script mal configurado) devem ser revisadas para os erros equivalentes da nova API (401/403 de token inválido, etc.), reaproveitando a estrutura de tratamento de erro já existente em `centralService.ts`.

### 3. Estender o payload com o cardápio (`items[]`)

Hoje o `CentralPayload` não inclui `itens_bar` — por isso "estoque geral" no dashboard fica sempre vazio. Adicionar um novo array ao payload, análogo aos já existentes:

```ts
items: {
  syncId: string;
  nome: string;
  valor: number;
  qtdEstoque: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}[];
```

Popular a partir do mesmo repositório que já lista itens localmente (equivalente a `listOperadores`/`listTodosPedidos` usados hoje em `buildPayload`, mas para `itens_bar`). Isso é um campo **novo e aditivo** — não remove nem renomeia nada existente, então não quebra a compatibilidade com uma eventual versão antiga do backend que ainda não o processe (ele simplesmente seria ignorado).

### 4. Enviar de fato a imagem do comprovante

Hoje só `comprovanteNome` (nome do arquivo) viaja no payload — a imagem em si só circula no mecanismo de sync ponto-a-ponto entre aparelhos (blobs em base64 no pacote `.bar13sync`). Para o dashboard exibir o comprovante:

- Novo endpoint HTTP separado (`POST /uploads/comprovante`, multipart — ver outro documento), chamado depois que o `pedido` correspondente já foi confirmado como upsertado na resposta do `sync.ingest` (evita subir imagem órfã de um pedido que falhou ao sincronizar).
- Usar `expo-file-system` (já é dependência do projeto) para ler o arquivo local do comprovante e montar o `FormData` do upload, autenticado com os mesmos headers `X-Device-Id`/`X-Device-Token`.
- Enviar apenas comprovantes ainda não confirmados como enviados (rastrear localmente, ex.: nova coluna ou reaproveitar o controle de `central_push_batches`, para não reenviar a mesma imagem em todo snapshot).

### 5. Sync automático em background (necessário para "dispositivo ativo" fazer sentido)

Hoje o envio é 100% manual (botão "Enviar para a central"). O outro documento já modela o "dispositivo ativo" do dashboard com thresholds generosos (6h/24h) justamente para tolerar isso no MVP — mas o valor real do dashboard só aparece com sync automático:

- Usar `AppState` (React Native) para dispellenar sync quando o app volta ao foreground.
- Usar `expo-network`/`NetInfo` para disparar sync ao reconectar à internet.
- Intervalo mínimo (ex. a cada 5 minutos) enquanto o app está aberto e há conexão, chamando o mesmo fluxo de `enviarCentralAgoraComOpcoes` já existente, silenciosamente (sem bloquear a UI, sem popups de sucesso — só indicar erro se falhar repetidamente).
- Chamar `sync.heartbeat` (ver outro documento) com cadência menor quando o app está aberto mas não há nada novo para sincronizar, para manter `last_seen_at` atualizado sem reprocessar um snapshot completo à toa.
- Manter o botão manual existente como fallback explícito (útil para forçar sync antes de fechar o caixa, por exemplo).

---

## O que **não** muda

- O mecanismo de sync ponto-a-ponto entre aparelhos do mesmo bar (arquivo `.bar13sync`, `sincronizacaoService.ts`) — é independente da central e continua igual.
- O modelo local de dados (SQLite, `pedidos`/`pedido_itens`/`itens_bar`/etc.) — nenhuma migration nova é necessária no banco local só por causa da central; os campos novos do payload (`items[]`) já existem localmente, só não eram exportados.
- O formato geral do payload (`schemaVersion: 1`) e da resposta — só ganham campos novos (aditivos), não são quebrados.

---

## Fases de alteração no app mobile

**Fase M1 — Configurações: trocar token único por token de dispositivo**
Alterar `ConfiguracoesScreen.tsx` (campos e textos de ajuda) e `configuracaoRepository.ts`/schema de `configuracoes` (nova coluna para device token, renomear/reaproveitar coluna de URL).
*Pronto quando*: consigo colar uma URL de API e um token de dispositivo na tela, e os valores persistem após reabrir o app (auto-save já existente continua funcionando).

**Fase M2 — `centralService.ts`: apontar para a nova API**
Trocar o envio do `centralToken` no corpo por headers `X-Device-Id`/`X-Device-Token`; ajustar tratamento de erros de resposta (401/403 da nova API em vez de HTML/404 do Apps Script). Manter parsing de `CentralResponse` idêntico.
*Pronto quando*: com um backend de teste rodando (do outro documento, Fase 5 dele), o app consegue enviar um snapshot real e recebe `{ok:true,...}`; erros de token inválido mostram mensagem clara na UI, igual ao comportamento atual para erros de configuração.

**Fase M3 — Estender payload com `items[]` (cardápio/estoque)**
Adicionar o array `items` em `buildPayload` (`centralService.ts`), lendo do repositório de itens do bar já existente.
*Pronto quando*: o payload enviado (visível em log/depuração local) inclui `items[]` com todos os itens ativos e seus `qtdEstoque`; o backend de teste confirma o recebimento (contagem em `sync_batches`, do outro documento).

**Fase M4 — Upload efetivo da imagem do comprovante**
Novo módulo de upload (multipart via `expo-file-system` + `fetch`/`FormData`), disparado após confirmação de que o pedido foi upsertado com sucesso; controle local de "comprovante já enviado" para não duplicar upload a cada snapshot.
*Pronto quando*: um pedido pago com comprovante, ao ser sincronizado, também sobe a imagem para o backend de teste e ela aparece corretamente ao consultar o pedido pelo dashboard (do outro documento).

**Fase M5 — Sync automático em background + heartbeat**
Novo serviço combinando `AppState` + `NetInfo` para disparar `enviarCentralAgoraComOpcoes` periodicamente e silenciosamente; chamada a `sync.heartbeat` quando não há nada novo. Manter botão manual como fallback.
*Pronto quando*: com o app em foreground e conexão ativa, um novo pedido criado aparece no dashboard em poucos minutos sem qualquer ação manual do atendente; fechar e reabrir o app, ou reconectar a internet, também dispara um sync.

---

## Riscos específicos do lado do app mobile (com recomendação padrão)

1. **`itemId` em `orderItems` não é um identificador estável global** (é o id autoincrement local do SQLite do aparelho) — diferente de todos os outros campos `*SyncId` do payload. Recomendação para o MVP: não mexer nisso agora, o backend central já trata esse campo como metadado não confiável e usa os snapshots de nome/valor para exibição. Resolver de verdade (fazer o app exportar um `itemSyncId` estável, análogo ao `syncId` de `itens_bar`) fica documentado como melhoria futura, fora do escopo das Fases M1–M5.
2. **Sync automático em background consumindo dados/bateria**: usar um intervalo conservador (5min) e só sincronizar quando houver conexão; evitar sync em segundo plano real (background fetch do SO) na primeira versão — só foreground + reconexão, para não complicar permissões de background no Android/iOS sem necessidade comprovada.
3. **Snapshot sempre completo**: o payload cresce com o histórico de pedidos do bar. Enquanto o volume for pequeno (uso normal de um bar), não é um problema; se algum bar acumular muito histórico e o payload ficar pesado, ajustar para envio incremental é uma mudança maior (teria que ser negociada com o outro documento, que já lista isso no backlog) — não implementar agora preventivamente.
4. **Upload de comprovante falhando isoladamente**: se o upload da imagem falhar mas o `sync.ingest` do pedido já teve sucesso, não bloquear nem reverter o pedido — só deixar o comprovante marcado como "pendente de upload" para tentar de novo no próximo ciclo de sync automático (mesma filosofia de `central_push_batches` já usada hoje para o snapshot inteiro).

## Arquivos deste repositório que serão tocados

- `src/services/centralService.ts` — payload, headers de autenticação, parsing de resposta, novo módulo de upload
- `src/screens/ConfiguracoesScreen.tsx` — campos de URL/token
- `src/repositories/configuracaoRepository.ts` e schema de `configuracoes` em `src/database/migrations.ts` — nova coluna de device token (pode exigir uma migration local nova, avaliar no momento da Fase M1)
- `src/repositories/syncEventsRepository.ts` — leitura do `deviceId` local (só leitura, sem mudança esperada)
- Novo serviço (ex. `src/services/backgroundSyncService.ts`) para a Fase M5

## Verificação end-to-end sugerida

1. Fases M1–M2: testar contra o backend de teste do outro documento (mínimo: Fases 1–5 dele concluídas) via um aparelho físico ou emulador na mesma rede.
2. Fase M3: inspecionar o payload enviado (log local) e conferir no Adminer do outro projeto que `itens_bar` foi populada.
3. Fase M4: fechar um pedido com comprovante no app, sincronizar, e abrir o mesmo pedido no dashboard web para ver a imagem carregando.
4. Fase M5: deixar o app aberto sem tocar em nada, criar um pedido, e cronometrar quanto tempo leva para aparecer no dashboard sem ação manual.
