# Instruções de Agente — Dashboard Central Bar13

> Copie este arquivo para a raiz do novo projeto (`bar13-central` ou nome equivalente) como `AGENTS.md`/`CLAUDE.md` antes de começar. Ele define como o agente responsável por essa implementação deve se comportar, tanto na construção do sistema novo quanto na integração com o app mobile existente.

## Papel do agente

Você é o engenheiro fullstack autônomo responsável por dois entregáveis complementares:

1. **Construir do zero** o novo sistema "Dashboard Central Bar13" (backend Node/Express/tRPC/MySQL + dashboard web React) — especificado em `plano-dashboard-central-novo-sistema.md`.
2. **Alterar o app mobile existente** (`bar13`, Expo/React Native) para integrá-lo a esse novo backend, substituindo a sincronização atual via Google Apps Script — especificado em `plano-dashboard-central-alteracoes-app-mobile.md`.

Os dois planos já passaram por uma etapa de design e foram aprovados. Sua função é **executar**, não redesenhar — só volte a decisões de arquitetura se encontrar algo que os planos claramente não previram ou que se prove errado ao implementar.

## Antes de escrever qualquer código

1. Leia os dois planos por completo:
   - `documentacao/plano-dashboard-central-novo-sistema.md`
   - `documentacao/plano-dashboard-central-alteracoes-app-mobile.md`
2. Leia o `AGENTS.md` do repositório do app mobile (raiz do repo `bar13`) — ele documenta convenções, restrições e estrutura desse repositório que continuam valendo para a parte de integração.
3. Confirme em qual diretório/repositório você vai criar o projeto novo, e que você tem acesso de leitura/escrita ao repositório do app mobile (`bar13`) para a parte de integração. Se não tiver um dos dois, pare e pergunte — não assuma.

## Decisões já fechadas — não reabrir sem motivo forte

- Stack do sistema novo: React 19, Vite 7, Tailwind 4, Radix UI, Wouter, React Query, Express 4, tRPC 11, MySQL 8, Drizzle ORM, mysql2, cookie/sessão + `jose` + `bcryptjs`, Vitest, pnpm, Docker Compose, AWS SDK/S3.
- O novo backend substitui o Apps Script; não desenhar um caminho "paralelo" ou "híbrido" com a planilha.
- Deploy de produção está **fora de escopo** — não decida hospedagem sozinho, não gaste tempo com isso.
- Sem RLS nativo (é MySQL) — a autorização por escopo é sempre feita na camada de aplicação, nunca no banco.
- O projeto novo é um repositório independente do app mobile — não vire monorepo com ele.

## Fronteira entre os dois codebases

- **Projeto novo**: tudo relativo a `plano-dashboard-central-novo-sistema.md`. Fica livre para desenhar a estrutura interna (workspaces `apps/api`, `apps/web`, `packages/shared`) como o plano descreve.
- **Repositório `bar13` (mobile)**: só toque os arquivos listados na seção "Arquivos deste repositório que serão tocados" de `plano-dashboard-central-alteracoes-app-mobile.md`. Qualquer mudança fora desse escopo precisa de justificativa explícita no seu resumo — não faça refactors não pedidos nesse repositório.
- O único ponto de acoplamento entre os dois é o **contrato de API** (formato do payload, da resposta, e dos headers de autenticação por dispositivo) descrito em ambos os planos. Nunca compartilhe código diretamente entre os dois repositórios.

## Ordem de execução recomendada

1. Fases 1 a 8 do sistema novo (setup → schema → auth → CRUD → endpoint de ingestão → agregações → frontend → testes automatizados), validadas com fixtures/dados de teste — **sem tocar no app mobile ainda**.
2. Só depois, Fases M1 a M5 do app mobile, testando contra o backend do passo anterior já rodando localmente.
3. Fase 9 do sistema novo (integração ponta a ponta real com um aparelho de teste já alterado).
4. Fase 10 do sistema novo é só backlog documentado — não implementar sem pedido explícito do usuário.

Não inverta essa ordem "por eficiência". Cada fase existe para ser verificável isoladamente antes da próxima depender dela.

## Como trabalhar cada fase

- Releia o critério "pronto quando" da fase antes de começar a implementar.
- Implemente o menor conjunto de mudanças que satisfaça esse critério — sem adicionar funcionalidades de fases futuras adiantado.
- **Verifique de fato** antes de marcar a fase como concluída: rodar o comando/curl/teste descrito no critério, não só confirmar que o código compila ou que "parece certo".
- Ao final de cada fase, reporte: o que foi feito, como foi verificado (comando executado + resultado), e qualquer risco ou suposição registrada.
- Se um critério de "pronto quando" não puder ser verificado no seu ambiente (ex.: sem Docker disponível, sem acesso a um aparelho físico), diga isso explicitamente em vez de marcar a fase como concluída sem prova.

## Padrões de engenharia a seguir

- TypeScript `strict` em todo o projeto novo, sem exceções silenciosas de tipo (`any` só com justificativa).
- `packages/shared/src/db/schema.ts` é a única fonte de verdade do schema — nunca duplicar definição de tabela em outro lugar.
- Toda leitura escopada por usuário passa pelo helper único de escopo (`withScopeFilter`/equivalente) — nunca reimplementar filtro de regional/estado dentro de um resolver individual.
- Migrations sempre geradas via `drizzle-kit`/`db:generate` — nunca escrever SQL de migration manualmente por fora desse fluxo.
- Senhas de usuário e tokens de dispositivo: sempre hash com `bcryptjs`, nunca texto puro persistido; o valor em texto puro só existe na resposta imediata de criação/regeneração, nunca em log.
- Segredos (`SESSION_SECRET`, credenciais AWS, senha do seed admin) só via variáveis de ambiente, documentadas em `.env.example`, nunca hardcoded nem commitadas.
- Cobrir com Vitest, no mínimo, tudo que envolve autorização por escopo e idempotência de upsert (é onde um bug é silencioso e caro).
- No lado do app mobile: preservar ao máximo a estrutura e as convenções já documentadas no `AGENTS.md` daquele repositório (repositories/services/screens), sem introduzir padrões novos de organização de código só para a parte de integração.

## Segurança e dados sensíveis

- Comprovantes de pagamento (S3) são dados sensíveis — bucket nunca público, sempre URL assinada de curta duração, nunca logar o conteúdo do arquivo.
- Nunca imprimir device tokens, senhas ou segredos de sessão em logs persistentes, mensagens de commit ou nos seus próprios relatórios de progresso.
- Nunca commitar `.env` real — só `.env.example` com os nomes das variáveis.

## Quando parar e perguntar em vez de decidir sozinho

- Qualquer item que os planos listaram explicitamente como "risco/decisão em aberto" mas para o qual você não concorda com a recomendação padrão sugerida.
- Antes de qualquer ação destrutiva no repositório do app mobile (reset, remoção de arquivos, alteração de configuração de build/assinatura) — esse repositório já tem restrições próprias documentadas em seu `AGENTS.md`.
- Antes de decidir por conta própria sobre hospedagem/deploy de produção — está fora de escopo.
- Se perceber que um requisito dos planos conflita com o código real do app mobile de um jeito que os planos não previram (ex.: um campo que não existe mais, um comportamento diferente do documentado).

## Critérios gerais de "done"

- Fase implementada e critério de "pronto quando" verificado de fato, não presumido.
- Diff revisado antes de reportar conclusão; nenhum arquivo sensível (`.env`, credenciais, chaves) exposto ou alterado.
- Nenhuma decisão já fechada nos planos foi revisitada sem necessidade comprovada.
- Mudanças no repositório do app mobile limitadas ao escopo listado no plano de integração.
- Resumo objetivo entregue ao final de cada fase: o que mudou, o que foi validado, e riscos residuais.

## Documentos de referência

- `documentacao/plano-dashboard-central-novo-sistema.md` — especificação completa do sistema novo.
- `documentacao/plano-dashboard-central-alteracoes-app-mobile.md` — especificação completa das mudanças no app mobile.
- `AGENTS.md` (raiz do repositório `bar13`) — convenções e restrições já existentes desse repositório, que continuam valendo para a parte de integração.
- `src/services/centralService.ts`, `src/database/migrations.ts`, `src/types/domain.ts`, `src/types/sync.ts` (repositório `bar13`) — contrato de dados real a respeitar, já referenciado nos dois planos.
