# GranaXP — Sua grana. Seu jogo. Seu próximo nível. 🚀🎮

> **Plataforma gratuita e gamificada de organização financeira e guia de investimentos, feita especialmente para jovens e todos que querem transformar a gestão do dinheiro em conquista.**

---

## 📱 Guia Rápido: Como Usar, Baixar, Subir no GitHub e Publicar na Vercel

Este manual foi escrito em linguagem simples, pensando especialmente em quem usa um **celular Android** ou está dando os primeiros passos no desenvolvimento web.

---

### 1. O que é o GranaXP?
O **GranaXP** não é apenas uma planilha com gráficos chatos. É um aplicativo web interativo onde cuidar do seu dinheiro se torna um jogo com níveis (do **Iniciante** ao **Mestre da Grana**), ganho de experiência (XP), missões semanais, metas com progresso visual, simulador de rendimentos e um guia completo de **Investimentos Descomplicados** (com quiz para descobrir seu perfil).

---

### 3. Como Executar Localmente no Computador (Opcional)
Se você estiver no computador e quiser rodar antes de publicar:
1. Instale o [Node.js](https://nodejs.org) (versão 18 ou superior).
2. Abra a pasta do projeto no terminal:
   ```bash
   cd granaxp
   npm install
   ```
3. Inicie o servidor:
   ```bash
   npm run dev
   ```
4. Abra no navegador: `http://localhost:3000`.

---

### 4. Como Configurar as Variáveis de Ambiente
O projeto já inclui um arquivo de modelo chamado `.env.example`.
Basta criar um arquivo `.env` (ou configurar na Vercel) com:
```env
# Senha do painel administrativo (padrão solicitado)
ADMIN_PASSWORD="31181022"

# Chave secreta aleatória para proteger as sessões
SESSION_SECRET="uma_frase_longa_e_super_segura_aqui"

# Porta do servidor (padrão 3000)
PORT=3000

# (Opcional) URL de conexão PostgreSQL caso queira usar Neon ou Vercel Postgres
DATABASE_URL=""
```

---

### 5. Como Funciona o Banco de Dados
- **Modo Padrão (Sem Custo)**: O GranaXP possui um mecanismo inteligente de armazenamento em arquivo JSON persistente (`data/granaxp.json`) com gravação atômica e proteção contra falhas. Funciona de imediato sem que você precise criar contas em bancos externos!
- **Modo Nuvem (Opcional)**: Se for publicar na Vercel e quiser persistência multi-região ilimitada, você pode conectar o **Vercel Postgres** ou **Neon Database** (ambos com plano 100% gratuito) apenas adicionando a variável `DATABASE_URL` no painel da Vercel.

---

### 6. Como Subir os Arquivos no GitHub

#### Pelo Celular Android (Simples e Direto):
1. Abra o navegador do celular (Chrome), acesse [github.com](https://github.com) e faça login.
2. Toque nos três pontinhos do Chrome no canto superior direito e marque a opção **"Para computador"** (Versão Desktop).
3. Clique no botão verde **"New"** (ou sinal de `+` no topo) para criar um novo repositório.
4. Digite o nome: `granaxp`, marque **Public** (Público) e clique em **"Create repository"**.
5. Na tela seguinte, toque no link azul: **"uploading an existing file"** (enviar arquivos existentes).
6. Selecione a pasta descompactada ou os arquivos do projeto e clique em **"Commit changes"**.

#### Pelo Computador (via Git):
```bash
git init
git add .
git commit -m "feat: GranaXP completo pronto para GitHub e Vercel"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/granaxp.git
git push -u origin main
```

---

### 7. Como Conectar e Publicar na Vercel

1. Acesse [vercel.com](https://vercel.com) pelo celular ou computador e entre com a sua conta do GitHub.
2. Na tela inicial da Vercel, clique no botão **"Add New..."** e escolha **"Project"**.
3. A Vercel mostrará seus repositórios do GitHub. Clique no botão **"Import"** ao lado de `granaxp`.
4. Na tela de configuração:
   - **Framework Preset**: Deixe como `Vite` (a Vercel detecta automaticamente).
   - **Build Command**: `npm run build` (já configurado no `package.json`).
   - **Output Directory**: `dist` (padrão do Vite).
5. Clique na seção **"Environment Variables"** (Variáveis de Ambiente) e adicione:
   - Nome: `ADMIN_PASSWORD` | Valor: `31181022`
   - Nome: `SESSION_SECRET` | Valor: `coloque_uma_frase_segura_qualquer`
6. Clique no botão azul **"Deploy"**.
7. Aguarde cerca de 1 a 2 minutos. Pronto! A Vercel gerará um link público seguro (HTTPS) como `https://granaxp-seu-usuario.vercel.app` que você pode abrir e compartilhar com quem quiser!

---

### 8. Como Testar o Site Publicado
1. Abra o link gerado pela Vercel no celular ou computador.
2. Na página inicial, teste o **Simulador Financeiro Público** e o **Guia de Investimentos Descomplicados**.
3. Clique em **"Criar Conta"**:
   - Digite um nome de usuário (ex: `vinicius`) e uma senha.
   - O sistema criará a conta de verdade com hash de segurança no servidor e dará boas-vindas com XP!
4. Registre uma movimentação (ex: "Salário" ou "Lanche"), crie uma meta financeira e observe a barra de XP subir.
5. Role até o rodapé e clique na engrenagem discreta:
   - Digite a senha administrativa `31181022`.
   - Você verá o painel de estatísticas com números totais e ferramentas de gestão.

---

### 9. Recursos que Dependem de Configuração Externa (Checklist)
- **Hospedagem**: Vercel (100% gratuita no plano Hobby).
- **Repositório**: GitHub (100% gratuito).
- **Sem custos adicionais**: Não há cobranças, APIs pagas ou cartões de crédito exigidos.
- **Segurança**: Senhas criptografadas com salt via `bcryptjs`, rotas autenticadas por sessão, proteção contra tentativas repetidas e respeito total à LGPD com exclusão de conta em 1 clique.
