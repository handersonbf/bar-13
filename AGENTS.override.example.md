# AGENTS.override.example.md

Este arquivo e apenas um modelo local. Copie para `AGENTS.override.md` se quiser personalizar seu ambiente de trabalho.

Nao coloque secrets, tokens, senhas, chaves privadas, certificados, dados de producao ou caminhos sensiveis aqui.

## Exemplo de override local

```md
# AGENTS.override.md

## Preferencias locais

- Perfil local preferido: `android-emulator`
- Plataforma preferida para validacao rapida: `android`
- Nivel de detalhe desejado nos resumos: `curto`

## Ambiente local

- Porta local reservada para ferramentas auxiliares: `54321`
- Emulador padrao: `Pixel_7_API_35`
- Pasta local de artefatos temporarios: `/tmp/bar13-codex`

## Comandos locais

- Check rapido: `./scripts/codex-check.sh`
- Lint com pouco ruido: `./scripts/ai-lint.sh`
- Typecheck com pouco ruido: `./scripts/ai-typecheck.sh`
- Abrir no Android: `npm run android`

## Observacoes pessoais

- Prefiro que o Codex evite builds EAS por padrao.
- Se houver diff grande em docs, revisar em blocos pequenos.
```
