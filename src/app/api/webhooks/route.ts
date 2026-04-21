import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const eventType = request.headers.get("x-webhook-event") || body.event;
    const source = request.headers.get("x-webhook-source") || "generic";

    // Log webhook for debugging
    console.log(`Webhook received: ${eventType} from ${source}`, body);

    // Store webhook event in database for audit trail
    await prisma.prompt.create({
      data: {
        promptText: `Webhook: ${eventType}`,
        complexity: "SIMPLE",
        modelUsed: "PHI_3_MINI",
        tokens: 0,
        estimatedCost: 0,
        provider: "webhook",
        rawModel: source,
        strategy: "webhook",
      },
    });

    // Handle different webhook types
    switch (eventType) {
      case "prompt.completed":
        // Handle prompt completion notifications
        await handlePromptCompleted(body);
        break;

      case "usage.threshold":
        // Handle usage threshold alerts
        await handleUsageThreshold(body);
        break;

      case "billing.alert":
        // Handle billing alerts
        await handleBillingAlert(body);
        break;

      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }

    return NextResponse.json({ received: true, event: eventType });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

async function handlePromptCompleted(data: any) {
  // Process prompt completion webhook
  // Could trigger notifications, analytics updates, etc.
  console.log("Prompt completed:", data.id);
}

async function handleUsageThreshold(data: any) {
  // Process usage threshold webhook
  // Could send alerts, update user limits, etc.
  console.log("Usage threshold reached:", data.userId, data.threshold);
}

async function handleBillingAlert(data: any) {
  // Process billing alert webhook
  // Could send notifications, update billing status, etc.
  console.log("Billing alert:", data.userId, data.amount);
}