import { formatDistanceToNow } from "date-fns";
import { RefreshCcw, ShieldAlert, Trash2, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  BkashConnectionTestResult,
  BkashMaskedCredentialSummary,
  BkashTokenStatus,
  BkashValidationResult,
} from "@/types/payment/bkashTypes";

export function BkashDebugToolsCard({
  mode,
  maskedSummary,
  tokenStatuses,
  validationResult,
  latestStandardResult,
  latestTokenizedResult,
  testingTokenized,
  validating,
  clearingTokens,
  onTestTokenized,
  onValidate,
  onClearTokens,
}: {
  mode: "sandbox" | "live";
  maskedSummary: BkashMaskedCredentialSummary;
  tokenStatuses: BkashTokenStatus[];
  validationResult: BkashValidationResult | null;
  latestStandardResult: BkashConnectionTestResult | null;
  latestTokenizedResult: BkashConnectionTestResult | null;
  testingTokenized: boolean;
  validating: boolean;
  clearingTokens: boolean;
  onTestTokenized: () => void;
  onValidate: () => void;
  onClearTokens: () => void;
}) {
  const standardToken = tokenStatuses.find((item) => item.token_type === "standard");
  const tokenizedToken = tokenStatuses.find((item) => item.token_type === "tokenized");

  const renderTokenCard = (title: string, token: BkashTokenStatus | undefined) => (
    <div className="rounded-2xl border bg-muted/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{title}</p>
        <Badge variant={token?.token_exists ? "default" : "outline"}>
          {token?.token_exists ? "টোকেন সংরক্ষিত" : "টোকেন নেই"}
        </Badge>
      </div>
      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        <p>মাস্কড টোকেন: {token?.token_masked || "এখনও তৈরি হয়নি"}</p>
        <p>মেয়াদ শেষ: {token?.expires_at ? new Date(token.expires_at).toLocaleString("en-US") : "প্রযোজ্য নয়"}</p>
        <p>
          সর্বশেষ রিফ্রেশ:{" "}
          {token?.last_refreshed_at
            ? `${formatDistanceToNow(new Date(token.last_refreshed_at), { addSuffix: true })}`
            : "কখনও নয়"}
        </p>
      </div>
    </div>
  );

  const issueCount = validationResult?.issues.length || 0;
  const hasErrors = validationResult?.issues.some((issue) => issue.severity === "error");

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle>ডিবাগ ও টুলস</CardTitle>
          <Badge variant={mode === "sandbox" ? "secondary" : "default"}>
            {mode === "sandbox" ? "স্যান্ডবক্স" : "লাইভ"}
          </Badge>
          {mode === "sandbox" ? (
            <Badge variant="outline" className="border-amber-500/30 text-amber-600">
              পরিবেশ: স্যান্ডবক্স
            </Badge>
          ) : (
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-600">
              পরিবেশ: লাইভ
            </Badge>
          )}
        </div>
        <CardDescription>credential পরীক্ষা, configuration যাচাই, token cache এবং masked summary এখান থেকে দেখুন।</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Button type="button" onClick={onTestTokenized} disabled={testingTokenized} className="justify-start gap-2">
            <RefreshCcw className="h-4 w-4" />
            {testingTokenized ? "টোকেনাইজড পরীক্ষা চলছে..." : "টোকেনাইজড এপিআই পরীক্ষা"}
          </Button>
          <Button type="button" onClick={onValidate} disabled={validating} variant="secondary" className="justify-start gap-2">
            <Wrench className="h-4 w-4" />
            {validating ? "যাচাই হচ্ছে..." : "কনফিগারেশন যাচাই"}
          </Button>
          <Button type="button" onClick={onClearTokens} disabled={clearingTokens} variant="destructive" className="justify-start gap-2">
            <Trash2 className="h-4 w-4" />
            {clearingTokens ? "মুছে ফেলা হচ্ছে..." : "টোকেন ক্যাশ মুছুন"}
          </Button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border bg-muted/30 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-semibold">যাচাই সারাংশ</p>
                <Badge variant={!validationResult ? "outline" : validationResult.ok ? "default" : "destructive"}>
                  {!validationResult ? "চালানো হয়নি" : validationResult.ok ? "ঠিক আছে" : "মনোযোগ প্রয়োজন"}
                </Badge>
              </div>
              {validationResult ? (
                <div className="mt-3 space-y-2 text-sm">
                  {validationResult.issues.length === 0 ? (
                    <p className="text-muted-foreground">কোনো validation সমস্যা পাওয়া যায়নি।</p>
                  ) : (
                    validationResult.issues.map((issue) => (
                      <div key={`${issue.field}-${issue.message}`} className="flex items-start gap-2 rounded-xl border bg-background px-3 py-2">
                        <ShieldAlert className={`mt-0.5 h-4 w-4 ${issue.severity === "error" ? "text-destructive" : "text-amber-500"}`} />
                        <div>
                          <p className="font-medium">{issue.message}</p>
                          <p className="text-xs text-muted-foreground">{issue.field}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">লাইভ/স্যান্ডবক্স mismatch এবং missing credential আছে কি না দেখতে validation চালান।</p>
              )}
              {issueCount > 0 && hasErrors ? (
                <p className="mt-3 text-xs text-destructive">production-এ নেওয়ার আগে অন্তত একটি blocking error ঠিক করতে হবে।</p>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {renderTokenCard("স্ট্যান্ডার্ড টোকেন", standardToken)}
              {renderTokenCard("টোকেনাইজড টোকেন", tokenizedToken)}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border bg-muted/30 p-4">
              <p className="text-sm font-semibold">মাস্কড ক্রেডেনশিয়াল সারাংশ</p>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <p>স্ট্যান্ডার্ড ইউজারনেম: {maskedSummary.standard_username || "সেভ হয়নি"}</p>
                <p>স্ট্যান্ডার্ড অ্যাপ কি: {maskedSummary.standard_app_key || "সেভ হয়নি"}</p>
                <p>স্ট্যান্ডার্ড অ্যাপ সিক্রেট: {maskedSummary.standard_app_secret || "সেভ হয়নি"}</p>
                <p>টোকেনাইজড ইউজারনেম: {maskedSummary.tokenized_username || "সেভ হয়নি"}</p>
                <p>টোকেনাইজড অ্যাপ কি: {maskedSummary.tokenized_app_key || "সেভ হয়নি"}</p>
                <p>টোকেনাইজড অ্যাপ সিক্রেট: {maskedSummary.tokenized_app_secret || "সেভ হয়নি"}</p>
              </div>
            </div>

            <div className="rounded-2xl border bg-muted/30 p-4 text-xs text-muted-foreground">
              <p className="text-sm font-semibold text-foreground">সর্বশেষ টেস্ট ফলাফল</p>
              <div className="mt-3 space-y-2">
                <p>স্ট্যান্ডার্ড: tokenized configuration থেকে mirrored</p>
                <p>টোকেনাইজড: {latestTokenizedResult ? `${latestTokenizedResult.status} • ${latestTokenizedResult.message}` : "এখনও পরীক্ষা হয়নি"}</p>
                {latestStandardResult ? (
                  <p>স্ট্যান্ডার্ড ফলাফল: {`${latestStandardResult.status} • ${latestStandardResult.message}`}</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
