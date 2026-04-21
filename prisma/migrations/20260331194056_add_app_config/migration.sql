-- CreateTable
CREATE TABLE "AppConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "abTestEnabled" BOOLEAN NOT NULL DEFAULT false,
    "abWeightCostAware" INTEGER NOT NULL DEFAULT 70,
    "abWeightAlwaysGpt4o" INTEGER NOT NULL DEFAULT 15,
    "abWeightConservative" INTEGER NOT NULL DEFAULT 15,
    "rateLimitPerMinute" INTEGER NOT NULL DEFAULT 30,
    "cacheTtlMs" INTEGER NOT NULL DEFAULT 120000,
    "defaultMonthlyBudgetUsd" DECIMAL(10,2) NOT NULL DEFAULT 5.00,
    "defaultMonthlyTokenLimit" INTEGER NOT NULL DEFAULT 200000,
    "slackWebhookUrl" TEXT,
    "dailySpendAlertUsd" DECIMAL(10,2),
    "fallbackRateAlertPercent" INTEGER,

    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("id")
);
