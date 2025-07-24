# Guia de Deploy: Do Seu Computador para a Internet com GitHub e Vercel

Este guia é um passo a passo para publicar seu projeto, garantindo que o processo seja simples e sem erros.

---

### **Parte 1: Preparando o Projeto no Seu Computador (Git Local)**

O primeiro passo é "oficializar" a pasta do seu projeto como um repositório Git, que é um sistema de controle de versão.

1.  **Abra o Terminal na Pasta do Projeto:**
    *   Navegue até a pasta do seu projeto no Windows.
    *   Clique com o botão direito do mouse em um espaço vazio e selecione "Abrir no Terminal" ou "Git Bash Here".

2.  **Inicie o Git e Faça o Primeiro "Commit" (Salvamento):**
    *   Execute os comandos abaixo, um de cada vez. Eles preparam seu código para ser enviado ao GitHub.

    ```bash
    # Inicia o controle de versão na pasta
    git init

    # Adiciona todos os arquivos do projeto para o primeiro "pacote" de salvamento
    git add .

    # Cria o pacote de salvamento inicial com uma mensagem
    git commit -m "Initial commit"
    ```

---

### **Parte 2: Enviando o Código para o GitHub**

Agora, vamos criar um "lar" para o seu código na nuvem (GitHub) e enviar o que preparamos.

1.  **Crie um Novo Repositório no GitHub:**
    *   Acesse: [https://github.com/new](https://github.com/new)
    *   **Repository name:** Dê um nome, por exemplo, `agenda-fixa-app`.
    *   **Description (Optional):** Adicione uma breve descrição.
    *   **Public/Private:** Selecione **Public**.
    *   **IMPORTANTE:** **NÃO** marque nenhuma das caixas: "Add a README file", "Add .gitignore", ou "Choose a license". Seu projeto já tem esses arquivos.
    *   Clique em **"Create repository"**.

2.  **Conecte e Envie seu Código:**
    *   Na próxima página, o GitHub mostrará alguns comandos. Vamos usar os da seção **"...or push an existing repository from the command line"**.
    *   Copie e cole os comandos no seu terminal, um por um. **Lembre-se de substituir `SUA_URL_AQUI.git` pela URL que o GitHub te deu.**

    ```bash
    # Define o nome principal do seu projeto (geralmente 'main')
    git branch -M main

    # Conecta sua pasta local ao repositório que você criou no GitHub
    git remote add origin SUA_URL_AQUI.git

    # Envia seus arquivos para o GitHub
    git push -u origin main
    ```
    *   Após o último comando, atualize a página do seu repositório no GitHub. Seus arquivos estarão lá!

---

### **Parte 3: Publicando o Site com a Vercel**

Finalmente, vamos conectar o GitHub à Vercel para que seu site fique online.

1.  **Acesse a Vercel e Crie um Novo Projeto:**
    *   Faça login no seu painel da Vercel.
    *   Clique em **"Add New..."** e depois em **"Project"**.

2.  **Importe seu Repositório do GitHub:**
    *   A Vercel mostrará uma lista dos seus repositórios. Encontre o que você acabou de criar (`agenda-fixa-app`) e clique em **"Import"**.

3.  **Configure o Projeto:**
    *   A Vercel é inteligente e deve detectar a maioria das configurações. Apenas confirme se estão assim:
        *   **Framework Preset:** Vite
        *   **Build Command:** `npm run build`
        *   **Output Directory:** `dist`
        *   **Install Command:** `npm install`

4.  **Adicione as Variáveis de Ambiente (MUITO IMPORTANTE):**
    *   Esta é a etapa que conecta seu site ao banco de dados e outros serviços.
    *   Na mesma tela de configuração, expanda a seção **"Environment Variables"**.
    *   Adicione as seguintes variáveis, uma por uma, com os valores do seu projeto Supabase e outros serviços:
        *   `VITE_SUPABASE_URL`: A URL do seu projeto Supabase.
        *   `VITE_SUPABASE_ANON_KEY`: A chave `anon` (public) do seu projeto Supabase.
        *   `WHATSAPP_API_TOKEN`: Seu token da API do WhatsApp.
        *   `WHATSAPP_PHONE_NUMBER_ID`: O ID do número de telefone do WhatsApp.
        *   `CRON_SECRET_TOKEN`: Um token secreto que você cria para proteger as tarefas agendadas.
        *   `APP_URL`: A URL final do seu site na Vercel (você pode adicionar/editar isso depois do primeiro deploy).

5.  **Faça o Deploy:**
    *   Clique no botão **"Deploy"**.
    *   A Vercel vai construir seu projeto. Em poucos minutos, você verá os parabéns e o link para o seu site funcionando!

---

### **Para Atualizações Futuras**

A melhor parte é que, a partir de agora, o processo é muito mais simples. Toda vez que eu fizer uma alteração no seu código local:

1.  Abra o terminal na pasta do projeto.
2.  Execute os seguintes comandos:
    ```bash
    git add .
    git commit -m "Descreva a mudança aqui (ex: Adicionada página de clientes)"
    git push
    ```
A Vercel detectará o `push` automaticamente e atualizará seu site.