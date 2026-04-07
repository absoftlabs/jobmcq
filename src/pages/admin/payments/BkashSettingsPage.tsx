import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, WalletCards } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BkashGeneralSettingsCard } from "@/components/admin/payments/BkashGeneralSettingsCard";
import { BkashTokenizedApiCard } from "@/components/admin/payments/BkashTokenizedApiCard";
import { BkashCallbackSettingsCard } from "@/components/admin/payments/BkashCallbackSettingsCard";
import { BkashDebugToolsCard } from "@/components/admin/payments/BkashDebugToolsCard";
import { BkashLogViewerCard } from "@/components/admin/payments/BkashLogViewerCard";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { bkashQueryKeys, useBkashAdminSettings, useBkashLogs } from "@/hooks/use-bkash-payment";
import {
  clearBkashTokenCache,
  saveBkashSettings,
  testBkashStandardConnection,
  testBkashTokenizedConnection,
  validateBkashConfig,
} from "@/services/payment/bkash/bkashConfigService";
import { validateBkashSettingsPayload } from "@/services/payment/bkash/bkashValidation";
import { createEmptyBkashSettings, type BkashConnectionTestResult, type BkashSettingsPayload, type BkashValidationResult } from "@/types/payment/bkashTypes";

const urlField = z.string().trim();

const settingsSchema: z.ZodType<BkashSettingsPayload> = z.object({
  display_name: z.string().trim().min(1),
  general: z.object({
    is_enabled: z.boolean(),
    payment_title: z.string().trim().min(1, "Payment title is required"),
    payment_description: z.string().trim(),
    currency: z.string().trim().min(1, "Currency is required"),
    mode: z.enum(["sandbox", "live"]),
    show_on_checkout: z.boolean(),
    enable_logging: z.boolean(),
    enable_tokenized: z.boolean(),
  }),
  standard_endpoints: z.object({
    base_url: z.string().trim(),
    grant_token_endpoint: z.string().trim(),
    refresh_token_endpoint: z.string().trim(),
    create_payment_endpoint: z.string().trim(),
    execute_payment_endpoint: z.string().trim(),
    query_payment_endpoint: z.string().trim(),
    refund_endpoint: z.string().trim(),
    search_transaction_endpoint: z.string().trim(),
  }),
  tokenized_endpoints: z.object({
    base_url: z.string().trim(),
    grant_token_endpoint: z.string().trim(),
    refresh_token_endpoint: z.string().trim(),
    create_payment_endpoint: z.string().trim(),
    execute_payment_endpoint: z.string().trim(),
    agreement_status_endpoint: z.string().trim(),
    cancel_agreement_endpoint: z.string().trim(),
    payment_status_endpoint: z.string().trim(),
    confirm_endpoint: z.string().trim(),
    refund_endpoint: z.string().trim(),
    search_transaction_endpoint: z.string().trim(),
  }),
  callback_settings: z.object({
    callback_base_url: urlField,
    success_url: urlField,
    failure_url: urlField,
    cancel_url: urlField,
    redirect_success_url: urlField,
    redirect_failure_url: urlField,
    redirect_cancel_url: urlField,
  }),
  credentials: z.object({
    standard: z.object({
      username: z.string().trim(),
      password: z.string().trim(),
      app_key: z.string().trim(),
      app_secret: z.string().trim(),
    }),
    tokenized: z.object({
      username: z.string().trim(),
      password: z.string().trim(),
      app_key: z.string().trim(),
      app_secret: z.string().trim(),
    }),
  }),
});

export default function BkashSettingsPage() {
  const { user, loading, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const canQuery = !loading && Boolean(user) && hasRole("admin");
  const adminQuery = useBkashAdminSettings(canQuery);
  const logsQuery = useBkashLogs(25, canQuery);
  const [saving, setSaving] = useState(false);
  const [testingTokenized, setTestingTokenized] = useState(false);
  const [validating, setValidating] = useState(false);
  const [clearingTokens, setClearingTokens] = useState(false);
  const [validationResult, setValidationResult] = useState<BkashValidationResult | null>(null);
  const [latestTokenizedResult, setLatestTokenizedResult] = useState<BkashConnectionTestResult | null>(null);

  const form = useForm<BkashSettingsPayload>({
    resolver: zodResolver(settingsSchema),
    defaultValues: createEmptyBkashSettings(),
  });

  useEffect(() => {
    if (adminQuery.data?.settings) {
      form.reset(adminQuery.data.settings);
    }
  }, [adminQuery.data, form]);

  const refreshAdminData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: bkashQueryKeys.admin }),
      queryClient.invalidateQueries({ queryKey: bkashQueryKeys.public }),
      queryClient.invalidateQueries({ queryKey: bkashQueryKeys.tokenStatuses }),
      queryClient.invalidateQueries({ queryKey: bkashQueryKeys.logs(25) }),
    ]);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const hasStoredTokenizedSecrets = Boolean(
      maskedSummary.tokenized_username &&
      maskedSummary.tokenized_password &&
      maskedSummary.tokenized_app_key &&
      maskedSummary.tokenized_app_secret,
    );

    const normalizedValues: BkashSettingsPayload = {
      ...values,
      general: {
        ...values.general,
        enable_tokenized: true,
      },
      standard_endpoints: {
        ...values.tokenized_endpoints,
        query_payment_endpoint: values.tokenized_endpoints.payment_status_endpoint,
      },
      credentials: {
        standard: { ...values.credentials.tokenized },
        tokenized: { ...values.credentials.tokenized },
      },
    };

    const validation = validateBkashSettingsPayload(normalizedValues);
    const filteredValidation = hasStoredTokenizedSecrets
      ? (() => {
          const issues = validation.issues.filter(
            (issue) =>
              ![
                "credentials.tokenized.username",
                "credentials.tokenized.password",
                "credentials.tokenized.app_key",
                "credentials.tokenized.app_secret",
              ].includes(issue.field),
          );

          return {
            ...validation,
            issues,
            ok: !issues.some((issue) => issue.severity === "error"),
          };
        })()
      : validation;

    setValidationResult(filteredValidation);

    if (!filteredValidation.ok) {
      toast({
        title: "কনফিগারেশনে সমস্যা আছে",
        description: filteredValidation.issues.find((issue) => issue.severity === "error")?.message || "চিহ্নিত ফিল্ডগুলো ঠিক করুন।",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await saveBkashSettings(normalizedValues);
      toast({ title: "bKash সেটিংস সফলভাবে সেভ হয়েছে" });
      await refreshAdminData();
    } catch (error) {
      toast({
        title: "bKash সেটিংস সেভ করা যায়নি",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  });

  const runTokenizedTest = async () => {
    setTestingTokenized(true);
    try {
      const result = await testBkashTokenizedConnection();
      setLatestTokenizedResult(result);
      toast({
        title: result.ok ? "টোকেনাইজড এপিআই সংযুক্ত হয়েছে" : "টোকেনাইজড এপিআই ব্যর্থ হয়েছে",
        description: result.message,
        variant: result.ok ? "default" : "destructive",
      });
      await refreshAdminData();
    } catch (error) {
      toast({
        title: "টোকেনাইজড এপিআই টেস্ট ব্যর্থ হয়েছে",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setTestingTokenized(false);
    }
  };

  const runValidation = async () => {
    setValidating(true);
    try {
      const result = await validateBkashConfig();
      setValidationResult(result);
      toast({
        title: result.ok ? "কনফিগারেশন ঠিক আছে" : "ভ্যালিডেশনে সমস্যা পাওয়া গেছে",
        description: result.issues[0]?.message || "কোনো সমস্যা পাওয়া যায়নি",
        variant: result.ok ? "default" : "destructive",
      });
      await refreshAdminData();
    } catch (error) {
      toast({
        title: "ভ্যালিডেশন ব্যর্থ হয়েছে",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setValidating(false);
    }
  };

  const handleClearTokenCache = async () => {
    setClearingTokens(true);
    try {
      const result = await clearBkashTokenCache();
      toast({ title: "টোকেন ক্যাশ মুছে ফেলা হয়েছে", description: result.message });
      await refreshAdminData();
    } catch (error) {
      toast({
        title: "টোকেন ক্যাশ মুছতে ব্যর্থ হয়েছে",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setClearingTokens(false);
    }
  };

  if (loading || adminQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const adminData = adminQuery.data;
  const maskedSummary = adminData?.masked_summary || {
    standard_username: null,
    standard_password: null,
    standard_app_key: null,
    standard_app_secret: null,
    tokenized_username: null,
    tokenized_password: null,
    tokenized_app_key: null,
    tokenized_app_secret: null,
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card className="sticky top-4 z-20 border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background shadow-lg">
        <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={form.watch("general.mode") === "sandbox" ? "secondary" : "default"}>
                {form.watch("general.mode") === "sandbox" ? "স্যান্ডবক্স" : "লাইভ"}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <WalletCards className="h-3.5 w-3.5" /> bKash Gateway
              </Badge>
            </div>
            <h1 className="text-2xl font-black tracking-tight md:text-3xl">bKash পেমেন্ট সেটিংস</h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              production-ready bKash payment-এর জন্য secure credential, callback URL, token cache এবং API tools এখানে কনফিগার করুন।
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={runValidation} disabled={validating} className="gap-2">
              <ShieldCheck className="h-4 w-4" />
              {validating ? "যাচাই হচ্ছে..." : "বর্তমান কনফিগারেশন যাচাই"}
            </Button>
            <Button type="submit" disabled={saving} className="min-w-40">
              {saving ? "সেভ হচ্ছে..." : "bKash সেটিংস সেভ করুন"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="flex h-auto flex-wrap justify-start gap-2 rounded-2xl bg-muted/60 p-2">
          <TabsTrigger value="general">সাধারণ</TabsTrigger>
          <TabsTrigger value="tokenized">টোকেনাইজড এপিআই</TabsTrigger>
          <TabsTrigger value="callbacks">কলব্যাক ইউআরএল</TabsTrigger>
          <TabsTrigger value="debug">ডিবাগ ও লগ</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <BkashGeneralSettingsCard
            form={form}
            tokenizedStatus={adminData?.connection_statuses.tokenized || "not_tested"}
          />
        </TabsContent>

        <TabsContent value="tokenized" className="space-y-6">
          <BkashTokenizedApiCard form={form} maskedSummary={maskedSummary} />
        </TabsContent>

        <TabsContent value="callbacks" className="space-y-6">
          <BkashCallbackSettingsCard form={form} />
        </TabsContent>

        <TabsContent value="debug" className="space-y-6">
          <BkashDebugToolsCard
            mode={form.watch("general.mode")}
            maskedSummary={maskedSummary}
            tokenStatuses={adminData?.token_statuses || []}
            validationResult={validationResult}
            latestStandardResult={null}
            latestTokenizedResult={latestTokenizedResult}
            testingTokenized={testingTokenized}
            validating={validating}
            clearingTokens={clearingTokens}
            onTestTokenized={runTokenizedTest}
            onValidate={runValidation}
            onClearTokens={handleClearTokenCache}
          />
          <BkashLogViewerCard
            logs={logsQuery.data || adminData?.latest_logs || []}
            loading={logsQuery.isFetching}
            onRefresh={() => void refreshAdminData()}
          />
        </TabsContent>
      </Tabs>
    </form>
  );
}
