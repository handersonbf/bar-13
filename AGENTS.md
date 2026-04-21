# AGENTS.md

## Objetivo do projeto

Este repositório contém o app mobile `Bar13`, um aplicativo local-first para Android e iOS usado por atendentes para registrar pedidos de bar, exibir QR Code fixo para pagamento, marcar contas como pagas, manter histórico de vendas, gerar relatórios e exportar CSVs de vendas e devedores.

O app deve funcionar localmente no celular, sem backend e sem depender de internet no uso diário.

---

## Diretrizes técnicas obrigatórias

- Stack obrigatória:
  - Expo
  - React Native
  - TypeScript
  - SQLite local
- Persistência principal no SQLite.
- Preferir libs oficiais do ecossistema Expo.
- Não introduzir backend.
- Não introduzir Firebase, Supabase ou qualquer serviço online.
- Não converter o projeto em web app ou PWA.
- Não trocar a stack para Flutter ou nativo.

---

## Bibliotecas preferidas

Priorizar, quando aplicável:
- `expo-sqlite`
- `expo-document-picker`
- `expo-image-picker`
- `expo-file-system`
- `expo-sharing`
- `expo-clipboard`
- `expo-router` ou `@react-navigation/*` (escolher a opção mais simples e consistente)
- parser CSV simples e confiável

Evitar adicionar dependências pesadas sem necessidade clara.

---

## Regras de arquitetura

- Organizar por módulos e responsabilidades.
- Separar:
  - `screens`
  - `components`
  - `database`
  - `repositories`
  - `services`
  - `utils`
  - `types`
  - `hooks`
- Centralizar a lógica de persistência.
- Evitar SQL espalhado pelas telas.
- Usar snapshots em pedidos para preservar histórico de nome, patente e preço.
- Garantir que pedido pago não seja editável.
- Garantir que filtros e exportações usem a mesma base de consulta.

---

## Regras de negócio do app

### Integrantes
- Importados por CSV com `nome` e `patente`.
- Evitar duplicidade por nome.
- Reimportação deve atualizar registros.
- Deve haver busca incremental por nome digitado.

### Itens
- Importados por CSV com `numero_item`, `nome`, `valor`.
- Evitar duplicidade por `numero_item`.
- Reimportação deve atualizar registros.
- Exibir itens em cards clicáveis para facilitar o uso no balcão.

### Pedidos
- Sempre registrar automaticamente data e hora.
- Não permitir fechar pedido sem integrante.
- Não permitir fechar pedido sem itens.
- Permitir quantidades.
- Congelar preço e descrição no momento da venda.
- Status possíveis:
  - `ABERTO`
  - `FECHADO_AGUARDANDO_PAGAMENTO`
  - `PAGO`

### Pagamento
- O QR Code é uma imagem fixa cadastrada em Configurações.
- A chave PIX textual também deve ser exibida.
- O botão `PAGO` confirma manualmente o pagamento.

### Histórico
- Manter histórico persistido por data.
- Permitir consulta de vendas por dia e por período.

### Relatórios
Implementar:
- histórico de vendas por data
- vendas por período
- devedores por período
- relatório consolidado de vendas e devedores por período

### Exportações
Implementar exportação CSV para:
- vendas por período
- devedores por período
- consolidado por período

As exportações devem:
- respeitar filtros de data
- gerar arquivo local
- permitir compartilhamento
- usar nomes claros de arquivo

### Cobrança
Gerar mensagem pronta e copiável com:
- data do pedido
- chave PIX
- lista dos itens
- total formatado em BRL

---

## UX/UI

- Idioma: português-BR
- Moeda: Real brasileiro
- Tema: escuro
- Aparência: limpa, forte, rápida
- Uso principal: balcão/bar
- Priorização:
  1. poucos toques
  2. legibilidade
  3. velocidade operacional

### Regras específicas de interface
- Campo de busca para localizar integrante digitando o nome
- Lista deve filtrar dinamicamente
- Itens exibidos em cards
- Cards com número do item, nome e valor
- Ação clara para adicionar item
- Telas de relatório com filtros visíveis
- Botões claros de exportar CSV

---

## Padrões de código

- TypeScript com tipagem explícita
- Evitar `any`
- Criar tipos e interfaces de domínio
- Componentes pequenos e reutilizáveis
- Nomes claros em português ou inglês, mas manter consistência
- Funções curtas
- Boas mensagens de erro para importação, exportação e validação
- Formatar moeda e datas corretamente

---

## Persistência e banco

- Criar migrações ou rotina de bootstrap do SQLite
- Garantir criação idempotente de tabelas
- Isolar queries em camada própria
- Sempre testar persistência após reiniciar o app
- Não usar armazenamento volátil para dados de negócio

---

## Entregáveis esperados

Ao trabalhar neste projeto:
1. manter README atualizado
2. incluir CSVs de exemplo
3. documentar comandos de execução
4. documentar decisões importantes
5. validar typecheck/lint quando possível
6. preferir código executável a explicações longas
7. garantir que importação e exportação CSV funcionem

---

## Fluxo esperado do Codex

Quando receber uma tarefa:
1. entender a tela ou fluxo afetado
2. localizar arquivos relacionados
3. implementar com o mínimo de impacto colateral
4. rodar validações possíveis
5. corrigir erros encontrados
6. resumir claramente o que mudou

---

## Restrições importantes

- Não remover funcionalidades existentes sem necessidade.
- Não fazer refatoração ampla sem benefício claro.
- Não adicionar complexidade desnecessária.
- Não deixar TODOs vagos como entrega principal.
- Não responder apenas com plano; executar de fato.

---

## Prioridade máxima

Entregar um app funcional, estável, simples de operar, fácil de instalar/testar em Android e iOS, com histórico, relatórios e exportação CSV funcionando corretamente.