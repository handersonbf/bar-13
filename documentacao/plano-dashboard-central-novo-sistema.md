# Plano — Novo Sistema: Dashboard Central Bar13 (Backend + Web)

> Este documento descreve um **projeto novo e independente**, fora deste repositório (`bar13` mobile). É a especificação de referência para quem for construir o backend + dashboard web. As mudanças que precisam acontecer *dentro deste repositório* (app mobile) estão em [plano-dashboard-central-alteracoes-app-mobile.md](plano-dashboard-central-alteracoes-app-mobile.md) — os dois documentos são complementares e devem ser lidos juntos, mas podem ser executados por pessoas/agentes/ferramentas diferentes.

## Contexto

O app mobile `bar13` sincroniza dados hoje de forma unidirecional e manual para uma planilha Google via Apps Script (token único fraco, sem leitura de volta, snapshot completo a cada envio, sem conceito de estado/regional). Este novo sistema **substitui** essa central por um backend real com dashboard web: login atrelado a Estado + Regional (papel ADMIN vê tudo), visão de dispositivos ativos por regional, dashboard agregado (total vendido, contas abertas, estoque geral, dispositivos ativos) e resumo por dispositivo individual.

**Stack já decidida (não reabrir)**: React 19, Vite 7, Tailwind CSS 4, Radix UI, Wouter, React Query · Node.js + Express 4 + tRPC 11 · MySQL 8 + Drizzle ORM + mysql2 · sessão em cookie httpOnly + `jose` + `bcryptjs` · Vitest · Vite/esbuild · pnpm · Docker Compose (MySQL + Adminer) · AWS SDK para S3 (comprovantes de pagamento).

**Decisões de escopo já fechadas**:
1. Este backend substitui o Apps Script (a contraparte do lado do app mobile está no outro documento).
2. S3 guarda as imagens de comprovante de pagamento.
3. Deploy de produção fica **adiado explicitamente** — este plano cobre só dev local via Docker Compose.
4. Repositório novo e independente do repositório do app mobile (não é monorepo com ele).

---

## Contrato que este sistema precisa respeitar (definido pelo app mobile, não renegociável aqui)

O app mobile já existe e já sabe montar/interpretar um formato específico. Este backend deve **aceitar o payload de entrada e devolver a resposta exatamente nesse formato**, para que a integração (feita no outro documento) seja só uma troca de URL/autenticação, não uma reescrita do app.

**Payload de entrada (`CentralPayload`, schemaVersion 1)**:
```ts
type CentralPayload = {
  schemaVersion: 1;
  batchId: string;
  exportedAt: string;
  bar: { nome: string; slug: string };
  sourceDevice: { deviceId: string; name: string };
  devices: { deviceId, nomeAparelho, firstSeenAt, lastSeenAt, lastExportedAt, lastImportedAt }[];
  operators: { syncId, nome, ativo, createdAt, updatedAt }[];
  orders: {
    pedidoSyncId, integranteId, integrante, patente,
    operadorResponsavelSyncId, operadorResponsavelNome, deviceIdOrigem,
    dataPedido, horaPedido, dataHoraPedido, status, cancelado, canceladoEm,
    metodoPagamento, comprovanteNome, total, createdAt, updatedAt
  }[];
  orderItems: { pedidoItemSyncId, pedidoSyncId, itemId, itemNome, quantidade, valorUnitario, subtotal }[];
  auditEvents: { eventId, deviceId, deviceName, entityType, entitySyncId, eventType, actorOperatorSyncId, actorOperatorName, createdAt }[];
};
```

**Resposta esperada (`CentralResponse`)**:
```ts
type CentralResponse = {
  ok: boolean;
  batchId: string;
  ordersUpserted: number;
  orderItemsUpserted: number;
  auditEventsUpserted: number;
  operatorsUpserted: number;
  devicesUpserted: number;
  message?: string;
};
```

Chaves de upsert a preservar (o app conta com reenvio idempotente): `devices.deviceId`, `operators.syncId`, `orders.pedidoSyncId`, `orderItems.pedidoItemSyncId`, `auditEvents.eventId`.

**Pontos de atenção herdados do payload atual** (o app só ganha essas capacidades depois que o outro documento for executado — não bloqueiam a construção deste backend, mas moldam o schema):
- `orderItems.itemId` é o id autoincrement local do SQLite do aparelho, **não é um identificador estável global** como os demais campos `*SyncId`. Não usar como FK confiável — tratar como metadado bruto.
- O payload atual **não inclui cardápio** (`itens_bar`) nem a **imagem** do comprovante (só `comprovanteNome`, o nome do arquivo). As tabelas central `itens_bar` e `comprovantes` já devem existir no schema, mas ficam sem dado real até a integração do outro documento estender o payload/adicionar upload.
- O payload é sempre um **snapshot completo** do histórico (não incremental) — vai crescer com o tempo; ver backlog.

---

## Decisões de arquitetura adicionais

**Layout de repositório — pnpm workspaces com 3 pacotes**:
```
bar13-central/
├── pnpm-workspace.yaml
├── docker-compose.yml           (mysql + adminer + minio p/ dev)
├── apps/
│   ├── api/                     (Express + tRPC + Drizzle)
│   └── web/                     (Vite + React 19 + Tailwind + Radix + Wouter)
└── packages/
    └── shared/                  (schema Drizzle, tipos Zod, contrato do payload de sync)
```
Motivo: tRPC precisa compartilhar o *tipo* do `AppRouter` entre API e web (import type-only), e ambos precisam do mesmo schema Zod do payload de sync — um pacote `shared` evita duplicação e builds cruzados confusos.

**Upload de comprovante fica fora do tRPC**: tRPC sobre JSON não é ideal para binário grande. Expor uma rota Express pura `POST /uploads/comprovante` (multipart, `multer`/`busboy`), autenticada pelo mesmo esquema de token de dispositivo do endpoint de sync, gravando no S3 e persistindo a referência via o mesmo client Drizzle.

**Sessão híbrida (concilia "cookie/sessão" com uso de `jose`)**: tabela `sessions` no MySQL guarda o estado real (revogável, expiração, IP/UA); o cookie httpOnly carrega só um JWT compacto `{ sid }` assinado com `jose` (HS256, `exp` curto ~15min, renovado a cada request válido). Role/escopo **nunca** vai no JWT — é sempre buscado no banco a cada request, para que revogar sessão ou mudar papel tenha efeito imediato.

---

## Modelagem de dados (Drizzle ORM / MySQL 8)

Convenção: PK `bigint unsigned auto_increment` para entidades internas; `varchar` para identificadores vindos do app (`sync_id`, `device_id`, `event_id`, já strings no cliente). Coluna MySQL sempre `snake_case`, propriedade Drizzle/TS sempre `camelCase`.

**Hierarquia organizacional**
- `estados` (id, nome, sigla unique)
- `regionais` (id, estado_id FK, nome, slug) — unique `(estado_id, slug)`
- `bares` (id, regional_id FK, nome, slug, chave_pix_referencia) — unique `(regional_id, slug)`
- `dispositivos` (id, bar_id FK, device_id unique, nome_aparelho, device_token_hash nullable, status enum `ATIVO|INATIVO|REVOGADO|DESCOBERTO`, first_seen_at, last_seen_at, last_sync_at) — índices em `bar_id`, `last_sync_at`, `status`

**Usuários do dashboard**
- `dashboard_users` (id, nome, email unique, password_hash, role enum `ADMIN|ESTADO|REGIONAL`, estado_id FK nullable, regional_id FK nullable, ativo). Coerência role×estado×regional validada na camada de aplicação (não em CHECK constraint).
- `sessions` (id uuid PK = `sid` do JWT, user_id FK, user_agent, ip_address, created_at, last_seen_at, expires_at, revoked_at)

**Dados operacionais espelhados do app mobile**
- `operadores` (id, bar_id FK, sync_id, nome, ativo, device_created_at, device_updated_at, synced_at) — unique `(bar_id, sync_id)`
- `itens_bar` (id, bar_id FK, sync_id, nome, valor, qtd_estoque, ativo, synced_at) — unique `(bar_id, sync_id)`. **Fica vazia até a integração do outro documento** estender o payload com cardápio.
- **Sem tabela `integrantes` própria no MVP** — só snapshot (`nome_integrante_snapshot`, `patente_integrante_snapshot`) dentro de `pedidos`, pois é o que o payload atual já fornece; entidade completa fica no backlog.
- `pedidos` (id, bar_id FK, dispositivo_id FK nullable, device_id_origem_raw, sync_id, snapshots de integrante/operador, data_pedido, hora_pedido, data_hora_pedido, status enum `ABERTO|FECHADO_AGUARDANDO_PAGAMENTO|PAGO`, cancelado, cancelado_em, metodo_pagamento enum `PIX|DINHEIRO|CARTAO_CREDITO`, comprovante_id FK nullable, total, synced_at) — unique `(bar_id, sync_id)`; índices `(bar_id,status)`, `(bar_id,data_pedido)`, `(dispositivo_id,status)`
- `pedido_itens` (id, pedido_id FK cascade, sync_id, item_id_local_raw **não confiável como FK**, item_nome_snapshot, valor_unitario_snapshot, quantidade, subtotal, synced_at) — unique `(pedido_id, sync_id)`
- `comprovantes` (id, pedido_id FK unique, nome_arquivo, mime_type, s3_bucket, s3_key, tamanho_bytes, enviado_por_dispositivo_id FK, criado_em) — nunca guardar URL pública fixa, gerar presigned GET sob demanda

**Auditoria de sync**
- `sync_batches` (id, bar_id FK nullable, dispositivo_id FK nullable, batch_id_raw, schema_version, status enum `RECEBIDO|PROCESSADO|ERRO`, contagens por entidade, error_message, payload_json, received_at, processed_at)
- `sync_audit_events` (id, bar_id FK, dispositivo_id FK nullable, event_id unique global, entity_type, entity_sync_id, event_type, actor_operador_sync_id, actor_operador_nome, device_created_at, synced_at, sync_batch_id FK)

Índices pensados para as agregações do dashboard já cobertos pelos FKs/índices acima (join `dispositivos.bar_id`→`bares.regional_id` para "ativos por regional"; `pedidos(bar_id,status,data_pedido)` para vendas/contas; `pedidos(dispositivo_id,status)` para resumo por dispositivo). Não desnormalizar `regional_id`/`estado_id` em `pedidos` agora — é over-engineering para o volume esperado; fica documentado como opção pós-MVP se performance exigir.

---

## Modelo de autorização (sem RLS nativo do MySQL)

Filtro aplicado **uma única vez** no contexto tRPC, nunca reescrito manualmente em cada resolver:

- `createContext` lê o cookie → valida JWT com `jose` → busca `sessions`/`dashboard_users` → monta `scope = { role, estadoId, regionalId }`.
- Helper único `withScopeFilter(scope, baseQuery)` usado por todo procedure de leitura: `ADMIN` sem filtro; `ESTADO` filtra por `regionais.estado_id`; `REGIONAL` filtra por `bares.regional_id`.
- Procedures compostos: `protectedProcedure` (sessão válida, injeta `user`/`scope`), `adminProcedure` (estende o anterior, exige `role==='ADMIN'`), `deviceProcedure` (autenticação por `X-Device-Id`/`X-Device-Token`, sem cookie — usado só pelo router `sync`, consumido pelo app mobile).

---

## Fluxo de autenticação (usuários do dashboard)

1. `auth.login` — valida `email`+senha (`bcryptjs.compare`), cria linha em `sessions` (expira em 7 dias), assina JWT `{ sid }` com `jose` (`exp` 15min), seta cookie httpOnly/sameSite=lax/secure em produção.
2. Renovação silenciosa do JWT a cada request válido, enquanto a sessão real (7 dias) não expirar/for revogada.
3. `auth.logout` marca `revoked_at`. `auth.me` retorna dados do usuário logado (usado pelo frontend para decidir o que renderizar).
4. **Sem registro público** — só `adminProcedure` cria usuários (`usuarios.create`). Reset de senha self-service fica no backlog.
5. Seed inicial cria 1 usuário ADMIN a partir de `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` (env), nunca hardcoded.

---

## Contratos da API tRPC (routers principais)

- **`auth`**: `login`, `logout`, `me`
- **`estados` / `regionais` / `bares`**: `list` (escopado), `create`/`update`/`delete` (`adminProcedure`)
- **`dispositivos`**: `list`, `create` (retorna `deviceToken` em texto puro **uma única vez** — esse token é o que precisa ser colado na tela de Configurações do app mobile, ver outro documento), `regenerateToken`, `revoke`, `promoteDiscovered` (promove um dispositivo `DESCOBERTO`, criado automaticamente via `devices[]` de outro payload, para `ATIVO` com token próprio)
- **`dashboard`**: `overview` (totais escopados: dispositivos ativos, total vendido, contas abertas, estoque geral, etc.), `porDispositivo` (resumo individual, valida que o `dispositivoId` está no escopo do usuário), `listDispositivosComResumo`
- **`pedidos`**: `list` (paginado, filtros), `getById` (com itens + URL assinada do comprovante)
- **`usuarios`**: CRUD `adminProcedure`, validando coerência `role`×`estadoId`×`regionalId`
- **`sync`** (autenticado por dispositivo, não por cookie — é o endpoint chamado pelo app mobile): `ingest` (recebe exatamente o `CentralPayload` schemaVersion 1, valida com Zod, devolve o `CentralResponse` já descrito acima), `heartbeat` (ping leve, atualiza só `last_seen_at`)

---

## Endpoint de ingestão (`sync.ingest`) — passo a passo

1. **Auth por dispositivo**: headers `X-Device-Id` + `X-Device-Token`. Dispositivo inexistente → `401`; `REVOGADO`/`DESCOBERTO`/sem hash → `403`; token não bate (`bcryptjs.compare`) → `401`.
2. Dentro de **uma transação**: cria `sync_batches` (RECEBIDO) → valida `payload.sourceDevice.deviceId === ctx.device.deviceId` → upsert `dispositivos` (por `device_id`; dispositivos desconhecidos entram como `DESCOBERTO`, `last_sync_at` só é atualizado no próprio dispositivo autenticado) → upsert `operadores` (por `bar_id,sync_id`) → upsert `pedidos` (por `bar_id,sync_id`, resolvendo `dispositivo_id` por `deviceIdOrigem` dentro do mesmo bar) → upsert `pedido_itens` (por `pedido_id,sync_id`; item cujo `pedidoSyncId` não resolve vira warning, não aborta o batch) → insert-if-not-exists `sync_audit_events` (por `event_id`) → marca `sync_batches` PROCESSADO com contagens reais → commit.
3. Erro em qualquer etapa → rollback, `sync_batches` ERRO, erro tRPC amigável.
4. **Idempotência**: tudo upsert por chave estável — reenviar o mesmo snapshot completo (como o app já faz) nunca duplica linha.
5. Configurar `express.json({ limit: '15mb' })` (default de 100kb do Express estoura com histórico acumulado).

---

## Estratégia "dispositivo ativo" (lado servidor)

Como o app mobile ainda envia manualmente até a integração do outro documento acontecer, um threshold curto (minutos) deixaria quase tudo "inativo" o tempo todo — enganoso no MVP.

3 faixas configuráveis via env, calculadas em `deviceStatusService.ts` a partir de `dispositivos.last_sync_at`:
- `ATIVO` (verde): dentro de `DEVICE_FRESH_THRESHOLD_MINUTES` (default 360 = 6h)
- `ATENÇÃO` (amarelo): até `DEVICE_STALE_THRESHOLD_MINUTES` (default 1440 = 24h)
- `SEM SYNC RECENTE` (vermelho): além disso, ou nunca sincronizou

"Total de dispositivos ativos" no `dashboard.overview` conta a faixa verde. Os thresholds são env vars justamente para poderem cair (ex.: para 15min) sem deploy, quando o app mobile ganhar sync automático (ver outro documento) — esse backend não precisa saber se o sync do outro lado é manual ou automático, só reage ao `last_sync_at` que chega.

---

## "Estoque geral"

Decisão consciente: sem livro de movimentação, `itens_bar.qtd_estoque` é contador simples (mesma limitação do app hoje). Dashboard soma `SUM(qtd_estoque) WHERE ativo=true` no escopo do usuário. Só funciona de verdade depois que o payload for estendido com cardápio (outro documento); até lá o número fica em zero/vazio, o que é esperado e não é bug deste sistema.

---

## Estrutura de pastas (detalhada)

```
apps/api/src/
  index.ts, env.ts
  db/client.ts                       # pool mysql2 + drizzle(pool, { schema })
  auth/password.ts, session.ts, deviceAuth.ts
  trpc/context.ts, trpc.ts, routers/{_app,auth,estados,regionais,bares,dispositivos,dashboard,pedidos,usuarios,sync}.ts
  services/syncIngestService.ts, dashboardAggregationService.ts, deviceStatusService.ts, s3Service.ts
  http/uploadComprovanteRoute.ts
  scripts/seedAdmin.ts
apps/web/src/
  main.tsx, App.tsx (Wouter)
  lib/trpc.ts, lib/authGuard.tsx
  pages/{LoginPage,RegionalOverviewPage,DashboardPage,DeviceSummaryPage}.tsx
  pages/admin/{EstadosPage,RegionaisPage,BaresPage,DispositivosPage,UsuariosPage}.tsx
  components/ui/*, StatCard.tsx, DeviceStatusBadge.tsx
packages/shared/src/
  db/schema.ts                       # todas as tabelas Drizzle, fonte única de verdade
  types/scope.ts, types/syncPayload.ts   # Zod schema espelhando o CentralPayload do app mobile
```

---

## Fases de desenvolvimento (deste sistema)

**Fase 1 — Setup do monorepo, tooling, Docker Compose**
`pnpm-workspace.yaml`, `docker-compose.yml` (mysql + adminer + minio), `apps/api` com `GET /health`, `apps/web` com página "Hello", `.env.example` completo.
*Pronto quando*: `docker compose up -d` sobe tudo; `pnpm --filter api dev` responde 200 em `/health`; `pnpm --filter web dev` abre no navegador; Adminer loga no MySQL.

**Fase 2 — Schema Drizzle, migrations, seed**
`packages/shared/src/db/schema.ts` com todas as tabelas acima; `drizzle.config.ts` + `db:generate`/`db:migrate`; `seedAdmin.ts` cria 1 estado/regional/bar/admin.
*Pronto quando*: migrations aplicam do zero sem erro; tabelas corretas no Adminer; seed cria admin com senha em hash.

**Fase 3 — Autenticação (login/sessão/roles)**
`auth/password.ts`, `auth/session.ts`, router `auth`, `protectedProcedure`/`adminProcedure`; frontend `LoginPage` + `authGuard`.
*Pronto quando*: login via curl retorna cookie válido; `auth.me` funciona com cookie e falha sem ele; UI loga e redireciona; logout invalida a sessão.

**Fase 4 — CRUD estado/regional/bar/dispositivo (admin)**
Routers `estados`/`regionais`/`bares`/`dispositivos`; telas admin no frontend; modal de "token gerado uma única vez".
*Pronto quando*: admin cria a hierarquia completa até um dispositivo com token pela UI; não-admin recebe `FORBIDDEN`.

**Fase 5 — Endpoint de ingestão de sync + upload de comprovante**
`syncPayload.ts` (Zod, espelhando o `CentralPayload` descrito na seção "Contrato"), `deviceAuth.ts`, router `sync` (`ingest`/`heartbeat`), `syncIngestService.ts` (passo a passo acima), `uploadComprovanteRoute.ts` + `s3Service.ts` (MinIO em dev). Fixture de payload real anonimizado (pode ser fornecida por quem tem acesso ao app mobile, ou gerada manualmente seguindo o schema do contrato).
*Pronto quando*: curl com device token + payload fixture retorna `{ok:true,...}` e popula `pedidos`/`pedido_itens`/`operadores`/`sync_audit_events`; reenviar não duplica; upload multipart grava no S3/MinIO e cria `comprovantes`.

**Fase 6 — Queries agregadas do dashboard**
`dashboardAggregationService.ts`, `deviceStatusService.ts`, router `dashboard`. Testes de integração cobrindo escopo ADMIN/ESTADO/REGIONAL.
*Pronto quando*: `dashboard.overview` retorna números diferentes e corretos por escopo; `porDispositivo` bate com soma manual via SQL no Adminer.

**Fase 7 — Frontend: telas principais**
`RegionalOverviewPage` (dispositivos com badge de status), `DashboardPage` (StatCards), `DeviceSummaryPage`. tRPC + React Query + Wouter.
*Pronto quando*: fluxo login → regional → dashboard → resumo por dispositivo funciona sem erro no console, com loading/empty states.

**Fase 8 — Testes automatizados (Vitest)**
Cobrir: login (senha errada/sessão expirada/revogada), `sync.ingest` (idempotência, device desconhecido, resolução de `dispositivo_id`), `dashboard` (escopos diferentes). Banco de teste efêmero via Docker Compose dedicado, migrado do zero em `beforeAll`.
*Pronto quando*: `pnpm --filter api test` roda e passa reproduzivelmente do zero.

**Fase 9 — Integração de ponta a ponta com o app mobile real**
Esta fase depende do outro documento estar concluído do lado do app. Aqui, do lado do backend, é só validação: apontar um app mobile de teste (já alterado conforme o outro documento) para esta API rodando localmente (IP de rede local ou túnel tipo ngrok) e confirmar que os dados aparecem no dashboard em segundos.
*Pronto quando*: "Enviar para a central" (ou o novo sync automático) no app reflete no dashboard web; comprovante de um pedido pago aparece via URL assinada do S3.

**Fase 10 — Backlog pós-MVP (só documentar, sem código)**
Sync incremental (delta, depende de mudança correspondente no app — ver outro documento); RBAC granular para ESTADO/REGIONAL criarem recursos; entidade `integrantes` completa (depende do payload do app expor essa entidade); reset de senha self-service; escolha de hospedagem de produção (explicitamente adiada); denormalização de `regional_id`/`estado_id` se performance exigir; limpeza de sessões expiradas.

---

## Riscos e decisões em aberto (deste sistema, com recomendação padrão)

1. Header de auth de dispositivo → dois headers separados (`X-Device-Id`/`X-Device-Token`), não um `Authorization` composto — mais fácil de logar e não colide com cookie de sessão.
2. JWT: `exp` 15min renovado a cada request válido; sessão real de 7 dias revogável no banco.
3. S3 em dev → MinIO no `docker-compose.yml` (endpoint customizável via `S3_ENDPOINT`), bucket AWS real só em produção.
4. Convenção de nomes → sempre camelCase no Drizzle/TS mapeado para snake_case explícito na coluna MySQL.
5. Datas do app (`dataPedido`/`horaPedido`) chegam sem timezone explícito → armazenar como veio, não normalizar para UTC agora (risco de bug de fuso sem necessidade real).
6. Só ADMIN cria recursos organizacionais no MVP — permitir ESTADO/REGIONAL criar dentro do próprio escopo fica para depois.
7. Payload sempre snapshot completo (decisão do lado do app, ver outro documento) → monitorar tamanho em `sync_batches.payload_json`; se crescer demais, priorizar sync incremental do backlog.
8. `item_id_local_raw` do payload não é confiável como FK → usar sempre os snapshots (`item_nome_snapshot`/`valor_unitario_snapshot`) para exibição; resolver de forma definitiva depende do app passar a exportar um `itemSyncId` estável (backlog, ver outro documento).

## Verificação end-to-end sugerida

1. Fases 1-4: setup + auth + CRUD, verificáveis via curl/Adminer/UI conforme critérios de cada fase.
2. Fase 5: usar uma fixture de payload conforme o contrato descrito acima, testar via curl e depois em teste automatizado (Fase 8).
3. Fase 6-7: conferir números do dashboard contra queries SQL manuais no Adminer para o mesmo dataset/escopo.
4. Fase 9: teste real ponta a ponta com um app mobile já alterado (outro documento) apontando para o backend rodando localmente.
