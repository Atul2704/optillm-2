"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Crown, CheckCircle, XCircle } from "lucide-react";

type SubscriptionData = {
  customer: any;
  subscriptions: any[];
  hasActiveSubscription: boolean;
};

const PLANS = [
  {
    id: "free",
    name: "Free",
    priceInr: 0,
    tokens: 10000,
    features: ["10K tokens/month", "Basic models", "Community support"],
  },
  {
    id: "pro",
    name: "Pro",
    priceInr: 899,
    tokens: 100000,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    features: ["100K tokens/month", "All models", "Priority support", "Advanced analytics"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceInr: 3999,
    tokens: 1000000,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID,
    features: ["1M tokens/month", "Custom models", "Dedicated support", "SLA guarantee"],
  },
];

function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export default function BillingPage() {
  const [data, setData] = React.useState<SubscriptionData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [subscribing, setSubscribing] = React.useState<string | null>(null);

  React.useEffect(() => {
    loadSubscriptionData();
  }, []);

  async function loadSubscriptionData() {
    try {
      const res = await fetch("/api/billing/subscription");
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error("Failed to load subscription data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function subscribe(planId: string) {
    const plan = PLANS.find(p => p.id === planId);
    if (!plan?.stripePriceId) return;

    setSubscribing(planId);
    try {
      const res = await fetch("/api/billing/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: plan.stripePriceId }),
      });

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Subscription error:", error);
    } finally {
      setSubscribing(null);
    }
  }

  async function cancelSubscription() {
    try {
      await fetch("/api/billing/subscription", { method: "DELETE" });
      await loadSubscriptionData();
    } catch (error) {
      console.error("Cancellation error:", error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading billing information...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
        <p className="mt-2 text-lg text-white/70">
          Manage your subscription and usage limits (all amounts in INR)
        </p>
      </div>

      {data?.hasActiveSubscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">Active Plan</div>
                <div className="text-sm text-white/60">
                  Next billing: {data.subscriptions[0]?.current_period_end ?
                    new Date(data.subscriptions[0].current_period_end * 1000).toLocaleDateString() :
                    'N/A'}
                </div>
              </div>
              <Badge className="bg-green-500/10 text-green-400">
                <CheckCircle className="w-4 h-4 mr-1" />
                Active
              </Badge>
            </div>
            <Button
              variant="outline"
              onClick={cancelSubscription}
              className="text-red-400 border-red-400 hover:bg-red-400/10"
            >
              Cancel Subscription
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => (
          <Card key={plan.id} className={`relative ${plan.id === 'pro' ? 'border-blue-500/50' : ''}`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {plan.name}
                {plan.id === 'pro' && (
                  <Badge className="bg-blue-500/10 text-blue-400">Popular</Badge>
                )}
              </CardTitle>
              <CardDescription>
                <div className="text-3xl font-bold">
                  {plan.priceInr === 0 ? "Free" : formatInr(plan.priceInr)}
                  {plan.priceInr > 0 && <span className="text-sm font-normal">/month</span>}
                </div>
                <div className="text-sm text-white/60 mt-1">
                  {plan.tokens.toLocaleString()} tokens/month
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              {plan.priceInr === 0 ? (
                <Button variant="outline" disabled className="w-full">
                  Current Plan
                </Button>
              ) : (
                <Button
                  onClick={() => subscribe(plan.id)}
                  disabled={subscribing === plan.id || data?.hasActiveSubscription}
                  className="w-full"
                >
                  {subscribing === plan.id ? (
                    "Processing..."
                  ) : data?.hasActiveSubscription ? (
                    "Upgrade Coming Soon"
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Subscribe
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usage & Billing History</CardTitle>
          <CardDescription>
            Track your token usage and billing history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-white/60">
            Usage tracking and billing history coming soon...
          </div>
        </CardContent>
      </Card>
    </div>
  );
}