# Documentação do Bar13

Esta pasta reúne a documentação funcional e técnica do app `Bar13`, escrita a partir da análise do código atual do projeto.

O foco aqui é explicar:

- como o app está organizado hoje
- quais telas existem e como elas se conectam
- quais features já estão implementadas
- quais regras de negócio estão valendo no código
- como o fluxo principal funciona na prática
- como o app persiste dados localmente

## Arquivos desta pasta

- [apresentacao-bar13.html](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/apresentacao-bar13.html): página estática de apresentação visual e institucional do sistema para integrantes, ADMs e diretoria.
- [manual-do-operador.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/manual-do-operador.md): guia prático para treinamento e uso diário do app no balcão.
- [especificacao-android-nativo.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/especificacao-android-nativo.md): especificação consolidada para uma IA ou equipe replicar o app em Android nativo.
- [visao-geral.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/visao-geral.md): panorama do produto, stack, navegação e princípios de funcionamento.
- [telas.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/telas.md): descrição detalhada de cada tela existente no app.
- [funcionalidades.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/funcionalidades.md): catálogo das features, regras e limitações operacionais.
- [fluxo-principal.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/fluxo-principal.md): passo a passo do fluxo principal e dos fluxos auxiliares do balcão.
- [mapa-de-navegacao.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/mapa-de-navegacao.md): mapa das rotas, entradas e saídas entre telas.
- [arquitetura-e-dados.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/arquitetura-e-dados.md): visão técnica da arquitetura, banco SQLite, persistência local e armazenamento de arquivos.
- [google-planilhas-importacao.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/google-planilhas-importacao.md): integração sugerida entre exportação CSV do app, Google Drive e Google Planilhas.
- [google-apps-script/bar13-importador-consolidado.gs](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/google-apps-script/bar13-importador-consolidado.gs): script pronto para importar o consolidado do Drive para a planilha com atualização sem duplicidade.
- [google-planilhas-central-webapp.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/google-planilhas-central-webapp.md): configuração da central gerencial com botão `Enviar para a central`.
- [google-apps-script/bar13-central-webapp.gs](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/google-apps-script/bar13-central-webapp.gs): Web App do Apps Script que recebe JSON do app e faz upsert das abas gerenciais.
- [google-planilhas-dashboard.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/google-planilhas-dashboard.md): estrutura analítica da central com dashboards, bases auxiliares, filtros e alertas operacionais.
- [google-apps-script/bar13-dashboard-estrutura.gs](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/google-apps-script/bar13-dashboard-estrutura.gs): script que cria `config`, bases auxiliares, alertas e os painéis `dashboard_operacao` e `dashboard_gerencial`.
- [tutorial-central-gerencial.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/tutorial-central-gerencial.md): passo a passo completo para implantar, configurar e operar o novo fluxo de operadores e central gerencial.

## Para quem esta documentação serve

- operador do bar que precisa entender o fluxo do app
- pessoa de produto que quer entender o comportamento atual
- desenvolvedor que vai manter ou evoluir o projeto
- responsável por teste ou implantação em Android e iOS

## Escopo desta documentação

Esta documentação descreve o estado atual implementado no repositório, incluindo pontos importantes que nem sempre são óbvios pela interface.

Exemplos:

- reaproveitamento de pedido aberto do mesmo integrante no mesmo dia
- cancelamento automático quando o último item é removido
- suporte manual a `CARTAO_CREDITO` com comprovante, sem integração com maquininha
- sincronização offline por eventos idempotentes via pacote `.bar13sync`
- envio para central com feedback visual de loading e progresso por lote
- uso da mesma base de período em relatórios e exportações
- limpeza destrutiva de histórico ao apagar bases de importação
- manutenção de colunas legadas de número do item no banco, fora da interface atual

## Ordem recomendada de leitura

1. Abra [apresentacao-bar13.html](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/apresentacao-bar13.html) quando precisar apresentar visualmente o sistema para integrantes, ADMs e diretoria.
2. Leia [manual-do-operador.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/manual-do-operador.md) para treinamento e operação no balcão.
3. Use [especificacao-android-nativo.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/especificacao-android-nativo.md) quando o objetivo for recriar o app em Android nativo.
4. Leia [visao-geral.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/visao-geral.md) para entender o produto.
5. Abra [mapa-de-navegacao.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/mapa-de-navegacao.md) para visualizar a navegação.
6. Consulte [telas.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/telas.md) para detalhes de interface.
7. Use [funcionalidades.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/funcionalidades.md) para regras e capacidades.
8. Use [fluxo-principal.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/fluxo-principal.md) para treinamento e operação.
9. Leia [arquitetura-e-dados.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/arquitetura-e-dados.md) para manutenção técnica.
