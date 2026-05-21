import { useState } from "react";
import { useOrg, Organization } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CreditCard, Check, Loader2, IndianRupee } from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: "₹999",
    period: "/user/mo",
    billing: "Billed quarterly (₹2,997)",
    features: ["10,000 emails/month", "3 sender domains", "HTML template editor", "Open & click tracking"],
  },
  {
    id: "growth",
    name: "Growth",
    price: "₹2,499",
    period: "/mo",
    billing: "Monthly or quarterly",
    highlight: true,
    features: ["50,000 emails/month", "Unlimited domains", "Automation workflows", "AI Insights", "DPDP tools"],
  },
  {
    id: "scale",
    name: "Scale",
    price: "₹5,999",
    period: "/mo",
    billing: "Monthly or quarterly",
    features: ["2,00,000 emails/month", "Dedicated IP", "Advanced analytics", "Multi-user / roles", "SLA support"],
  },
];

export function SuspendedOrgGate({ org }: { org: Organization }) {
  const { user } = useAuth();
  const { refreshOrgs } = useOrg();
  const { toast } = useToast();
  const [paying, setPaying] = useState(false);

  const daysUntilDeletion = org.suspended_at
    ? Math.max(0, 16 - Math.floor((Date.now() - new Date(org.suspended_at).getTime()) / (1000 * 60 * 60 * 24)))
    : 16;

  const handleSubscribe = async (planId: string) => {
    setPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke("billing", {
        body: { action: "create_subscription", org_id: org.id, plan: planId, billing_cycle: planId === "starter" ? "quarterly" : "monthly" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Load Razorpay
      if (!document.getElementById("razorpay-sdk")) {
        const script = document.createElement("script");
        script.id = "razorpay-sdk";
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        document.body.appendChild(script);
        await new Promise((r) => { script.onload = r; });
      }

      const options = {
        key: data.razorpay_key_id,
        amount: data.order.amount,
        currency: data.order.currency,
        order_id: data.order.id,
        name: "In-Sync",
        description: `${planId.charAt(0).toUpperCase() + planId.slice(1)} plan subscription`,
        handler: async (response: any) => {
          const verifyRes = await supabase.functions.invoke("billing", {
            body: {
              action: "verify_subscription",
              org_id: org.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: planId,
              billing_cycle: data.billing_cycle,
            },
          });
          if (verifyRes.data?.success) {
            toast({ title: "Subscription activated!", description: "Your organization is now active." });
            await refreshOrgs();
          } else {
            toast({ variant: "destructive", title: "Verification failed", description: verifyRes.data?.error || "Please contact support." });
          }
          setPaying(false);
        },
        modal: { ondismiss: () => setPaying(false) },
        prefill: { email: user?.email },
        theme: { color: "#6366f1" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
      setPaying(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <AlertTriangle className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Your trial has expired</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Your 14-day trial for <strong>{org.name}</strong> has ended. Subscribe to a plan to reactivate your organization and keep all your data.
          </p>
          {daysUntilDeletion <= 7 && (
            <p className="text-sm font-medium text-destructive">
              Your data will be permanently deleted in {daysUntilDeletion} day{daysUntilDeletion !== 1 ? "s" : ""} if no payment is made.
            </p>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={plan.highlight ? "border-primary ring-1 ring-primary/20 shadow-lg" : ""}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </CardDescription>
                <p className="text-xs text-muted-foreground">{plan.billing} + 18% GST</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className={`h-3.5 w-3.5 shrink-0 ${plan.highlight ? "text-primary" : "text-emerald-500"}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.highlight ? "default" : "outline"}
                  disabled={paying}
                  onClick={() => handleSubscribe(plan.id)}
                >
                  {paying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                  Subscribe
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          All plans include 18% GST. Payment reactivates your org instantly. Need help?{" "}
          <a href="mailto:a@in-sync.co.in" className="text-primary hover:underline">a@in-sync.co.in</a>
        </p>
      </div>
    </div>
  );
}
