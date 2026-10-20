# Diretrizes para Agentes (`AGENTS.md`)

Este documento define as convenções de arquitetura, estilo, interface e fluxo de trabalho do projeto **Dudu já tomou seus remédios?**.

## Arquitetura e Código

- **Zero bundlers no web app**: O aplicativo funciona diretamente com `index.html`, `styles.css` e `main.js` (`<script type="module">`), mantendo a base simples, enxuta e sem dependências externas desnecessárias no frontend.
- **JavaScript moderno**: Escreva código sucinto, simples e moderno (ES2026+), aproveitando recursos nativos da linguagem e da Web API.
- **Compatibilidade dupla (PWA + Tauri 2)**: Garanta que os recursos funcionem tanto no navegador/PWA quanto no WebView Android empacotado pelo Tauri (`src-tauri/`).
- **Persistência e Backup**: Qualquer nova chave persistida no `store` (`localStorage` / `window.storage`) que faça parte dos dados do usuário deve ser incluída na expressão regular `CHAVE_DADO` e na lista de chaves de `coletarDados()` em `main.js`.

## Estilo de Escrita e Formatação

- **Pontuação em textos e comentários**: Nunca utilize travessões longos (emdashes) e evite usar ponto e vírgula, quando não for necessário, ao escrever documentação e comentários.
- **Prettier obrigatório**: Sempre formate os arquivos modificados com `npx prettier --write` (ou `npx --offline prettier --write` em ambientes isolados sem rede) antes de criar um commit.
- **Validação e empacotamento**: Após alterar arquivos da web (`index.html`, `styles.css`, `main.js`, `sw.js`, `manifest.json` ou `img/`), execute `npm run web` para atualizar a pasta `dist/` e verifique a sintaxe com `node --check main.js`.

## Interface, Design e Acessibilidade

- **Identidade visual**: Preserve a estética acolhedora e carinhosa da Bubu e do shiba, com bordas marcadas (`var(--marrom)`), sombras sólidas (`var(--sombra)`), cantos arredondados e suporte completo aos temas claro e escuro (`html[data-tema="escuro"]`).
- **Animações fluidas**: Priorize animações leves com física elástica (`var(--mola)`) e garanta que animações contínuas ou de movimento respeitem `@media (prefers-reduced-motion: reduce)`.
- **Áreas seguras e acessibilidade**: Respeite as margens seguras da tela (`env(safe-area-inset-*)`) em elementos fixos ou de página inteira e mantenha atributos semânticos e de acessibilidade (`aria-*`, navegação por teclado e foco visível).

## Versionamento, Commits e Issues

- **Commits atômicos**: Siga a convenção do repositório em português (`feat:`, `fix:`, `refactor:`, `docs:`, `ci:`), separando cada mudança de forma clara e compreensível.
- **Sincronização de versão e cache**: Ao atualizar a versão do aplicativo ou alterar arquivos estáticos, mantenha a mesma versão em `package.json`, `src-tauri/Cargo.toml` e `src-tauri/tauri.conf.json`, e incremente a constante `CACHE` em `sw.js` para garantir a atualização offline da PWA.
- **Issue #1**: A issue #1 do repositório é uma declaração especial e nunca deve ser fechada ou tratada como tarefa técnica.
