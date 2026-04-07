import { formatDistanceToNow } from "date-fns";
import { RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { BkashLogItem } from "@/types/payment/bkashTypes";

export function BkashLogViewerCard({
  logs,
  loading,
  onRefresh,
}: {
  logs: BkashLogItem[];
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>সর্বশেষ API লগ</CardTitle>
          <CardDescription>connection test, token refresh এবং config validation-এর sanitized log এখানে দেখুন।</CardDescription>
        </div>
        <Button type="button" variant="outline" onClick={onRefresh} disabled={loading}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          লগ রিফ্রেশ
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[360px] rounded-2xl border">
          <div className="divide-y">
            {logs.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">এখনও কোনো API লগ নেই।</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={log.status === "success" ? "default" : log.status === "error" ? "destructive" : "secondary"}>
                      {log.status}
                    </Badge>
                    <span className="text-sm font-medium">{log.endpoint_name || log.log_type}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </span>
                    {log.http_status ? <Badge variant="outline">HTTP {log.http_status}</Badge> : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{log.message || "কোনো বার্তা পাওয়া যায়নি"}</p>
                  <details className="rounded-xl border bg-muted/30 p-3 text-xs">
                    <summary className="cursor-pointer font-medium">payload দেখুন</summary>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-[11px] leading-5">
                      {JSON.stringify(
                        {
                          request: log.request_payload,
                          response: log.response_payload,
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
