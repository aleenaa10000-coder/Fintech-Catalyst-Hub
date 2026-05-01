import { useState, useMemo, type ReactNode } from "react";
import { PageMeta } from "@/components/PageMeta";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Trash2,
  Plus,
  Lock,
  LogOut,
  Pencil,
  X,
  Check,
  Star,
  ArrowLeft,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";

interface PricingPlan {
  id: number;
  name: string;
  tagline: string;
  priceMonthly: number;
  priceUnit: string;
  description: string;
  features: string[];
  ctaLabel: string;
  highlighted: boolean;
  sortOrder: number;
}

const QUERY_KEY = ["admin", "pricing", "plans"] as const;

async function fetchPlans(): Promise<PricingPlan[]> {
  const res = await fetch("/api/pricing/plans");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function createPlan(data: Omit<PricingPlan, "id">): Promise<PricingPlan> {
  const res = await fetch("/api/admin/pricing/plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

async function updatePlan(id: number, data: Partial<Omit<PricingPlan, "id">>): Promise<PricingPlan> {
  const res = await fetch(`/api/admin/pricing/plans/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

async function deletePlan(id: number): Promise<void> {
  const res = await fetch(`/api/admin/pricing/plans/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

const emptyForm = {
  name: "",
  tagline: "",
  priceMonthly: "",
  priceUnit: "USD/month",
  description: "",
  features: "",
  ctaLabel: "Get started",
  highlighted: false,
  sortOrder: "0",
};

type FormState = typeof emptyForm;

function planToForm(p: PricingPlan): FormState {
  return {
    name: p.name,
    tagline: p.tagline,
    priceMonthly: String(p.priceMonthly),
    priceUnit: p.priceUnit,
    description: p.description,
    features: p.features.join("\n"),
    ctaLabel: p.ctaLabel,
    highlighted: p.highlighted,
    sortOrder: String(p.sortOrder),
  };
}

function formToPayload(f: FormState) {
  return {
    name: f.name.trim(),
    tagline: f.tagline.trim(),
    priceMonthly: Number(f.priceMonthly),
    priceUnit: f.priceUnit.trim() || "USD/month",
    description: f.description.trim(),
    features: f.features.split("\n").map((s) => s.trim()).filter(Boolean),
    ctaLabel: f.ctaLabel.trim() || "Get started",
    highlighted: f.highlighted,
    sortOrder: Number(f.sortOrder) || 0,
  };
}

type FormErrors = Partial<Record<keyof FormState, string>>;

function validateForm(f: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!f.name.trim()) {
    errors.name = "Plan name is required.";
  } else if (f.name.trim().length < 2) {
    errors.name = "Plan name must be at least 2 characters.";
  }
  if (!f.tagline.trim()) {
    errors.tagline = "Tagline is required.";
  }
  const price = Number(f.priceMonthly);
  if (f.priceMonthly === "" || f.priceMonthly === null) {
    errors.priceMonthly = "Price is required.";
  } else if (Number.isNaN(price) || price < 0) {
    errors.priceMonthly = "Price must be a non-negative number.";
  }
  if (!f.description.trim()) {
    errors.description = "Description is required.";
  }
  const features = f.features.split("\n").map((s) => s.trim()).filter(Boolean);
  if (features.length === 0) {
    errors.features = "Add at least one feature.";
  }
  const sort = Number(f.sortOrder);
  if (f.sortOrder !== "" && !Number.isInteger(sort)) {
    errors.sortOrder = "Sort order must be a whole number.";
  }
  return errors;
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-rose-600 mt-1">{msg}</p>;
}

function PlanForm({
  title,
  form,
  setForm,
  onSubmit,
  onCancel,
  isPending,
  submitLabel,
}: {
  title: ReactNode;
  form: FormState;
  setForm: (f: FormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel?: () => void;
  isPending: boolean;
  submitLabel: string;
}) {
  const set = (k: keyof FormState, v: string | boolean) =>
    setForm({ ...form, [k]: v });

  const [tried, setTried] = useState(false);
  const errors = useMemo(() => validateForm(form), [form]);
  const hasErrors = Object.keys(errors).length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    if (hasErrors) return;
    onSubmit(e);
  }

  const e = tried ? errors : {};

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <h2 className="text-lg font-semibold flex items-center gap-2">
        {title}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="pf-name">Plan name</Label>
          <Input
            id="pf-name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Growth"
            aria-invalid={!!e.name}
            className={e.name ? "border-rose-400 focus-visible:ring-rose-300" : ""}
          />
          <FieldError msg={e.name} />
        </div>
        <div>
          <Label htmlFor="pf-tagline">Tagline</Label>
          <Input
            id="pf-tagline"
            value={form.tagline}
            onChange={(e) => set("tagline", e.target.value)}
            placeholder="One-liner for the plan"
            aria-invalid={!!e.tagline}
            className={e.tagline ? "border-rose-400 focus-visible:ring-rose-300" : ""}
          />
          <FieldError msg={e.tagline} />
        </div>
        <div>
          <Label htmlFor="pf-price">Price (monthly, USD)</Label>
          <Input
            id="pf-price"
            type="number"
            min={0}
            value={form.priceMonthly}
            onChange={(e) => set("priceMonthly", e.target.value)}
            placeholder="2500"
            aria-invalid={!!e.priceMonthly}
            className={e.priceMonthly ? "border-rose-400 focus-visible:ring-rose-300" : ""}
          />
          <FieldError msg={e.priceMonthly} />
        </div>
        <div>
          <Label htmlFor="pf-unit">Price unit</Label>
          <Input
            id="pf-unit"
            value={form.priceUnit}
            onChange={(e) => set("priceUnit", e.target.value)}
            placeholder="USD/month"
          />
        </div>
        <div>
          <Label htmlFor="pf-cta">CTA button label</Label>
          <Input
            id="pf-cta"
            value={form.ctaLabel}
            onChange={(e) => set("ctaLabel", e.target.value)}
            placeholder="Get started"
          />
        </div>
        <div>
          <Label htmlFor="pf-sort">Sort order</Label>
          <Input
            id="pf-sort"
            type="number"
            value={form.sortOrder}
            onChange={(e) => set("sortOrder", e.target.value)}
            aria-invalid={!!e.sortOrder}
            className={e.sortOrder ? "border-rose-400 focus-visible:ring-rose-300" : ""}
          />
          <FieldError msg={e.sortOrder} />
        </div>
      </div>
      <div>
        <Label htmlFor="pf-desc">Description</Label>
        <Textarea
          id="pf-desc"
          rows={3}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          aria-invalid={!!e.description}
          className={e.description ? "border-rose-400 focus-visible:ring-rose-300" : ""}
        />
        <FieldError msg={e.description} />
      </div>
      <div>
        <Label htmlFor="pf-features">Features (one per line)</Label>
        <Textarea
          id="pf-features"
          rows={5}
          placeholder={"4 long-form articles/month\nSEO keyword research\n..."}
          value={form.features}
          onChange={(e) => set("features", e.target.value)}
          aria-invalid={!!e.features}
          className={e.features ? "border-rose-400 focus-visible:ring-rose-300" : ""}
        />
        <FieldError msg={e.features} />
      </div>
      <div className="flex items-center gap-3">
        <input
          id="pf-highlighted"
          type="checkbox"
          className="w-4 h-4 accent-[#0052FF]"
          checked={form.highlighted}
          onChange={(e) => set("highlighted", e.target.checked)}
        />
        <Label htmlFor="pf-highlighted" className="cursor-pointer">
          Highlighted (most popular)
        </Label>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <Button
          type="submit"
          disabled={isPending || (tried && hasErrors)}
          className="bg-[#0052FF] hover:bg-[#0040CC]"
        >
          {isPending ? "Saving…" : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-1.5" /> Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

export default function AdminPricing() {
  const { user, isLoading: authLoading, isAuthenticated, login, logout } = useAuth();
  const qc = useQueryClient();
  const { data: plans = [], isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchPlans,
  });

  const createMut = useMutation({
    mutationFn: createPlan,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Plan created");
      setCreateForm(emptyForm);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Omit<PricingPlan, "id">> }) =>
      updatePlan(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Plan updated");
      setEditingId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: deletePlan,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Plan deleted");
    },
    onError: () => toast.error("Could not delete plan"),
  });

  const [createForm, setCreateForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate(formToPayload(createForm));
  };

  const startEdit = (p: PricingPlan) => {
    setEditingId(p.id);
    setEditForm(planToForm(p));
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId === null) return;
    updateMut.mutate({ id: editingId, data: formToPayload(editForm) });
  };

  const handleDelete = (p: PricingPlan) => {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    deleteMut.mutate(p.id);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-[#0052FF]/10 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-[#0052FF]" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Admin sign in required</h1>
            <p className="text-muted-foreground mb-6">
              Sign in to manage pricing plans.
            </p>
            <Button size="lg" onClick={login} className="bg-[#0052FF] hover:bg-[#0040cc]">
              Log in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Not authorized</h1>
            <p className="text-muted-foreground mb-6">
              Your account is not on the admin allowlist.
            </p>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 mr-1.5" /> Log out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-16">
      <PageMeta page="adminBlog" />
      <div className="container mx-auto px-4 max-w-4xl">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground -ml-2">
                  <ArrowLeft className="w-4 h-4" /> Dashboard
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold mb-1">Pricing Plans</h1>
            <p className="text-muted-foreground">
              Create, edit, or remove plans. Changes appear on the public Pricing page immediately.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground hidden sm:inline">
              Signed in as{" "}
              <strong className="text-foreground">
                {user?.firstName ?? user?.email ?? "Admin"}
              </strong>
            </span>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 mr-1.5" /> Log out
            </Button>
          </div>
        </div>

        {/* Create form */}
        <Card className="mb-10">
          <CardContent className="pt-6">
            <PlanForm
              title={<><Plus className="w-5 h-5" /> Add a pricing plan</>}
              form={createForm}
              setForm={setCreateForm}
              onSubmit={handleCreate}
              isPending={createMut.isPending}
              submitLabel="Create plan"
            />
          </CardContent>
        </Card>

        {/* Existing plans */}
        <h2 className="text-xl font-bold mb-4">
          Existing plans{" "}
          <span className="text-muted-foreground font-normal text-base">
            ({plans.length})
          </span>
        </h2>

        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : plans.length === 0 ? (
          <p className="text-muted-foreground">No pricing plans yet.</p>
        ) : (
          <div className="space-y-4">
            {plans.map((plan) =>
              editingId === plan.id ? (
                <Card key={plan.id} className="border-[#0052FF]/40 shadow-md">
                  <CardContent className="pt-6">
                    <PlanForm
                      title={<><Pencil className="w-4 h-4" /> Editing: {plan.name}</>}
                      form={editForm}
                      setForm={setEditForm}
                      onSubmit={handleUpdate}
                      onCancel={() => setEditingId(null)}
                      isPending={updateMut.isPending}
                      submitLabel="Save changes"
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card key={plan.id}>
                  <CardContent className="pt-5 pb-5 flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-base">{plan.name}</span>
                        {plan.highlighted && (
                          <Badge className="bg-[#0052FF] text-white text-[11px] gap-1">
                            <Star className="w-2.5 h-2.5" /> Most popular
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[11px]">
                          ${plan.priceMonthly.toLocaleString()}/{plan.priceUnit.replace("USD/", "")}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{plan.tagline}</p>
                      {plan.features.length > 0 && (
                        <ul className="text-xs text-muted-foreground space-y-0.5 ml-3 list-disc">
                          {plan.features.slice(0, 4).map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                          {plan.features.length > 4 && (
                            <li className="text-muted-foreground/60">
                              +{plan.features.length - 4} more
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(plan)}
                        className="gap-1.5"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(plan)}
                        disabled={deleteMut.isPending}
                        aria-label={`Delete ${plan.name}`}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
