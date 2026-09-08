# Aceitação e validação

## Natureza da evidência

Os cenários `AC-*` das funcionalidades são contratos de comportamento derivados do código. Não são testes executáveis nem resultados de execução. A aplicação não possui script `test` no `package.json` nesta baseline. Typecheck/lint não exercitam SQLite nativo, seletores, pagamentos, compartilhamento ou Web App.

## Cenários transversais

Executar futuramente em ambiente descartável, identificando plataforma, versão, revisão do código, responsável e resultado. Limpeza/reset descritos na aplicação não devem ser experimentados na base de operação para validar documentação.

| ID | Dado / Quando | Então | Cobertura |
| --- | --- | --- | --- |
| E2E-01 | Banco vazio; abrir app, configurar bar, cadastrar operador e assumir aparelho | Bootstrap pronto, configuração persistida e operador selecionado | ARQ, CFG, CAD |
| E2E-02 | Integrante de teste e item R$ 7,50/saldo 3; abrir pedido e adicionar duas unidades | Pedido aberto total R$ 15,00, estoque 1, snapshots e eventos correspondentes | PED |
| E2E-03 | Pedido E2E-02; reiniciar app, retomar e fechar | Mesmo pedido com dados persistidos; pendente sem nova baixa de estoque | PED, CON |
| E2E-04 | Pedido pendente; anexar comprovante fictício via PIX | Pago, anexo local, blob/evento e acesso pelo histórico | PAG |
| E2E-05 | Pedidos separados para cartão e dinheiro; concluir os dois fluxos | Cartão com arquivo obrigatório; dinheiro com confirmação e sem anexo | PAG |
| E2E-06 | Pedido de teste com uma unidade; remover a última unidade | Cancelado no histórico, total zero e saldo restituído | PED, CON |
| E2E-07 | Aberto R$ 10, pendente R$ 20, pago R$ 30, cancelado zero; consultar mesmo período e exportar | Métricas 3/60/30/30 e 1 devedor; CSV de vendas também inclui cancelado | CON, CSV |
| E2E-08 | Base de cadastros fictícia; importar CSV válido e reimportar com valores alterados | Upsert, contagens após dedupe e saldo substituído, sem duplicação esperada de nomes | CAD, CSV |
| E2E-09 | Dois aparelhos de teste, A com pedido/anexo e B vazio; exportar de A e importar em B | Dados reconstruídos, comprovante legível, origem e pacote registrados | SYN |
| E2E-10 | Pacote E2E-09 já importado; tentar novamente e depois pacote novo com eventos repetidos | Mesmo pacote recusado; pacote novo ignora eventos conhecidos | SYN |
| E2E-11 | Endpoint de teste configurado; provocar falha HTTP e depois sucesso | Lote retido em erro, rodada posterior processa fila na ordem, UI informa progresso | CEN |
| E2E-12 | Planilha de teste com scripts e payload fictício; reenviar mesmos IDs e preparar dashboards | Upsert sem duplicar linhas de dados, log acrescentado e painéis gerados com limites documentados | CEN, PLN |
| E2E-13 | Base descartável completa; cancelar e depois confirmar limpeza CSV/reset em ensaios separados | Cancelar não altera; confirmar produz exatamente os alcances descritos | CFG, CSV, DAT |

Além do caminho principal, executar os AC negativos de cada spec: falta de operador, dados inválidos, estoque esgotado, fechamento vazio, exclusões vinculadas, arquivo cancelado, pacote incompatível e resposta não JSON.

## Checks leves disponíveis

Na raiz:

```bash
./scripts/codex-check.sh
```

Esse wrapper roda typecheck/lint e omite build. Alternativas individuais:

```bash
./scripts/ai-typecheck.sh
./scripts/ai-lint.sh
```

Para conferir diff documental:

```bash
git diff --check
git diff --stat
git diff -- README.md specs
git status --short
```

Arquivos novos ainda não adicionados ao índice não aparecem em `git diff`; revisar também o conteúdo em `specs`. Nenhum comando de reset de dados, build, deploy ou chamada real à central é necessário para esta tarefa documental.

## Evidência desta entrega

- Código de todas as telas, serviços, repositórios, tipos, migrações e scripts gerenciais relevantes inspecionado.
- Dicionário físico conferido com schema em SQLite **somente em memória**, sem abrir banco operacional do app.
- Validação documental aprovada: 20 documentos, 223 links locais, 88 requisitos funcionais e 64 cenários funcionais; 15 telas e 11 tipos de evento cobertos. Há também requisitos/cenários transversais de arquitetura, dados e interface e 13 roteiros E2E.
- Dicionário conferido: 11 tabelas e 109 colunas; os contratos descrevem as duas entradas CSV e quatro exportações, pacote offline e payload HTTP.
- Contratos confrontados com a AST TypeScript: 107 campos dos tipos JSON selecionados e 36 ocorrências de colunas específicas nos quatro exportadores CSV presentes na documentação.
- `EXPO_NO_DOTENV=1 ./scripts/codex-check.sh`: **aprovado** em 08/09/2026, com typecheck e lint sem falhas. A variável evita carregamento de arquivos de ambiente pelo Expo durante o check. O wrapper pulou testes por ausência de script e omitiu build deliberadamente.
- `git diff --check`: **aprovado**; arquivos novos também inspecionados quanto a espaços finais, links e blocos de código, pois ainda não estavam no índice Git.
- Cenários E2E/AC mobile e execução dos scripts na conta Google: **não executados** nesta tarefa.

## Critério de conclusão para próximas alterações

Requisito e contrato atualizados, fontes e rastreabilidade consistentes, diff revisado, checks apropriados executados e limitações explicitadas. Para mudanças de negócio, acrescentar evidência dos cenários afetados, evitando marcar um cenário aprovado apenas porque o código compila.
