# Guia de Deploy - Hostinger

## Requisitos do Servidor

- **Node.js 18+** (recomendado: Node.js 20)
- **PostgreSQL 14+**
- **npm** ou **yarn**
- Plano Hostinger com suporte a **Node.js** (VPS ou Cloud Hosting)

## 1. Preparar os Arquivos

### Baixar o código do Replit

No Replit, clique nos três pontos (⋯) no menu de arquivos e selecione "Download as zip".

Extraia o arquivo ZIP no seu computador.

### Ou use Git (opcional)

```bash
git clone <URL_DO_REPOSITÓRIO>
cd <PASTA_DO_PROJETO>
```

## 2. Configurar o Banco de Dados

### No painel da Hostinger:

1. Acesse **Databases** → **PostgreSQL**
2. Crie um novo banco de dados
3. Anote os dados de conexão:
   - Host
   - Porta
   - Nome do banco
   - Usuário
   - Senha

### URL de conexão:

```
postgresql://USUARIO:SENHA@HOST:PORTA/NOME_DO_BANCO
```

## 3. Variáveis de Ambiente

Configure as seguintes variáveis no painel da Hostinger (ou no arquivo `.env`):

```env
DATABASE_URL=postgresql://USUARIO:SENHA@HOST:PORTA/NOME_DO_BANCO
SESSION_SECRET=gere-uma-string-aleatoria-longa-aqui
NODE_ENV=production
PORT=3000
```

### Gerar SESSION_SECRET:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 4. Instalar Dependências

```bash
npm install
```

## 5. Configurar o Banco de Dados

```bash
npm run db:push
```

Isso criará todas as tabelas necessárias.

## 6. Compilar o Projeto

```bash
npm run build
```

Isso gera:
- `dist/public/` — Frontend compilado
- `dist/index.cjs` — Backend compilado

## 7. Iniciar o Servidor

```bash
npm start
```

Ou para rodar em background:

```bash
node dist/index.cjs
```

## 8. Login Inicial

Na primeira execução, o sistema cria automaticamente um usuário administrador:

- **Usuário:** `admin`
- **Senha:** `admin123`

**IMPORTANTE:** Altere a senha do admin após o primeiro login!

## 9. Configurar Domínio (Hostinger)

1. No painel Hostinger, configure o domínio apontando para a aplicação Node.js
2. Configure o proxy reverso para redirecionar da porta 80/443 para a porta definida em PORT
3. Ative o certificado SSL (HTTPS)

## 10. Upload de Imagens

As imagens são salvas localmente na pasta `uploads/` na raiz do projeto.

**IMPORTANTE:** Configure o Hostinger para manter essa pasta persistente entre deploys.

## Estrutura de Pastas Após Build

```
projeto/
├── dist/
│   ├── public/          # Frontend compilado
│   └── index.cjs        # Backend compilado
├── uploads/             # Imagens enviadas
├── node_modules/        # Dependências
├── package.json
└── .env                 # Variáveis de ambiente
```

## Comandos Úteis

| Comando | Descrição |
|---------|-----------|
| `npm install` | Instalar dependências |
| `npm run db:push` | Criar/atualizar tabelas do banco |
| `npm run build` | Compilar para produção |
| `npm start` | Iniciar servidor em produção |
| `npm run dev` | Iniciar em modo desenvolvimento |

## Solução de Problemas

### Erro de conexão com banco de dados
- Verifique se o DATABASE_URL está correto
- Verifique se o PostgreSQL está rodando
- Verifique se o firewall permite conexão na porta do banco

### Erro 502 Bad Gateway
- Verifique se o servidor Node.js está rodando
- Verifique os logs: `node dist/index.cjs`
- Verifique se a porta está correta

### Imagens não aparecem
- Verifique se a pasta `uploads/` existe e tem permissão de escrita
- Verifique se o caminho `/uploads` está acessível no servidor

### Login não funciona
- Execute `npm run db:push` para garantir que as tabelas estão atualizadas
- Verifique se o SESSION_SECRET está configurado
