import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { getAppConfig } from "@/lib/config";

function dayStart(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

async function postSlack(webhookUrl: string, text: string) {
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

export async function POST() {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json(
      { error: admin.reason === "unauthorized" ? "Unauthorized" : "Forbidden" },
      { status: admin.reason === "unauthorized" ? 401 : 403 },
    );
  }

  const cfg = await getAppConfig();
  const webhookUrl = cfg.slackWebhookUrl;
  if (!webhookUrl) {
    return NextResponse.json({ error: "Slack webhook not configured" }, { status: 400 });
  }

  const start = dayStart();
  const prompts = await prisma.prompt.findMany({
    where: { createdAt: { gte: start } },
    select: { estimatedCost: true, fallbackReason: true },
    take: 50_000,
  });

  const totalSpend = prompts.reduce((sum, p) => sum + Number(p.estimatedCost), 0);
  const fallbackCount = prompts.filter((p) => Boolean(p.fallbackReason)).length;
  const fallbackRate = prompts.length ? (fallbackCount / prompts.length) * 100 : 0;

  const alerts: string[] = [];
  if (cfg.dailySpendAlertUsd != null && totalSpend >= cfg.dailySpendAlertUsd) {
    alerts.push(`Daily spend alert: $${totalSpend.toFixed(2)} (threshold $${cfg.dailySpendAlertUsd.toFixed(2)})`);
  }
  if (cfg.fallbackRateAlertPercent != null && fallbackRate >= cfg.fallbackRateAlertPercent) {
    alerts.push(`Fallback rate alert: ${fallbackRate.toFixed(1)}% (threshold ${cfg.fallbackRateAlertPercent}%)`);
  }

  if (alerts.length) {
    await postSlack(
      webhookUrl,
      `OptiLLM alerts (${new Date().toLocaleString()}):\n- ${alerts.join("\n- ")}`,
    );
  }

  return NextResponse.json({
    ok: true,
    start: start.toISOString(),
    prompts: prompts.length,
    totalSpendUsd: totalSpend,
    fallbackRatePercent: fallbackRate,
    alertsSent: alerts.length,
    alerts,
  });
}

