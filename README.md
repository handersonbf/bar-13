# Bar13

Aplicativo mobile local-first para Android e iOS, feito com Expo + React Native + TypeScript + SQLite, para operação de balcão em bar sem backend e sem internet no uso diário.

## O que o app entrega

- importação de integrantes por CSV com atualização por nome
- importação de itens por CSV com atualização por `numero_item`
- controle de estoque por item com baixa imediata ao adicionar no pedido
- busca incremental de integrante por nome digitado
- itens em cards clicáveis para adicionar ao pedido
- fluxo completo de pedido com histórico de cancelamento preservado
- snapshot de nome, patente, item e preço no momento da venda
- histórico por data
- relatórios por período
- consolidado de vendas e devedores por período
- exportação de CSV com compartilhamento local
- QR Code fixo configurável por imagem local
- chave PIX textual configurável
- mensagem pronta de cobrança com cópia para a área de transferência
- comprovante obrigatório ao marcar pedido como `PAGO`

## Stack e decisões

- Expo SDK 54
- React Native
- TypeScript
- SQLite local com `expo-sqlite`
- navegação com `@react-navigation/native` + `native-stack` + `bottom-tabs`
- importação de arquivos com `expo-document-picker`
- seleção de imagem do QR com `expo-image-picker`
- exportação local e compartilhamento com `expo-file-system` + `expo-sharing`
- cópia da cobrança com `expo-clipboard`

Decisões principais:

- o banco SQLite é a fonte principal de verdade
- SQL fica centralizado em repositórios; telas não executam query direta
- relatórios e exportação consomem a mesma camada de serviço
- pedidos pagos ou fechados não podem mais ser editados
- pedidos abertos persistem e podem ser retomados pela Home
- pedidos pagos podem guardar comprovante local em imagem ou PDF
- cada integrante pode ter somente um pedido aberto por dia

## Estrutura de pastas

```text
.
├── App.tsx
├── app.json
├── samples
│   ├── integrantes_exemplo.csv
│   └── itens_exemplo.csv
└── src
    ├── components
    ├── constants
    ├── context
    ├── database
    ├── hooks
    ├── navigation
    ├── repositories
    ├── screens
    ├── services
    ├── types
    └── utils
```

## Como rodar no PC

### Requisitos

- Node.js 22+ recomendado
- npm 10+
- Expo Go ou emulador Android/iOS
- para build Android compartilhável: conta Expo gratuita e `EAS CLI`

### Instalação

```bash
npm install
```

O projeto já está pronto para Android com:

- package Android: `com.bar13.app`
- scripts de build EAS no [package.json](/Users/handersonfrota/Abutres/Projetos/bar-13/package.json)
- perfis de build em [eas.json](/Users/handersonfrota/Abutres/Projetos/bar-13/eas.json)

### Rodar no computador

1. Abra um terminal na pasta do projeto.
2. Instale as dependências com `npm install`.
3. Inicie o Metro bundler com:

```bash
npm run start
```

4. Para Android com emulador aberto:

```bash
npm run android
```

5. Para iOS no macOS com simulador aberto:

```bash
npm run ios
```

## Android: rodar, gerar APK e instalar

### Caminho mais simples para desenvolver no Android

1. Instale as dependências:

```bash
npm install
```

2. Rode o Metro bundler:

```bash
npm run start
```

3. Para abrir no Android:

- no celular com `Expo Go`, escaneie o QR
- no emulador Android aberto, rode:

```bash
npm run android
```

### Gerar APK para enviar ao atendente

Esse é o caminho recomendado para distribuição no Android.

1. Faça login na Expo:

```bash
npx eas login
```

2. Vincule o projeto à sua conta Expo na primeira vez:

```bash
npx eas init
```

Observação:

- esse comando pode pedir confirmação interativa
- depois disso a Expo grava o vínculo do projeto para os próximos builds

3. Gere o APK compartilhável:

```bash
npm run build:android:internal
```

4. Ao final, a Expo vai entregar um link de download do APK.
5. Envie esse link ou o arquivo APK para o atendente.
6. No Android dele, basta abrir o APK e instalar.

### Gerar APK localmente no seu PC

Se você preferir gerar o APK sem depender do build na nuvem da Expo:

```bash
npm run build:android:local
```

Observação:

- esse modo exige ambiente Android local mais completo
- o caminho via `build:android:internal` costuma ser o mais simples e estável

### Instalar diretamente no Android por USB

1. Instale Android Studio e o SDK Android.
2. Ative `Opções do desenvolvedor` e `Depuração USB` no celular.
3. Conecte o aparelho por cabo.
4. Confira se o Android foi reconhecido:

```bash
adb devices
```

5. Instale a build debug direto no aparelho:

```bash
npm run install:android:usb
```

Esse fluxo é ótimo para desenvolvimento, mas para entregar ao atendente o ideal continua sendo o APK gerado pelo EAS.

## Como instalar no celular para uso/teste

### Opção 1. Teste rápido com Expo Go

1. Instale o app `Expo Go` no celular.
2. Conecte o celular e o computador na mesma rede Wi‑Fi.
3. Na pasta do projeto, rode:

```bash
npm run start
```

4. O Expo vai mostrar um QR Code no terminal/navegador.
5. No Android, abra o `Expo Go` e escaneie o QR.
6. No iPhone, use a câmera para abrir o link do Expo.
7. O `Bar13` vai carregar no celular usando sua máquina como servidor local.

### Opção 2. Instalação local no Android por cabo USB

1. Instale o Android Studio e o SDK Android no PC.
2. Ative `Opções do desenvolvedor` e `Depuração USB` no celular Android.
3. Conecte o celular por USB.
4. Verifique se o aparelho aparece com:

```bash
adb devices
```

5. Gere e instale a build debug local com:

```bash
npm run install:android:usb
```

6. O app será compilado e instalado diretamente no celular Android conectado.

### Opção 3. Instalação local no iPhone via Xcode

1. Use um Mac com Xcode instalado.
2. Conecte o iPhone por cabo.
3. Confie no computador no iPhone.
4. Na pasta do projeto, rode:

```bash
npx expo run:ios --device
```

5. O Xcode vai compilar e instalar o app no iPhone selecionado.

## Validações

```bash
npm run typecheck
npm run lint
```

## Fluxo principal

1. Abra `Configurações` e, se desejar, configure `nome do bar`, `chave PIX`, `texto padrão` e a imagem fixa do QR.
2. Importe `integrantes` usando [samples/integrantes_exemplo.csv](/Users/handersonfrota/Abutres/Projetos/bar-13/samples/integrantes_exemplo.csv).
3. Importe `itens` usando [samples/itens_exemplo.csv](/Users/handersonfrota/Abutres/Projetos/bar-13/samples/itens_exemplo.csv).
4. Na Home, toque em `Novo pedido`.
5. Busque o integrante digitando o nome.
6. Adicione itens pelos cards. Cada toque já baixa 1 unidade do estoque.
7. Se remover item do pedido, o estoque retorna automaticamente.
8. Se remover o último item, o pedido fica salvo como cancelado.
9. Feche a conta.
10. Mostre o QR fixo e, ao marcar `PAGO`, selecione o comprovante em imagem ou PDF.
11. Consulte `Histórico`, `Relatórios`, `Pendentes` e `Exportação CSV`.

## Modelo de dados

### Integrante

- `id`
- `nome`
- `patente`
- `createdAt`
- `updatedAt`

### ItemBar

- `id`
- `numeroItem`
- `nome`
- `valor`
- `qtdEstoque`
- `ativo`
- `createdAt`
- `updatedAt`

### Pedido

- `id`
- `integranteId`
- `nomeIntegranteSnapshot`
- `patenteIntegranteSnapshot`
- `dataPedido`
- `horaPedido`
- `dataHoraPedido`
- `status`
- `total`
- `cancelado`
- `canceladoEm`
- `comprovanteUri`
- `comprovanteNome`
- `comprovanteMimeType`
- `comprovanteAdicionadoEm`

### PedidoItem

- `id`
- `pedidoId`
- `itemId`
- `numeroItemSnapshot`
- `nomeItemSnapshot`
- `valorUnitarioSnapshot`
- `quantidade`
- `subtotal`

### Configuração

- `id`
- `chavePix`
- `caminhoImagemQrCode`
- `nomeBar`
- `textoPadraoCobranca`

## Suposições adotadas

- o QR Code é uma imagem fixa escolhida na galeria e copiada para armazenamento local do app
- o comprovante do pagamento é anexado por arquivo local no momento em que o atendente marca o pedido como `PAGO`
- o CSV de itens usa `numero_item,nome,valor,qtdestoque`
- o estoque é baixado no momento em que o item entra no pedido e retorna ao estoque quando o item é removido ou o pedido é cancelado
- a data é armazenada em `YYYY-MM-DD` e a hora em `HH:mm:ss` para facilitar filtros e exportações
- CSVs usam vírgula como separador e cabeçalhos simples
- pedidos são criados como `ABERTO` no momento em que o integrante é selecionado
- existe no máximo um pedido aberto por integrante em cada dia
