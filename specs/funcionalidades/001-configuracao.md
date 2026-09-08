# 001 — Configuração e manutenção

**Estado:** implementado. **Ator:** pessoa usando o aparelho. **Precondição:** banco inicializado. Não exige operador selecionado.

## Requisitos

| ID | Comportamento |
| --- | --- |
| CFG-001 | Manter uma configuração principal, `id = 1`, com nome do bar, nome do aparelho, chave PIX e modelo de cobrança |
| CFG-002 | Salvar os campos ao perder foco e pelo botão “Salvar agora”; exibir estado de salvamento e aviso temporário de 2,4 segundos |
| CFG-003 | Remover espaços externos ao salvar; nome de bar vazio vira `Bar13`, nome de aparelho vazio vira `Caixa`; chave e texto podem ficar vazios |
| CFG-004 | Persistir URL do Web App e token da central localmente; sua ausência não bloqueia o atendimento |
| CFG-005 | Exibir operador atual e atalhos para guia, sincronização, cadastros, importações e exportação |
| CFG-006 | Manter `device_id` gerado no bootstrap e sequência de sincronização local, sem edição desses campos pela tela |
| CFG-007 | Oferecer reset por confirmação explícita na interface, apagando dados operacionais e arquivos do diretório do app |

## Fluxos e dados

Ao focar a tela, carregar a configuração. Alterações no formulário são mantidas em estado React. `onBlur` persiste o conjunto de campos, exceto quando já existe salvamento em curso. O botão manual fica desabilitado enquanto salva. Falha gera alerta.

O modelo de cobrança inicial é inserido pelo schema; suas variáveis estão em [pagamentos](004-pagamentos.md). Não existe validação de formato da chave PIX, URL ou obrigatoriedade de variáveis no texto durante salvamento. A configuração atual não oferece seleção de imagem fixa para QR.

O reset executa `resetDatabase()` e `clearAppDirectory()` em paralelo. Remove integrantes, itens, operadores, pedidos, linhas, eventos, importações, aparelhos conhecidos, blobs e lotes da central; limpa PIX, referência legada de QR, operador selecionado, central e datas de sincronização; restaura nome do bar e texto inicial. **Preserva `device_id`, `sync_sequence` e nome não vazio do aparelho.** Não reinicia os contadores autoincrementais do SQLite. Banco e arquivos não são uma operação atômica.

## Aceitação

- **AC-CFG-01 — Persistência:** Dado o formulário com nome do bar alterado, quando salvar e abrir novamente a tela, então o nome salvo é carregado do SQLite.
- **AC-CFG-02 — Padrões:** Dado nome do bar e aparelho vazios, quando salvar, então persistir `Bar13` e `Caixa`.
- **AC-CFG-03 — Central opcional:** Dada configuração sem URL/token, quando operar um pedido com operador válido, então a central não é precondição do atendimento.
- **AC-CFG-04 — Reset cancelado:** Dada a confirmação de reset, quando escolher cancelar, então não executar a limpeza.
- **AC-CFG-05 — Reset confirmado:** Dada uma base descartável com registros e arquivos, quando confirmar reset, então limpar os conjuntos descritos, preservando identidade, sequência e nome do aparelho. Verificar separadamente banco e arquivos.

## Fontes

[Tela](../../src/screens/ConfiguracoesScreen.tsx), [repositório](../../src/repositories/configuracaoRepository.ts), [reset](../../src/database/connection.ts), [arquivos](../../src/utils/file.ts), [identidade](../../src/repositories/syncEventsRepository.ts).
