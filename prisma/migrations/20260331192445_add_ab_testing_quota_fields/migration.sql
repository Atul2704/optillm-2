-- AlterTable
ALTER TABLE "Prompt" ADD COLUMN     "cacheHit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "fallbackReason" TEXT,
ADD COLUMN     "inputTokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "outputTokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "rawModel" TEXT,
ADD COLUMN     "strategy" TEXT NOT NULL DEFAULT 'cost_aware';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "monthlyBudgetUsd" DECIMAL(10,2),
ADD COLUMN     "monthlyTokenLimit" INTEGER;

-- CreateIndex
CREATE INDEX "Prompt_strategy_idx" ON "Prompt"("strategy");

-- CreateIndex
CREATE INDEX "Prompt_cacheHit_idx" ON "Prompt"("cacheHit");
