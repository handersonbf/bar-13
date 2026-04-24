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

- [visao-geral.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/visao-geral.md): panorama do produto, objetivos, stack, navegação e princípios de funcionamento.
- [telas.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/telas.md): descrição detalhada de cada tela existente no app.
- [funcionalidades.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/funcionalidades.md): catálogo das features, regras e comportamentos operacionais.
- [fluxo-principal.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/fluxo-principal.md): passo a passo do fluxo principal e dos fluxos auxiliares do balcão.
- [mapa-de-navegacao.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/mapa-de-navegacao.md): mapa das rotas, entradas e saídas entre telas.
- [arquitetura-e-dados.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/arquitetura-e-dados.md): visão técnica da arquitetura, banco SQLite, persistência local e armazenamento de arquivos.
- [google-planilhas-importacao.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/google-planilhas-importacao.md): integração sugerida entre exportação CSV do app, Google Drive e Google Planilhas.
- [google-apps-script/bar13-importador-consolidado.gs](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/google-apps-script/bar13-importador-consolidado.gs): script pronto para importar o consolidado do Drive para a planilha com atualização sem duplicidade.

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
- exigência de comprovante apenas para pagamento PIX
- uso da mesma base de período em relatórios e exportações
- limpeza destrutiva de histórico ao apagar bases de importação

## Ordem recomendada de leitura

1. Leia [visao-geral.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/visao-geral.md) para entender o produto.
2. Abra [mapa-de-navegacao.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/mapa-de-navegacao.md) para visualizar a navegação.
3. Consulte [telas.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/telas.md) para detalhes de interface.
4. Use [funcionalidades.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/funcionalidades.md) para regras e capacidades.
5. Use [fluxo-principal.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/fluxo-principal.md) para treinamento e operação.
6. Leia [arquitetura-e-dados.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/arquitetura-e-dados.md) para manutenção técnica.
