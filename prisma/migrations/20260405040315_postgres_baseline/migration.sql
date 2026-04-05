-- CreateEnum
CREATE TYPE "RoleFuncionario" AS ENUM ('ADMIN', 'PROFISSIONAL', 'RECEPCIONISTA');

-- CreateEnum
CREATE TYPE "StatusDivida" AS ENUM ('PENDENTE', 'QUITADA', 'PARCIAL');

-- CreateEnum
CREATE TYPE "StatusPacoteVenda" AS ENUM ('PENDENTE', 'PAGO_ANTECIPADAMENTE');

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT,
    "cpf" TEXT,
    "senhaHash" TEXT,
    "anonimizado" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "dataNascimento" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Funcionario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "role" "RoleFuncionario" NOT NULL DEFAULT 'PROFISSIONAL',
    "comissao" DOUBLE PRECISION NOT NULL DEFAULT 40.0,
    "podeVerComissao" BOOLEAN NOT NULL DEFAULT true,
    "podeAgendar" BOOLEAN NOT NULL DEFAULT false,
    "podeVerHistorico" BOOLEAN NOT NULL DEFAULT false,
    "podeCancelar" BOOLEAN NOT NULL DEFAULT false,
    "podeGerenciarClientes" BOOLEAN NOT NULL DEFAULT false,
    "podeVerFinanceiroGlobal" BOOLEAN NOT NULL DEFAULT false,
    "podeGerenciarEstoque" BOOLEAN NOT NULL DEFAULT false,
    "cpf" TEXT,
    "telefone" TEXT,
    "descricao" TEXT,
    "especialidade" TEXT,
    "fotoUrl" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Funcionario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expediente" (
    "id" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFim" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Expediente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Servico" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "preco" DOUBLE PRECISION,
    "tempoMinutos" INTEGER,
    "imagemUrl" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "destaque" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsumoServico" (
    "id" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "quantidadeUsada" INTEGER NOT NULL,

    CONSTRAINT "InsumoServico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produto" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "precoCusto" DOUBLE PRECISION,
    "precoVenda" DOUBLE PRECISION NOT NULL,
    "estoque" INTEGER NOT NULL DEFAULT 0,
    "unidadeMedida" TEXT NOT NULL DEFAULT 'un',
    "tamanhoUnidade" INTEGER NOT NULL DEFAULT 1,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pacote" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "valorBase" DOUBLE PRECISION NOT NULL,
    "valorFinal" DOUBLE PRECISION NOT NULL,
    "desconto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pacote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PacoteServico" (
    "id" TEXT NOT NULL,
    "pacoteId" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PacoteServico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PacoteVenda" (
    "id" TEXT NOT NULL,
    "pacoteId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "valorCobrado" DOUBLE PRECISION NOT NULL,
    "status" "StatusPacoteVenda" NOT NULL DEFAULT 'PENDENTE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "PacoteVenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracaoSalao" (
    "id" TEXT NOT NULL DEFAULT 'config_global',
    "taxaCredito" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "taxaDebito" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "taxaPix" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracaoSalao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxaMetodoPagamento" (
    "id" TEXT NOT NULL,
    "metodo" TEXT NOT NULL,
    "bandeira" TEXT NOT NULL DEFAULT '',
    "descricao" TEXT,
    "taxaBase" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxaMetodoPagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agendamento" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "dataHoraInicio" TIMESTAMP(3) NOT NULL,
    "dataHoraFim" TIMESTAMP(3) NOT NULL,
    "valorBruto" DOUBLE PRECISION NOT NULL,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "canceladoEm" TIMESTAMP(3),
    "taxas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "custoInsumos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "custoRevenda" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorComissao" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "comissaoSnap" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "comissaoLiberada" BOOLEAN NOT NULL DEFAULT false,
    "valorPago" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorPendente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lembreteEnviado" BOOLEAN NOT NULL DEFAULT false,
    "valorDinheiro" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorCartao" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorPix" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metodoPagamento" TEXT,

    CONSTRAINT "Agendamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagamentoComanda" (
    "id" TEXT NOT NULL,
    "agendamentoId" TEXT NOT NULL,
    "metodo" TEXT NOT NULL,
    "bandeira" TEXT NOT NULL DEFAULT '',
    "valor" DOUBLE PRECISION NOT NULL,
    "parcelas" INTEGER NOT NULL DEFAULT 1,
    "taxaAplicada" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxaMetodoId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PagamentoComanda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DividaCliente" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "agendamentoId" TEXT,
    "valorOriginal" DOUBLE PRECISION NOT NULL,
    "valorQuitado" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "StatusDivida" NOT NULL DEFAULT 'PENDENTE',
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quitadoEm" TIMESTAMP(3),

    CONSTRAINT "DividaCliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemServico" (
    "id" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "agendamentoId" TEXT NOT NULL,
    "precoCobrado" DOUBLE PRECISION,

    CONSTRAINT "ItemServico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemProduto" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "agendamentoId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "precoCobrado" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ItemProduto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPortfolio" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "valor" DOUBLE PRECISION,
    "imagensJson" JSONB NOT NULL,
    "linkInstagram" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemPortfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacao" (
    "id" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Avaliacao" (
    "id" TEXT NOT NULL,
    "agendamentoId" TEXT NOT NULL,
    "nota" INTEGER NOT NULL,
    "comentario" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Avaliacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limits" (
    "identificador" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockedUntil" TIMESTAMP(3),

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("identificador")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT NOT NULL,
    "detalhes" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_FuncionarioToServico" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_FuncionarioToServico_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_telefone_key" ON "Cliente"("telefone");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_cpf_key" ON "Cliente"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Funcionario_email_key" ON "Funcionario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Funcionario_cpf_key" ON "Funcionario"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Expediente_funcionarioId_diaSemana_key" ON "Expediente"("funcionarioId", "diaSemana");

-- CreateIndex
CREATE UNIQUE INDEX "InsumoServico_servicoId_produtoId_key" ON "InsumoServico"("servicoId", "produtoId");

-- CreateIndex
CREATE UNIQUE INDEX "PacoteServico_pacoteId_servicoId_key" ON "PacoteServico"("pacoteId", "servicoId");

-- CreateIndex
CREATE INDEX "PacoteVenda_clienteId_status_idx" ON "PacoteVenda"("clienteId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TaxaMetodoPagamento_metodo_bandeira_key" ON "TaxaMetodoPagamento"("metodo", "bandeira");

-- CreateIndex
CREATE INDEX "Agendamento_funcionarioId_dataHoraInicio_dataHoraFim_idx" ON "Agendamento"("funcionarioId", "dataHoraInicio", "dataHoraFim");

-- CreateIndex
CREATE INDEX "Agendamento_concluido_dataHoraInicio_idx" ON "Agendamento"("concluido", "dataHoraInicio");

-- CreateIndex
CREATE INDEX "Agendamento_clienteId_valorPendente_idx" ON "Agendamento"("clienteId", "valorPendente");

-- CreateIndex
CREATE INDEX "PagamentoComanda_agendamentoId_idx" ON "PagamentoComanda"("agendamentoId");

-- CreateIndex
CREATE UNIQUE INDEX "DividaCliente_agendamentoId_key" ON "DividaCliente"("agendamentoId");

-- CreateIndex
CREATE INDEX "DividaCliente_clienteId_status_idx" ON "DividaCliente"("clienteId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Avaliacao_agendamentoId_key" ON "Avaliacao"("agendamentoId");

-- CreateIndex
CREATE INDEX "AuditLog_entidade_entidadeId_idx" ON "AuditLog"("entidade", "entidadeId");

-- CreateIndex
CREATE INDEX "AuditLog_usuarioId_idx" ON "AuditLog"("usuarioId");

-- CreateIndex
CREATE INDEX "_FuncionarioToServico_B_index" ON "_FuncionarioToServico"("B");

-- AddForeignKey
ALTER TABLE "Expediente" ADD CONSTRAINT "Expediente_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsumoServico" ADD CONSTRAINT "InsumoServico_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsumoServico" ADD CONSTRAINT "InsumoServico_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PacoteServico" ADD CONSTRAINT "PacoteServico_pacoteId_fkey" FOREIGN KEY ("pacoteId") REFERENCES "Pacote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PacoteServico" ADD CONSTRAINT "PacoteServico_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PacoteVenda" ADD CONSTRAINT "PacoteVenda_pacoteId_fkey" FOREIGN KEY ("pacoteId") REFERENCES "Pacote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PacoteVenda" ADD CONSTRAINT "PacoteVenda_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagamentoComanda" ADD CONSTRAINT "PagamentoComanda_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagamentoComanda" ADD CONSTRAINT "PagamentoComanda_taxaMetodoId_fkey" FOREIGN KEY ("taxaMetodoId") REFERENCES "TaxaMetodoPagamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DividaCliente" ADD CONSTRAINT "DividaCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DividaCliente" ADD CONSTRAINT "DividaCliente_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemServico" ADD CONSTRAINT "ItemServico_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemServico" ADD CONSTRAINT "ItemServico_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemProduto" ADD CONSTRAINT "ItemProduto_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemProduto" ADD CONSTRAINT "ItemProduto_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FuncionarioToServico" ADD CONSTRAINT "_FuncionarioToServico_A_fkey" FOREIGN KEY ("A") REFERENCES "Funcionario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FuncionarioToServico" ADD CONSTRAINT "_FuncionarioToServico_B_fkey" FOREIGN KEY ("B") REFERENCES "Servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
