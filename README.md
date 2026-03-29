# ✂️ Gerenciador de Salão - Studio LmLu Matiello

Sistema completo de gestão para salões de beleza, focado em automatização de agendamentos, controlo financeiro imutável e conformidade com a LGPD.

## 🚀 Tecnologias

Este projeto foi construído com uma stack moderna focada em performance e segurança:

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
- **Base de Dados & ORM:** [Prisma](https://www.prisma.io/) com SQLite (DB Local)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/)
- **Segurança:** Autenticação baseada em JWT (Stateless para clientes e Stateful para equipa)
- **Integrações:** API do WhatsApp para notificações automáticas

## 🛠️ Funcionalidades Principais

### 👤 Área do Cliente

- **Agendamento Inteligente:** Seleção de serviço, profissional e horário com validação de disponibilidade em tempo real.
- **Histórico de Beleza:** Visualização de atendimentos passados e total investido.
- **Sistema de Avaliação (NPS):** Feedback detalhado após a conclusão dos serviços.
- **Privacidade LGPD:** Opção de anonimização total dos dados pessoais (mantendo dados fiscais anónimos).

### 👔 Portal do Profissional

- **Dashboard em Tempo Real:** Card dinâmico de "Próximo Atendimento" com integração ao WhatsApp.
- **Gestão de Comandas:** Fluxo de abertura e fechamento de serviços com cálculo automático de comissões.
- **Agenda Dinâmica:** Visualização clara de horários pendentes e concluídos.

### ⚙️ Painel Administrativo

- **Motor Financeiro:** Relatórios detalhados com Faturamento Bruto, Custos Operacionais e Lucro Líquido Real.
- **Gestão de Equipa:** Configuração individual de taxas de comissão e permissões de acesso.
- **Controlo de Estoque:** Gestão de insumos e produtos de revenda vinculados às comandas.

## 📊 Arquitetura de Dados (Prisma Schema)

O projeto utiliza um modelo relacional robusto para garantir a integridade dos dados:

- **Snapshot Financeiro:** Ao concluir um agendamento, o sistema congela valores de comissão e custos (`comissaoSnap`, `custoRevenda`, etc.) para garantir que relatórios históricos nunca mudem, mesmo que os preços actuais sejam alterados.
- **Anti-Double-Booking:** Índices compostos no banco de dados evitam choques de horários para o mesmo profissional.

## 📦 Como Instalar e Rodar

1.  **Clonar o repositório:**

    ```bash
    git clone https://github.com/arthurs357/gerenciador-salao.git
    cd gerenciador-salao
    ```

2.  **Instalar as dependências:**

    ```bash
    npm install
    ```

3.  **Configurar as variáveis de ambiente (`.env`):**

    ```env
    DATABASE_URL="file:./dev.db"
    JWT_SECRET="sua_chave_secreta"
    TEMPO_BUFFER_MINUTOS=5
    ```

4.  **Preparar a Base de Dados:**

    ```bash
    npx prisma migrate dev --name init
    ```

5.  **Iniciar o servidor de desenvolvimento:**
    ```bash
    npm run dev
    ```

## 📝 Licença

Este projeto é de uso restrito do **Studio LmLu Matiello**. Todos os direitos reservados.
