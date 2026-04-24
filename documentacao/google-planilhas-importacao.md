# Integração com Google Planilhas

Este fluxo foi pensado para manter o `Bar13` local-first e, ao mesmo tempo, alimentar uma planilha no Google de forma operacionalmente simples:

1. o atendente exporta o `CSV consolidado por período` no app
2. compartilha o arquivo para a pasta da unidade no Google Drive
3. um `Google Apps Script` lê essa pasta e atualiza a planilha automaticamente

## O que foi ajustado no app

O CSV consolidado agora sai com colunas extras para importação segura:

- `bar_nome`
- `bar_slug`
- `tipo_relatorio`
- `exportado_em_data`
- `exportado_em_hora`
- `exportado_em_iso`
- `chave_importacao`

A coluna `chave_importacao` permite que a planilha faça `upsert` por período, em vez de duplicar linhas quando o mesmo relatório é exportado novamente.

Exemplo de chave:

```text
bar13__consolidado_periodo__2026-04-01__2026-04-23
```

## Arquivo do Apps Script

O script pronto está em:

- [documentacao/google-apps-script/bar13-importador-consolidado.gs](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/google-apps-script/bar13-importador-consolidado.gs)

## Estrutura esperada no Google Drive

O script está preparado para buscar pastas dentro de `Meu Drive` com esta estrutura:

- `Meu Drive/Estado/Bar/Bar-Capital-Imports`
- `Meu Drive/Estado/Bar/Bar-Baturite-Imports`

Você pode adicionar novas unidades depois repetindo o mesmo padrão no array `sources` do script.

## Passo a passo para instalar

### 1. Criar a planilha

1. Abra o Google Planilhas.
2. Crie uma planilha nova.
3. Dê um nome claro, por exemplo: `Bar13 Consolidado`.

### 2. Abrir o Apps Script

1. Na planilha, vá em `Extensões > Apps Script`.
2. Apague qualquer conteúdo inicial do arquivo `Code.gs`.
3. Cole o conteúdo do arquivo [documentacao/google-apps-script/bar13-importador-consolidado.gs](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/google-apps-script/bar13-importador-consolidado.gs).
4. Salve o projeto com um nome como `Bar13 Importador`.

### 3. Conferir a configuração das pastas

No topo do script existe este bloco:

```javascript
const BAR13_IMPORT_CONFIG = {
  timezone: 'America/Fortaleza',
  fileNamePrefix: 'bar13_consolidado_',
  dataSheetName: 'bar13_consolidado_importado',
  logSheetName: 'bar13_importacoes_log',
  sources: [
    {
      unidade: 'Capital',
      pathSegments: ['Estado', 'Bar', 'Bar-Capital-Imports'],
    },
    {
      unidade: 'Baturite',
      pathSegments: ['Estado', 'Bar', 'Bar-Baturite-Imports'],
    },
  ],
};
```

Se os nomes das pastas no Google Drive estiverem exatamente assim, você não precisa mudar nada.

Se quiser adicionar outra unidade, inclua mais um item em `sources`.

Exemplo:

```javascript
{
  unidade: 'Centro',
  pathSegments: ['Estado', 'Bar', 'Bar-Centro-Imports'],
}
```

### 4. Preparar a planilha

1. No editor do Apps Script, selecione a função `configurarPlanilhaBar13`.
2. Clique em `Executar`.
3. Na primeira vez, o Google vai pedir autorização.
4. Aceite as permissões da planilha e do Drive.

Essa função cria e prepara as abas:

- `bar13_consolidado_importado`
- `bar13_importacoes_log`

### 5. Fazer o primeiro teste

1. No `Bar13`, abra `Exportação CSV`.
2. Escolha o período.
3. Toque em `Exportar consolidado por período`.
4. Quando abrir o compartilhamento, envie o arquivo para a pasta certa no Drive:
   - `Meu Drive/Estado/Bar/Bar-Capital-Imports`
   - ou a pasta da unidade correspondente
5. Volte ao Apps Script.
6. Selecione a função `importarArquivosBar13`.
7. Clique em `Executar`.

Se tudo estiver certo:

- a aba `bar13_consolidado_importado` será preenchida ou atualizada
- a aba `bar13_importacoes_log` registrará o processamento

## Como o upsert funciona

Cada linha importada usa esta chave:

```text
unidade::chave_importacao
```

Na prática:

- se o período daquela unidade ainda não existe na planilha, ele insere
- se o período já existe, ele atualiza a mesma linha

Isso evita duplicidade quando o consolidado for exportado de novo para corrigir números.

## Como automatizar sem clicar toda vez

Depois do teste manual funcionar:

1. No Apps Script, rode a função `instalarGatilhoHorarioBar13`.
2. O script passará a verificar as pastas uma vez por hora.

Se quiser remover esse agendamento depois:

1. Rode a função `removerGatilhosBar13`.

## Como o script decide se um arquivo precisa ser lido

Ele usa duas proteções:

- só lê arquivos `.csv` com prefixo `bar13_consolidado_`
- ignora arquivos já processados quando não houve alteração desde a última execução

Se um arquivo for substituído ou atualizado no Drive, ele será reprocessado.

## Estrutura da aba importada

A aba `bar13_consolidado_importado` recebe estas colunas de controle:

- `row_key`
- `unidade`
- `pasta_origem`
- `arquivo_nome`
- `arquivo_id`
- `arquivo_atualizado_em`
- `importado_em`

E também as colunas do CSV exportado pelo app:

- `bar_nome`
- `bar_slug`
- `tipo_relatorio`
- `periodo_inicial`
- `periodo_final`
- `exportado_em_data`
- `exportado_em_hora`
- `exportado_em_iso`
- `chave_importacao`
- `total_de_pedidos`
- `total_vendido`
- `total_pago`
- `total_pendente`
- `quantidade_devedores`
- `quantidade_comprovantes`
- `resumo_legivel`

## Fórmulas sugeridas na planilha

Se quiser uma aba de visualização, crie outra aba chamada `resumo` e use fórmulas em cima de `bar13_consolidado_importado`.

Exemplos:

```gs
=QUERY(bar13_consolidado_importado!A:W;"select B,J,K,L,M,N,O,P,Q,R,S,T,U,V,W where J is not null order by K desc";1)
```

```gs
=SOMASES(bar13_consolidado_importado!R:R;bar13_consolidado_importado!B:B;"Capital")
```

Observação:

- os índices de coluna podem mudar se você adaptar o script
- por isso, vale validar a posição final das colunas antes de montar dashboards mais elaborados

## Rotina operacional sugerida

1. atendente exporta o consolidado no app
2. compartilha para a pasta da unidade no Drive
3. a planilha importa automaticamente pelo gatilho
4. a equipe consulta a aba final ou o dashboard montado por cima dela

## Se der erro

Cheque nesta ordem:

1. o arquivo foi realmente salvo na pasta correta do Drive
2. o nome da pasta bate exatamente com o configurado em `pathSegments`
3. o arquivo começa com `bar13_consolidado_`
4. o CSV foi gerado depois da atualização do app
5. a aba `bar13_importacoes_log` mostra a mensagem detalhada do erro
