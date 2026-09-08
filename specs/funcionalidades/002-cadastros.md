# 002 — Cadastros e operadores

**Estado:** implementado. **Ator:** pessoa usando o aparelho. **Precondição:** banco pronto. Cadastro e seleção de operador não dependem de login ou de outro operador selecionado.

## Requisitos

| ID | Comportamento |
| --- | --- |
| CAD-001 | Criar/editar integrante com nome e patente obrigatórios; reduzir sequências de espaços internos e converter patente para maiúsculas |
| CAD-002 | Recusar nome duplicado de integrante, item ou operador no cadastro manual, considerando normalização de acentos, caixa e espaços externos |
| CAD-003 | Buscar por trecho do nome normalizado e apresentar lista ordenada por nome com `COLLATE NOCASE` |
| CAD-004 | Excluir integrante apenas se não existir nenhum pedido vinculado, inclusive cancelado |
| CAD-005 | Criar/editar item com nome, valor finito maior que zero e saldo de estoque inteiro não negativo |
| CAD-006 | Listar apenas itens ativos; permitir filtro adicional “Mostrar só itens sem estoque” na gestão de itens |
| CAD-007 | Editar saldo substitui a quantidade atual; não é uma entrada incremental nem um livro de movimentações |
| CAD-008 | Excluir item apenas se não existir linha de pedido que o referencie, inclusive em pedido cancelado |
| CAD-009 | Criar/editar operador por nome; novos operadores ficam ativos; listar ativos e inativos na gestão |
| CAD-010 | Desativar/reativar operador mediante confirmação, preservando cadastro e snapshots históricos |
| CAD-011 | Assumir aparelho apenas com operador existente e ativo; persistir seu sync ID e nome na configuração |
| CAD-012 | Limpar seleção atual mediante confirmação; desativar localmente o selecionado também limpa a seleção; renomeá-lo atualiza seu nome na configuração |
| CAD-013 | Registrar eventos de upsert nas criações/edições e mudanças de atividade; exclusões individuais de integrante/item não produzem evento de exclusão |

## Fluxos

Formulário alterna criação e edição. “Editar” preenche os campos; “Cancelar edição” limpa o formulário, sem apagar o cadastro. Após sucesso, formulário é limpo e lista recarregada. As três telas possuem busca com `useDeferredValue`, recarga ao ganhar foco e botão de salvar desabilitado durante a gravação. Falhas de validação e exclusão são exibidas em alertas.

Gestão de integrantes e itens oferece atalho para CSV. O formulário de item converte preço com `parseCurrencyInput` e estoque com `Number`; estoque em branco no cadastro manual se torna zero. `numero_item` é gerado internamente como máximo existente + 1; não aparece no formulário. Criar item define `ativo = 1`; não há botão de ativação/desativação de item nessa interface.

Operadores têm ações “Assumir aparelho”, “Editar”, “Desativar/Reativar” e “Limpar operador atual”. Não há exclusão individual de operador. Assumir outro operador não altera o responsável dos pedidos já abertos: novas mutações usam o operador atual como ator do evento.

## Dados e regras de histórico

Cadastros têm ID numérico local, `sync_id`, criação e atualização. Upserts geram `INTEGRANTE_UPSERTED`, `ITEM_UPSERTED` ou `OPERADOR_UPSERTED`. Busca usa `normalizeSearch`: decomposição NFD, remoção de diacríticos, minúsculas e trim; não colapsa espaços internos do texto pesquisado. A preparação dos nomes manuais colapsa os espaços antes da deduplicação.

Alterar integrante não reescreve nome/patente em pedidos existentes. Alterar operador não reescreve snapshots dos pedidos. Alterar item não reescreve imediatamente as linhas antigas; o comportamento ao adicionar novas unidades depois de mudar preço está em [pedidos](003-pedidos.md).

## Aceitação

- **AC-CAD-01 — Normalização:** Dado integrante `José Silva`, quando tentar cadastrar `jose silva`, então recusar duplicata. Ao pesquisar `JOSE`, encontrar o cadastro.
- **AC-CAD-02 — Campos:** Dado nome ou patente vazios, quando salvar integrante, então informar o campo obrigatório. Patente `sgt` válida é persistida como `SGT`.
- **AC-CAD-03 — Item inválido:** Dado preço zero/negativo/não finito ou estoque negativo/fracionário, quando salvar item, então recusar sem criar o registro.
- **AC-CAD-04 — Reposição:** Dado saldo 3, quando editar estoque para 10, então o saldo final é 10.
- **AC-CAD-05 — Histórico protegido:** Dado integrante/item referenciado por pedido, quando confirmar exclusão individual, então bloquear. Cadastro sem vínculo pode ser excluído.
- **AC-CAD-06 — Operador:** Dado operador inativo, quando tentar assumir aparelho, então bloquear. Dado selecionado ativo, quando desativá-lo localmente, então limpar a seleção e preservar pedidos anteriores.
- **AC-CAD-07 — Autoria:** Dado pedido criado por A, quando selecionar B e adicionar consumo, então manter A no snapshot do pedido e gravar B no novo evento.
- **AC-CAD-08 — Filtro:** Dado item ativo com saldo zero e outro com saldo positivo, quando ativar filtro de sem estoque, então listar apenas o primeiro.

## Fontes

[Integrantes](../../src/repositories/integrantesRepository.ts), [itens](../../src/repositories/itensRepository.ts), [operadores](../../src/repositories/operatorsRepository.ts), [gestão de integrantes](../../src/screens/GerenciarIntegrantesScreen.tsx), [gestão de itens](../../src/screens/GerenciarItensScreen.tsx), [gestão de operadores](../../src/screens/GerenciarOperadoresScreen.tsx), [normalização](../../src/utils/format.ts).
