import { NextResponse } from "next/server";

const API_DOCS = {
  openapi: "3.0.0",
  info: {
    title: "OptiLLM API",
    version: "1.0.0",
    description: "Smart AI model router API for cost-optimized AI responses",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Development server",
    },
  ],
  paths: {
    "/api/router": {
      post: {
        summary: "Route and process AI prompt",
        description: "Classifies prompt complexity and routes to optimal AI model",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["promptText"],
                properties: {
                  promptText: {
                    type: "string",
                    description: "The text prompt to process",
                    maxLength: 20000,
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    createdAt: { type: "string", format: "date-time" },
                    promptText: { type: "string" },
                    complexity: { type: "string", enum: ["SIMPLE", "MEDIUM", "COMPLEX"] },
                    reasons: { type: "array", items: { type: "string" } },
                    confidence: { type: "number" },
                    strategy: { type: "string" },
                    modelUsed: { type: "string", enum: ["PHI_3_MINI", "LLAMA_3", "GPT_4O"] },
                    provider: { type: "string" },
                    rawModel: { type: "string" },
                    fallbackReason: { type: "string", nullable: true },
                    cacheHit: { type: "boolean" },
                    responseText: { type: "string" },
                    tokens: { type: "integer" },
                    inputTokens: { type: "integer" },
                    outputTokens: { type: "integer" },
                    estimatedCostUsd: { type: "number" },
                    gpt4oCostUsd: { type: "number" },
                    savingsUsd: { type: "number" },
                    savingsPercent: { type: "number" },
                  },
                },
              },
            },
          },
          400: {
            description: "Invalid request",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                    issues: { type: "array" },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/analytics": {
      get: {
        summary: "Get usage analytics",
        description: "Retrieve detailed usage statistics and cost analysis",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "startDate",
            in: "query",
            schema: { type: "string", format: "date" },
            description: "Start date for analytics (ISO 8601)",
          },
          {
            name: "endDate",
            in: "query",
            schema: { type: "string", format: "date" },
            description: "End date for analytics (ISO 8601)",
          },
          {
            name: "format",
            in: "query",
            schema: { type: "string", enum: ["json", "csv"] },
            description: "Export format",
          },
        ],
        responses: {
          200: {
            description: "Analytics data",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    totalPrompts: { type: "integer" },
                    totalTokens: { type: "integer" },
                    totalInputTokens: { type: "integer" },
                    totalOutputTokens: { type: "integer" },
                    modelUsage: { type: "object" },
                    modelTokens: { type: "object" },
                    modelCostUsd: { type: "object" },
                    providerUsage: { type: "object" },
                    complexityUsage: { type: "object" },
                    strategyUsage: { type: "object" },
                    fallbackUsage: { type: "object" },
                    cacheHitRate: { type: "number" },
                    successRate: { type: "number" },
                    totalActualCostUsd: { type: "number" },
                    totalGpt4oCostUsd: { type: "number" },
                    totalSavingsUsd: { type: "number" },
                    totalSavingsPercent: { type: "number" },
                    savingsSeries: { type: "array" },
                    dateRange: { type: "object" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/billing/subscription": {
      get: {
        summary: "Get subscription status",
        description: "Retrieve current subscription and billing information",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Subscription data",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    customer: { type: "object" },
                    subscriptions: { type: "array" },
                    hasActiveSubscription: { type: "boolean" },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Create subscription",
        description: "Start a new subscription with Stripe checkout",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["priceId"],
                properties: {
                  priceId: { type: "string", description: "Stripe price ID" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Checkout session created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    url: { type: "string", description: "Stripe checkout URL" },
                  },
                },
              },
            },
          },
        },
      },
      delete: {
        summary: "Cancel subscription",
        description: "Cancel current subscription (effective at period end)",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Subscription canceled",
          },
        },
      },
    },
    "/api/billing/webhook": {
      post: {
        summary: "Stripe webhook",
        description: "Handle Stripe webhook events for subscription updates",
        requestBody: {
          content: {
            "application/json": {
              schema: { type: "object" },
            },
          },
        },
        responses: {
          200: { description: "Webhook processed" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(API_DOCS, {
    headers: {
      "Content-Type": "application/json",
    },
  });
}