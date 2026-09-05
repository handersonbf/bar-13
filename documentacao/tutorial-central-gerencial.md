# Tutorial da Central Gerencial

Este tutorial cobre o fluxo novo ponta a ponta:

1. cadastrar operadores
2. escolher quem está operando cada aparelho
3. sincronizar a equipe entre aparelhos
4. configurar a planilha central
5. publicar o Web App do Apps Script
6. preencher URL e token no app
7. usar o botão `Enviar para a central`
8. consultar ranking, auditoria e dashboards na planilha

## Objetivo

Ao final, o bar consegue:

- saber quem foi o responsável por cada venda
- auditar quem mexeu em cada pedido
- atualizar uma planilha central com um toque
- consultar painéis operacionais e gerenciais no Google Planilhas

## 1. Preparar o aparelho mestre

Escolha um aparelho para ser o `aparelho mestre`.

Esse aparelho será usado para:

- cadastrar operadores
- revisar dados do bar
- exportar sincronização para os outros aparelhos

Antes de seguir, confira em `Configurações`:

- nome deste aparelho
- nome do bar
- chave PIX
- QR Code

## 2. Cadastrar operadores

No aparelho mestre:

1. abra `Configurações`
2. toque em `Gerenciar operadores`
3. digite o nome do operador
4. toque em `Cadastrar operador`
5. repita para toda a equipe

Exemplo:

- João
- Maria
- Pedro

## 3. Selecionar quem está operando o aparelho

Ainda em `Gerenciar operadores`:

1. localize o nome correto
2. toque em `Assumir aparelho`

Depois disso, o aparelho passa a ter um operador atual.

Regra importante:

- sem operador atual, o app bloqueia novos pedidos e mudanças operacionais

## 4. Sincronizar os operadores para os outros aparelhos

Se houver mais de um aparelho:

1. no aparelho mestre, abra `Sincronização`
2. toque em `Exportar sincronização`
3. envie o arquivo `.bar13sync`
4. no aparelho de destino, toque em `Importar sincronização`
5. confirme

Repita até todos os aparelhos receberem a equipe.

Em cada aparelho:

1. abra `Gerenciar operadores`
2. toque em `Assumir aparelho` no nome certo

## 5. Criar a planilha central

1. abra o Google Planilhas
2. crie uma planilha nova
3. use um nome como `Bar13 Central`

## 6. Instalar o Apps Script

1. na planilha, vá em `Extensões > Apps Script`
2. apague o conteúdo inicial
3. cole o arquivo [documentacao/google-apps-script/bar13-central-webapp.gs](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/google-apps-script/bar13-central-webapp.gs)
4. crie um novo arquivo `.gs`
5. cole [documentacao/google-apps-script/bar13-dashboard-estrutura.gs](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/google-apps-script/bar13-dashboard-estrutura.gs)
6. salve o projeto

## 7. Definir o token da central

O script atual lê o token em `Propriedades do script`.

No Apps Script:

1. abra `Configurações do projeto`
2. localize `Propriedades do script`
3. crie a chave `BAR13_CENTRAL_TOKEN`
4. salve um valor real para esse token

Esse mesmo valor será preenchido no app depois.

## 8. Preparar as abas da planilha

No editor do Apps Script:

1. selecione `configurarCentralBar13`
2. clique em `Executar`
3. aceite as permissões

Abas brutas criadas:

- `devices`
- `operadores`
- `pedidos_fato`
- `pedido_itens_fato`
- `auditoria_eventos`
- `importacoes_log`

## 9. Criar os dashboards

Depois que os dois arquivos forem salvos:

1. volte para a planilha
2. recarregue a página, se necessário
3. abra o menu `Bar13 Central`
4. clique em `Criar/atualizar dashboards`

Abas criadas:

- `config`
- `dash_base_pedidos`
- `dash_base_itens`
- `dash_base_auditoria`
- `dash_alertas`
- `dashboard_operacao`
- `dashboard_gerencial`

Esses painéis usam as abas brutas como fonte e não alteram o fluxo de importação.

Mais detalhes estão em [documentacao/google-planilhas-dashboard.md](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/google-planilhas-dashboard.md).

## 10. Publicar como Web App

1. clique em `Implantar > Nova implantação`
2. escolha `Aplicativo da Web`
3. em `Executar como`, use a conta da planilha
4. finalize a implantação
5. copie a URL do Web App

Observação importante:

- use a URL publicada que normalmente termina com `/exec`
- evite URL de teste `/dev`, URL do editor do Apps Script ou URL da planilha
- dica: abra a URL no navegador e confirme que ela responde um JSON simples (`{ ok: true, status: 'ready' }`)

## 11. Configurar a central no app

Em cada aparelho que vai enviar dados:

1. abra `Configurações`
2. vá para a seção `Central gerencial`
3. preencha `URL do Web App`
4. preencha `Token da central`
5. salve

## 12. Fazer o primeiro envio

No app:

1. abra a `Home`
2. toque em `Enviar para a central`

Ou:

1. abra `Sincronização`
2. use a seção `Central gerencial`
3. toque em `Enviar para a central`

Resultado esperado:

- o app mostra um resumo do envio
- a planilha recebe ou atualiza pedidos, itens, operadores, aparelhos e auditoria

## 13. Testar o fluxo real

Teste sugerido:

1. selecione `João` como operador
2. abra um pedido
3. adicione itens
4. feche a conta
5. marque como paga
6. envie para a central

Depois confira:

- `pedidos_fato`: o pedido deve ficar com `operador_responsavel_nome = João`
- `auditoria_eventos`: os eventos devem ficar com `actor_operator_name = João`
- `dashboard_operacao`: os cards e alertas devem refletir o novo pedido
- `dashboard_gerencial`: ranking e faturamento devem aparecer conforme o período filtrado

## 14. Rotina recomendada

### Início do turno

1. cada atendente assume seu aparelho

### Durante o dia

1. opera normalmente no app
2. envia para a central em momentos definidos

Exemplos:

- no meio do turno
- na troca de equipe
- no fechamento do dia

Quando a estrutura da planilha precisar ser refeita ou padronizada novamente:

1. use `Bar13 Central > Criar/atualizar dashboards`

Quando quiser recalcular apenas a aba de alertas:

1. execute `atualizarAlertasBar13` no Apps Script

## 15. Se der erro

Se o envio falhar:

1. confira a internet
2. confira a URL do Web App
3. confira o token
4. tente enviar novamente

O app guarda lotes locais pendentes para retry.

A tela `Sincronização` mostra:

- se a central está configurada
- quantos lotes estão pendentes
- o status do último lote

Na planilha, consulte também:

- `importacoes_log`

## 16. Checklist final

1. operadores cadastrados
2. operador atual definido em cada aparelho
3. sincronização entre aparelhos testada
4. Apps Script com os dois arquivos salvos
5. URL preenchida no app
6. token preenchido no app
7. primeiro envio concluído
8. ranking e auditoria aparecendo na planilha
9. dashboards operacionais e gerenciais criados
