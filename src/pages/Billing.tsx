import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  IndianRupee,
  CreditCard,
  FileText,
  Receipt,
  Loader2,
  CheckCircle,
  Check,
  AlertTriangle,
} from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface SubscriptionPayment {
  id: string;
  plan: string;
  amount: number;
  status: string;
  period_start: string;
  period_end: string;
  created_at: string;
}

const planDetails: Record<string, { name: string; price: string; period: string; billing: string; emails: string }> = {
  starter: { name: "Starter", price: "₹999", period: "/user/mo", billing: "Billed quarterly", emails: "10,000 emails/month" },
  growth: { name: "Growth", price: "₹2,499", period: "/mo", billing: "Monthly or quarterly", emails: "50,000 emails/month" },
  scale: { name: "Scale", price: "₹5,999", period: "/mo", billing: "Monthly or quarterly", emails: "2,00,000 emails/month" },
};

const planCards = [
  {
    id: "starter",
    name: "Starter",
    price: "₹999",
    period: "/user/mo",
    billing: "Billed quarterly · + 18% GST",
    highlight: false,
    features: ["10,000 emails/month", "3 sender domains", "HTML template editor", "Open & click tracking", "Email support"],
  },
  {
    id: "growth",
    name: "Growth",
    price: "₹2,499",
    period: "/mo",
    billing: "Monthly or quarterly · + 18% GST",
    highlight: true,
    features: ["50,000 emails/month", "Unlimited sender domains", "Full automation workflows", "AI Insights", "DPDP compliance tools", "Priority support"],
  },
  {
    id: "scale",
    name: "Scale",
    price: "₹5,999",
    period: "/mo",
    billing: "Monthly or quarterly · + 18% GST",
    highlight: false,
    features: ["2,00,000 emails/month", "Dedicated IP", "Advanced analytics", "Multi-user / roles", "SLA-backed support"],
  },
];

export default function Billing() {
  const { currentOrg, orgRole, refreshOrgs } = useOrg();
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = orgRole === "admin";

  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);

    const { data } = await supabase.functions.invoke("billing", {
      body: { action: "get_subscription", org_id: currentOrg.id },
    });

    if (data?.payments) setPayments(data.payments);
    setLoading(false);
  }, [currentOrg]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Load Razorpay script
  useEffect(() => {
    if (!document.getElementById("razorpay-sdk")) {
      const script = document.createElement("script");
      script.id = "razorpay-sdk";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      document.body.appendChild(script);
    }
  }, []);

  const handleSubscribe = async (planId: string) => {
    setSubscribing(planId);
    try {
      const { data, error } = await supabase.functions.invoke("billing", {
        body: {
          action: "create_subscription",
          org_id: currentOrg!.id,
          plan: planId,
          billing_cycle: planId === "starter" ? "quarterly" : "monthly",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const options = {
        key: data.razorpay_key_id,
        amount: data.order.amount,
        currency: data.order.currency,
        order_id: data.order.id,
        name: "In-Sync",
        description: `${planDetails[planId]?.name || planId} plan subscription`,
        handler: async (response: any) => {
          const verifyRes = await supabase.functions.invoke("billing", {
            body: {
              action: "verify_subscription",
              org_id: currentOrg!.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: planId,
              billing_cycle: data.billing_cycle,
            },
          });

          if (verifyRes.data?.success) {
            toast({ title: "Subscription activated!", description: `You're now on the ${planDetails[planId]?.name} plan.` });
            await refreshOrgs();
            fetchData();
          } else {
            toast({ variant: "destructive", title: "Verification failed", description: verifyRes.data?.error || "Please contact support." });
          }
          setSubscribing(null);
        },
        modal: { ondismiss: () => setSubscribing(null) },
        prefill: { email: user?.email },
        theme: { color: "#6366f1" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
      setSubscribing(null);
    }
  };

  const formatCurrency = (paise: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
  const formatDate = (s: string) => new Date(s).toLocaleDateString("en-IN", { dateStyle: "medium" });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const orgStatus = currentOrg?.org_status || "trial";
  const currentPlan = currentOrg?.subscription_plan;
  const trialDaysLeft = currentOrg?.trial_started_at
    ? Math.max(0, 14 - Math.floor((Date.now() - new Date(currentOrg.trial_started_at).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Billing</h1>

        {/* Status card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                  orgStatus === "active" ? "bg-emerald-100 dark:bg-emerald-900/30" :
                  orgStatus === "trial" ? "bg-blue-100 dark:bg-blue-900/30" :
                  "bg-amber-100 dark:bg-amber-900/30"
                }`}>
                  {orgStatus === "active" ? <CheckCircle className="h-6 w-6 text-emerald-600" /> :
                   orgStatus === "trial" ? <CreditCard className="h-6 w-6 text-blue-600" /> :
                   <AlertTriangle className="h-6 w-6 text-amber-600" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-foreground">
                      {orgStatus === "active" ? `${planDetails[currentPlan || ""]?.name || "Active"} Plan` :
                       orgStatus === "trial" ? "Free Trial" : "Suspended"}
                    </p>
                    <Badge variant={orgStatus === "active" ? "default" : orgStatus === "trial" ? "secondary" : "destructive"}>
                      {orgStatus}
                    </Badge>
                  </div>
                  {orgStatus === "trial" && (
                    <p className="text-sm text-muted-foreground">
                      {currentOrg?.trial_emails_used || 0} of 100 emails used — {trialDaysLeft} days remaining
                    </p>
                  )}
                  {orgStatus === "active" && currentPlan && (
                    <p className="text-sm text-muted-foreground">
                      {planDetails[currentPlan]?.emails} — {planDetails[currentPlan]?.billing}
                    </p>
                  )}
                </div>
              </div>
              {orgStatus === "trial" && (
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <div className="h-2 w-32 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(currentOrg?.trial_emails_used || 0)}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{currentOrg?.trial_emails_used || 0}/100 emails</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="plans">
          <TabsList>
            <TabsTrigger value="plans" className="gap-2"><IndianRupee className="h-4 w-4" /> Plans</TabsTrigger>
            <TabsTrigger value="payments" className="gap-2"><Receipt className="h-4 w-4" /> Payments</TabsTrigger>
          </TabsList>

          {/* Plans Tab */}
          <TabsContent value="plans">
            <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-center">
              <p className="text-sm font-medium text-primary">Every plan starts with 100 free emails. No credit card required.</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {planCards.map((plan) => {
                const isCurrent = currentPlan === plan.id && orgStatus === "active";
                return (
                  <Card
                    key={plan.id}
                    className={`${plan.highlight ? "border-primary ring-1 ring-primary/20 shadow-lg shadow-primary/10" : ""} ${isCurrent ? "ring-2 ring-emerald-500" : ""}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        {plan.highlight && <Badge className="bg-primary/10 text-primary border-0 text-[10px]">Popular</Badge>}
                        {isCurrent && <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px]">Current</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-foreground">
                        {plan.price}<span className="text-sm font-normal text-muted-foreground">{plan.period}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">{plan.billing}</p>
                      <ul className="space-y-2 text-sm mb-6">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-center gap-2">
                            <Check className={`h-3.5 w-3.5 shrink-0 ${plan.highlight ? "text-primary" : "text-emerald-500"}`} />
                            {f}
                          </li>
                        ))}
                      </ul>
                      {isAdmin && !isCurrent && (
                        <Button
                          className="w-full"
                          variant={plan.highlight ? "default" : "outline"}
                          disabled={!!subscribing}
                          onClick={() => handleSubscribe(plan.id)}
                        >
                          {subscribing === plan.id ? (
                            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...</>
                          ) : isCurrent ? "Current Plan" : "Subscribe"}
                        </Button>
                      )}
                      {isCurrent && (
                        <Button className="w-full" variant="outline" disabled>
                          <CheckCircle className="h-4 w-4 mr-2" /> Current Plan
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              All plans include 18% GST. Need a custom plan? Contact <a href="mailto:a@in-sync.co.in" className="text-primary hover:underline">a@in-sync.co.in</a>
            </p>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>Subscription payments for your organization</CardDescription>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">No payments yet. Subscribe to a plan to get started.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-sm">{formatDate(p.created_at)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{planDetails[p.plan]?.name || p.plan}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {p.period_start && p.period_end ? `${formatDate(p.period_start)} — ${formatDate(p.period_end)}` : "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(p.amount)}</TableCell>
                          <TableCell>
                            <Badge variant={p.status === "paid" ? "default" : "secondary"}>{p.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
