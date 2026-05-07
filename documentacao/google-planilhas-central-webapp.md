# Central Gerencial com Google Sheets

Este fluxo adiciona uma central gerencial online sem quebrar o `Bar13` local-first:

1. o app continua operando offline e sincronizando aparelhos entre si
2. o atendente toca em `Enviar para a central`
3. o app envia um JSON para um `Google Apps Script Web App`
4. o script faz `upsert` nas abas da planilha
5. o chefe usa a planilha para ranking e auditoria

## O que esta central resolve

- ranking por atendente
- visão de quem foi o responsável pela venda
- auditoria de quem mexeu em cada pedido
- visão consolidada por aparelho e por operador

## Importante

- a planilha **não** devolve dados para o app
- o app continua sendo a fonte operacional
- a central é só uma camada gerencial de saída

## Pré-requisitos no app

Antes de enviar qualquer coisa:

1. cadastre os operadores em `Configurações > Operadores`
2. selecione quem está operando cada aparelho
3. abra `Configurações`
4. preencha:
   - `URL do Web App`
   - `Token da central`

## Arquivo do Apps Script

Use este arquivo:

- [documentacao/google-apps-script/bar13-central-webapp.gs](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/google-apps-script/bar13-central-webapp.gs)

## Como instalar

### 1. Criar a planilha

1. Abra o Google Planilhas.
2. Crie uma planilha nova.
3. Dê um nome como `Bar13 Central`.

### 2. Abrir o Apps Script

1. Na planilha, vá em `Extensões > Apps Script`.
2. Apague o conteúdo inicial de `Code.gs`.
3. Cole o conteúdo do arquivo [documentacao/google-apps-script/bar13-central-webapp.gs](/Users/handersonfrota/Abutres/Projetos/bar-13/documentacao/google-apps-script/bar13-central-webapp.gs).
4. Salve o projeto.

### 3. Definir o token esperado

No topo do script existe:

```javascript
expectedToken: 'TROCAR_ESTE_TOKEN',
```

Troque esse valor por um token forte que vocês vão repetir no app.

### 4. Preparar as abas

1. No Apps Script, rode a função `configurarCentralBar13`.
2. Autorize o projeto na primeira execução.

Abas criadas:

- `devices`
- `operadores`
- `pedidos_fato`
- `pedido_itens_fato`
- `auditoria_eventos`
- `importacoes_log`

### 5. Publicar como Web App

1. Clique em `Implantar > Nova implantação`.
2. Escolha `Aplicativo da Web`.
3. Em `Executar como`, use sua conta.
4. Em `Quem tem acesso`, escolha a opção compatível com o uso da equipe.
5. Conclua a implantação.
6. Copie a URL final do Web App.

Essa URL vai para `Configurações > Central gerencial` no app.

### 6. Configurar o app

No `Bar13`, abra `Configurações` e preencha:

- `URL do Web App`
- `Token da central`

Depois toque em `Salvar agora` ou saia do campo para salvar.

## Como o envio funciona

Quando o atendente toca em `Enviar para a central`, o app monta um lote com:

- aparelhos conhecidos
- operadores
- pedidos
- itens dos pedidos
- eventos de auditoria

O app envia isso por `fetch` como JSON. O Web App responde com um resumo do que foi atualizado.

## Fila local e internet

Se a internet falhar:

- o lote fica salvo localmente
- o status muda para erro ou pendente
- o próximo envio tenta reenviar os lotes pendentes

Isso mantém a experiência mais segura para o balcão.

## Chaves de upsert na planilha

As abas são atualizadas por estas chaves:

- `devices`: `device_id`
- `operadores`: `operador_sync_id`
- `pedidos_fato`: `pedido_sync_id`
- `pedido_itens_fato`: `pedido_item_sync_id`
- `auditoria_eventos`: `event_id`

Isso evita duplicidade quando o mesmo dado for reenviado.

## Reenvio manual e duplicidade

Se alguém tocar em `Enviar para a central` novamente logo após um envio concluído:

- os dados já existentes são atualizados nas mesmas linhas (upsert)
- não deve duplicar linhas em `devices`, `operadores`, `pedidos_fato`, `pedido_itens_fato` e `auditoria_eventos`
- a aba `importacoes_log` continua registrando uma nova linha por tentativa, porque ela é trilha de execução

## Como o chefe consulta

### Ranking

Use `pedidos_fato` para montar:

- total vendido por `operador_responsavel_nome`
- quantidade de pedidos por operador
- total por aparelho

### Auditoria

Use `auditoria_eventos` para ver:

- quem criou pedido
- quem adicionou item
- quem removeu item
- quem fechou conta
- quem marcou como pago
- quem cancelou
- quem trocou comprovante

## Fórmulas sugeridas

Ranking simples por valor vendido:

```gs
=QUERY(pedidos_fato!A:V;"select F,sum(R),count(A) where A is not null and N <> 'SIM' group by F label sum(R) 'Total vendido', count(A) 'Pedidos'";1)
```

Auditoria ordenada por horário:

```gs
=QUERY(auditoria_eventos!A:J;"select H,F,B,C,I where A is not null order by I desc";1)
```

## Rotina sugerida

1. o chefe cadastra operadores no aparelho mestre
2. os aparelhos sincronizam entre si
3. cada atendente assume seu aparelho
4. o atendimento acontece normalmente
5. em momentos definidos, alguém toca em `Enviar para a central`
6. o chefe acompanha ranking e auditoria na planilha

## Se der erro

Verifique nesta ordem:

1. a URL do Web App está correta no app
2. o token do app bate com `expectedToken` no script
3. a implantação do Web App está ativa
4. a planilha foi preparada com `configurarCentralBar13`
5. existe internet no momento do envio
6. a aba `importacoes_log` mostra o detalhe do último erro
