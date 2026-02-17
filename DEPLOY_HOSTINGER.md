# Guia de Deploy - Hostinger

## Requisitos do Servidor

- **Node.js 18+** (recomendado: Node.js 20)
- **PostgreSQL 14+**
- **npm** ou **yarn**
- Plano Hostinger com suporte a **Node.js** (VPS ou Cloud Hosting)

## 1. Preparar os Arquivos

### Clonar do GitHub

```bash
git clone https://github.com/renatovsantana/coroascanaa.git
cd coroascanaa
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
npx drizzle-kit push
```

Isso criará todas as tabelas necessárias.

## 6. Compilar o Projeto

**IMPORTANTE:** Use o script de build de produção (sem dependências do Replit):

```bash
node script/build-production.mjs
```

Isso gera:
- `dist/public/` — Frontend compilado
- `dist/index.cjs` — Backend compilado

## 7. Iniciar o Servidor

```bash
NODE_ENV=production node dist/index.cjs
```

Ou com PM2 (recomendado para produção):

```bash
npm install -g pm2
NODE_ENV=production pm2 start dist/index.cjs --name coroascanaa
pm2 save
pm2 startup
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

## Configuração Hostinger Node.js Hosting

Se estiver usando o **Node.js Hosting da Hostinger** (não VPS), configure:

- **Comando de build:** `node script/build-production.mjs`
- **Comando de start:** `NODE_ENV=production node dist/index.cjs`
- **Versão do Node:** 20.x
- **Diretório raiz:** `./`

## Comandos Úteis

| Comando | Descrição |
|---------|-----------|
| `npm install` | Instalar dependências |
| `npx drizzle-kit push` | Criar/atualizar tabelas do banco |
| `node script/build-production.mjs` | Compilar para produção |
| `NODE_ENV=production node dist/index.cjs` | Iniciar servidor em produção |

## Solução de Problemas

### Falha na construção (Build failed)
- Use `node script/build-production.mjs` em vez de `npm run build`
- O comando `npm run build` usa plugins do Replit que não existem na Hostinger
- Verifique se todas as dependências foram instaladas com `npm install`

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
- Execute `npx drizzle-kit push` para garantir que as tabelas estão atualizadas
- Verifique se o SESSION_SECRET está configurado

### Erro com bcrypt
- Se `bcrypt` falhar na instalação, instale as ferramentas de compilação:
  ```bash
  sudo apt-get install build-essential python3
  npm rebuild bcrypt
  ```
