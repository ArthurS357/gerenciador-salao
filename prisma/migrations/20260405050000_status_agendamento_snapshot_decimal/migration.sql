-- ============================================================
-- MIGRAÇÃO: StatusAgendamento + Snapshot Financeiro (Decimal)
-- Resolve drift entre baseline e schema.prisma alvo.
-- Script idempotente: seguro para re-execução em banco parcialmente migrado.
-- ============================================================

-- FASE 1: Criação do Enum de Domínio (idempotente)
DO $$ BEGIN
    CREATE TYPE "StatusAgendamento" AS ENUM (
        'AGENDADO',
        'CONFIRMADO',
        'EM_ATENDIMENTO',
        'FINALIZADO',
        'CANCELADO'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- FASE 2: Adição da coluna status com DEFAULT seguro ('AGENDADO') — idempotente
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Agendamento' AND column_name = 'status'
    ) THEN
        ALTER TABLE "Agendamento"
            ADD COLUMN "status" "StatusAgendamento" NOT NULL DEFAULT 'AGENDADO';
    END IF;
END $$;

-- FASE 3: Migração Atômica de Dados — Máquina de Estados (CASE WHEN blindado, idempotente)
-- Só executa se os campos legados ainda existirem (guarda contra re-execução).
-- Cancelamento tem precedência explícita sobre conclusão: guarda contra dirty data.
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Agendamento' AND column_name = 'concluido'
    ) THEN
        UPDATE "Agendamento"
        SET "status" = CASE
            WHEN "canceladoEm" IS NOT NULL THEN 'CANCELADO'::"StatusAgendamento"
            WHEN "concluido" = true         THEN 'FINALIZADO'::"StatusAgendamento"
            ELSE                                 'AGENDADO'::"StatusAgendamento"
        END;
    END IF;
END $$;

-- FASE 4: Conversão do Snapshot Financeiro Imutável — DOUBLE PRECISION → DECIMAL (idempotente)
-- Os campos do snapshot NÃO são removidos; são apenas migrados para tipo exato.
-- A conversão só ocorre se a coluna ainda for DOUBLE PRECISION (float8).
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Agendamento' AND column_name = 'valorBruto'
          AND data_type = 'double precision'
    ) THEN
        ALTER TABLE "Agendamento"
            ALTER COLUMN "valorBruto"    TYPE DECIMAL(10,2) USING "valorBruto"::numeric,
            ALTER COLUMN "taxas"         TYPE DECIMAL(10,2) USING "taxas"::numeric,
            ALTER COLUMN "custoInsumos"  TYPE DECIMAL(10,2) USING "custoInsumos"::numeric,
            ALTER COLUMN "custoRevenda"  TYPE DECIMAL(10,2) USING "custoRevenda"::numeric,
            ALTER COLUMN "valorComissao" TYPE DECIMAL(10,2) USING "valorComissao"::numeric,
            ALTER COLUMN "comissaoSnap"  TYPE DECIMAL(5,2)  USING "comissaoSnap"::numeric,
            ALTER COLUMN "valorPago"     TYPE DECIMAL(10,2) USING "valorPago"::numeric,
            ALTER COLUMN "valorPendente" TYPE DECIMAL(10,2) USING "valorPendente"::numeric;
    END IF;
END $$;

-- FASE 5: Expurgo do Débito Técnico da Tabela Agendamento (idempotente)
-- 5a. Remove index obsoleto antes de dropar colunas referenciadas
DROP INDEX IF EXISTS "Agendamento_concluido_dataHoraInicio_idx";

-- 5b. Recria index de performance com a nova coluna de status (idempotente)
CREATE INDEX IF NOT EXISTS "Agendamento_status_dataHoraInicio_idx"
    ON "Agendamento"("status", "dataHoraInicio");

-- 5c. Remove colunas legadas (idempotente via IF EXISTS)
ALTER TABLE "Agendamento"
    DROP COLUMN IF EXISTS "concluido",
    DROP COLUMN IF EXISTS "canceladoEm",
    DROP COLUMN IF EXISTS "valorDinheiro",
    DROP COLUMN IF EXISTS "valorCartao",
    DROP COLUMN IF EXISTS "valorPix",
    DROP COLUMN IF EXISTS "metodoPagamento";

-- FASE 6: Conversão de Tipos nas demais tabelas — DOUBLE PRECISION → DECIMAL (idempotente)

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Funcionario' AND column_name = 'comissao' AND data_type = 'double precision') THEN
        ALTER TABLE "Funcionario" ALTER COLUMN "comissao" TYPE DECIMAL(5,2) USING "comissao"::numeric;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TaxaMetodoPagamento' AND column_name = 'taxaBase' AND data_type = 'double precision') THEN
        ALTER TABLE "TaxaMetodoPagamento" ALTER COLUMN "taxaBase" TYPE DECIMAL(5,2) USING "taxaBase"::numeric;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Servico' AND column_name = 'preco' AND data_type = 'double precision') THEN
        ALTER TABLE "Servico" ALTER COLUMN "preco" TYPE DECIMAL(10,2) USING "preco"::numeric;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Produto' AND column_name = 'precoVenda' AND data_type = 'double precision') THEN
        ALTER TABLE "Produto"
            ALTER COLUMN "precoCusto"  TYPE DECIMAL(10,2) USING "precoCusto"::numeric,
            ALTER COLUMN "precoVenda"  TYPE DECIMAL(10,2) USING "precoVenda"::numeric;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Pacote' AND column_name = 'valorBase' AND data_type = 'double precision') THEN
        ALTER TABLE "Pacote"
            ALTER COLUMN "valorBase"  TYPE DECIMAL(10,2) USING "valorBase"::numeric,
            ALTER COLUMN "valorFinal" TYPE DECIMAL(10,2) USING "valorFinal"::numeric,
            ALTER COLUMN "desconto"   TYPE DECIMAL(10,2) USING "desconto"::numeric;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'PacoteVenda' AND column_name = 'valorCobrado' AND data_type = 'double precision') THEN
        ALTER TABLE "PacoteVenda" ALTER COLUMN "valorCobrado" TYPE DECIMAL(10,2) USING "valorCobrado"::numeric;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'PagamentoComanda' AND column_name = 'valor' AND data_type = 'double precision') THEN
        ALTER TABLE "PagamentoComanda"
            ALTER COLUMN "valor"        TYPE DECIMAL(10,2) USING "valor"::numeric,
            ALTER COLUMN "taxaAplicada" TYPE DECIMAL(5,2)  USING "taxaAplicada"::numeric;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'DividaCliente' AND column_name = 'valorOriginal' AND data_type = 'double precision') THEN
        ALTER TABLE "DividaCliente"
            ALTER COLUMN "valorOriginal" TYPE DECIMAL(10,2) USING "valorOriginal"::numeric,
            ALTER COLUMN "valorQuitado"  TYPE DECIMAL(10,2) USING "valorQuitado"::numeric;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ItemServico' AND column_name = 'precoCobrado' AND data_type = 'double precision') THEN
        ALTER TABLE "ItemServico" ALTER COLUMN "precoCobrado" TYPE DECIMAL(10,2) USING "precoCobrado"::numeric;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ItemProduto' AND column_name = 'precoCobrado' AND data_type = 'double precision') THEN
        ALTER TABLE "ItemProduto" ALTER COLUMN "precoCobrado" TYPE DECIMAL(10,2) USING "precoCobrado"::numeric;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ItemPortfolio' AND column_name = 'valor' AND data_type = 'double precision') THEN
        ALTER TABLE "ItemPortfolio" ALTER COLUMN "valor" TYPE DECIMAL(10,2) USING "valor"::numeric;
    END IF;
END $$;

-- FASE 7: Expurgo da Tabela Legada de Configuração
-- ConfiguracaoSalao foi removida do schema.prisma (substituída por TaxaMetodoPagamento).
-- O DROP elimina o drift entre o banco (que a tem pela baseline) e o schema atual.
DROP TABLE IF EXISTS "ConfiguracaoSalao";
