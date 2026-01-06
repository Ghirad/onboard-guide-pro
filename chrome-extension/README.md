# Tour Builder Capture - Chrome Extension

Uma extensão Chrome para capturar elementos de qualquer site e criar tours interativos no Tour Builder.

## Instalação (Modo Desenvolvedor)

1. Abra o Chrome e vá para `chrome://extensions/`
2. Ative o **Modo do desenvolvedor** (toggle no canto superior direito)
3. Clique em **Carregar sem compactação**
4. Selecione a pasta `chrome-extension/` deste projeto

## Como Usar

### Método 1: Via Extensão

1. Abra o Visual Builder no seu projeto
2. Abra o site que deseja criar o tour em outra aba
3. Clique no ícone da extensão (cursor com alvo)
4. Cole a URL do seu Builder (ex: `https://seu-projeto.lovable.app`)
5. Clique em **Iniciar Captura**
6. Passe o mouse sobre elementos e clique para capturar
7. O elemento será enviado automaticamente para o Builder

### Método 2: Via Script no Console

1. No Visual Builder, clique em **Capturar**
2. Abra o site alvo em nova aba
3. Copie o script do modal
4. Cole no DevTools (F12 → Console) e pressione Enter
5. Clique nos elementos para capturar

## Recursos

- **Captura com 1 clique**: Basta clicar no elemento desejado
- **Highlight visual**: Veja exatamente qual elemento está selecionado
- **Geração automática de seletores**: Gera seletores CSS otimizados (id, data-testid, path)
- **Scan de elementos**: Escaneia todos os elementos interativos da página
- **Comunicação em tempo real**: Elementos capturados aparecem instantaneamente no Builder

## Atalhos

- **ESC**: Sair do modo captura
- **Botão Scan**: Escanear todos os elementos interativos

## Desenvolvimento

A extensão usa Manifest V3 e é composta por:

- `manifest.json`: Configuração da extensão
- `popup/`: Interface do popup
- `content/`: Script injetado nas páginas
- `background/`: Service worker

## Segurança

- A extensão só ativa a captura quando você clica em "Iniciar"
- Dados são enviados apenas para a URL do Builder que você configurou
- Nenhum dado é coletado ou armazenado externamente
