import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PackageForm } from "@/components/subscriptions/PackageForm";
import { PackageTable } from "@/components/subscriptions/PackageTable";
import { SubscriptionSettingsForm } from "@/components/subscriptions/SubscriptionSettingsForm";
import { useAdminSubscriptionPackages, useSubscriptionSettings, subscriptionQueryKeys } from "@/hooks/use-subscriptions";
import {
  deleteSubscriptionPackage,
  duplicateSubscriptionPackage,
  saveSubscriptionPackage,
  saveSubscriptionSettings,
  toggleSubscriptionPackageStatus,
} from "@/lib/subscription-service";
import type { SubscriptionPackageWithFeatures } from "@/lib/subscription-utils";
import { toast } from "@/hooks/use-toast";

export default function AdminPricing() {
  const queryClient = useQueryClient();
  const packagesQuery = useAdminSubscriptionPackages();
  const settingsQuery = useSubscriptionSettings();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<SubscriptionPackageWithFeatures | null>(null);
  const [savingPackage, setSavingPackage] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SubscriptionPackageWithFeatures | null>(null);

  const packages = useMemo(() => packagesQuery.data || [], [packagesQuery.data]);

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: subscriptionQueryKeys.adminPackages }),
      queryClient.invalidateQueries({ queryKey: subscriptionQueryKeys.pricingPackages }),
      queryClient.invalidateQueries({ queryKey: subscriptionQueryKeys.homepagePackages }),
      queryClient.invalidateQueries({ queryKey: subscriptionQueryKeys.settings }),
    ]);
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
        <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-primary/80">Subscription Packages</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">Pricing & Subscription Control</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Manage packages, package features, visibility rules, and global pricing page settings from one place.
            </p>
          </div>
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) setEditingPackage(null);
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={() => setEditingPackage(null)}>
                <Plus className="mr-2 h-4 w-4" /> Add Package
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-6xl">
              <DialogHeader>
                <DialogTitle>{editingPackage ? "Edit Subscription Package" : "Create Subscription Package"}</DialogTitle>
              </DialogHeader>
              <PackageForm
                initialValue={editingPackage}
                saving={savingPackage}
                onSubmit={async (values) => {
                  setSavingPackage(true);
                  try {
                    await saveSubscriptionPackage({
                      package: {
                        ...values.package,
                        sale_price: Number.isNaN(values.package.sale_price as number) ? null : values.package.sale_price,
                        duration_value: Number.isNaN(values.package.duration_value as number) ? null : values.package.duration_value,
                        trial_days: Number.isNaN(values.package.trial_days as number) ? null : values.package.trial_days,
                        limit_purchase_per_user: Number.isNaN(values.package.limit_purchase_per_user as number)
                          ? null
                          : values.package.limit_purchase_per_user,
                        is_lifetime: values.package.duration_type === "lifetime",
                        metadata: {},
                      },
                      features: values.features,
                    });
                    toast({ title: editingPackage ? "Package updated" : "Package created" });
                    setDialogOpen(false);
                    setEditingPackage(null);
                    await refreshAll();
                  } catch (error) {
                    toast({
                      title: "Package save failed",
                      description: error instanceof Error ? error.message : "Unknown error",
                      variant: "destructive",
                    });
                  } finally {
                    setSavingPackage(false);
                  }
                }}
              />
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Tabs defaultValue="packages" className="space-y-4">
        <TabsList>
          <TabsTrigger value="packages">All Packages</TabsTrigger>
          <TabsTrigger value="settings">Subscription Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="packages">
          <Card>
            <CardContent className="p-0">
              {packagesQuery.isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : (
                <PackageTable
                  packages={packages}
                  onEdit={(pkg) => {
                    setEditingPackage(pkg);
                    setDialogOpen(true);
                  }}
                  onDuplicate={async (pkg) => {
                    try {
                      await duplicateSubscriptionPackage(pkg);
                      toast({ title: "Package duplicated" });
                      await refreshAll();
                    } catch (error) {
                      toast({
                        title: "Duplicate failed",
                        description: error instanceof Error ? error.message : "Unknown error",
                        variant: "destructive",
                      });
                    }
                  }}
                  onToggleActive={async (pkg) => {
                    try {
                      await toggleSubscriptionPackageStatus(pkg);
                      toast({ title: pkg.active ? "Package disabled" : "Package activated" });
                      await refreshAll();
                    } catch (error) {
                      toast({
                        title: "Status update failed",
                        description: error instanceof Error ? error.message : "Unknown error",
                        variant: "destructive",
                      });
                    }
                  }}
                  onDelete={(pkg) => setDeleteTarget(pkg)}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          {settingsQuery.data ? (
            <SubscriptionSettingsForm
              initialValue={settingsQuery.data}
              saving={savingSettings}
              onSubmit={async (values) => {
                setSavingSettings(true);
                try {
                  await saveSubscriptionSettings(values);
                  toast({ title: "Subscription settings saved" });
                  await refreshAll();
                } catch (error) {
                  toast({
                    title: "Settings save failed",
                    description: error instanceof Error ? error.message : "Unknown error",
                    variant: "destructive",
                  });
                } finally {
                  setSavingSettings(false);
                }
              }}
            />
          ) : null}
        </TabsContent>
      </Tabs>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete package?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the package and all of its features. Existing subscription history will keep snapshot data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteTarget) return;
                try {
                  await deleteSubscriptionPackage(deleteTarget.id);
                  toast({ title: "Package deleted" });
                  setDeleteTarget(null);
                  await refreshAll();
                } catch (error) {
                  toast({
                    title: "Delete failed",
                    description: error instanceof Error ? error.message : "Unknown error",
                    variant: "destructive",
                  });
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
