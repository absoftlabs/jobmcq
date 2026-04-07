import { Copy, Pencil, Power, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SubscriptionPackageWithFeatures } from "@/lib/subscription-utils";
import { formatCurrencyLabel, formatDurationLabel, getEffectivePrice } from "@/lib/subscription-utils";

export function PackageTable({
  packages,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleActive,
}: {
  packages: SubscriptionPackageWithFeatures[];
  onEdit: (pkg: SubscriptionPackageWithFeatures) => void;
  onDelete: (pkg: SubscriptionPackageWithFeatures) => void;
  onDuplicate: (pkg: SubscriptionPackageWithFeatures) => void;
  onToggleActive: (pkg: SubscriptionPackageWithFeatures) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Package</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Visibility</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-40">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {packages.map((pkg) => (
          <TableRow key={pkg.id}>
            <TableCell>
              <div>
                <p className="font-semibold">{pkg.name}</p>
                <p className="text-xs text-muted-foreground">{pkg.slug}</p>
              </div>
            </TableCell>
            <TableCell>{formatDurationLabel(pkg)}</TableCell>
            <TableCell>
              <div className="space-y-1">
                <p className="font-semibold">{formatCurrencyLabel(getEffectivePrice(pkg), pkg.currency)}</p>
                {pkg.sale_price ? (
                  <p className="text-xs text-muted-foreground line-through">{formatCurrencyLabel(pkg.regular_price, pkg.currency)}</p>
                ) : null}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={pkg.active ? "default" : "outline"}>{pkg.active ? "Active" : "Inactive"}</Badge>
            </TableCell>
            <TableCell>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>{pkg.show_on_pricing_page ? "Pricing: Yes" : "Pricing: No"}</p>
                <p>{pkg.show_on_homepage ? "Homepage: Yes" : "Homepage: No"}</p>
              </div>
            </TableCell>
            <TableCell>{new Date(pkg.created_at).toLocaleDateString("en-US")}</TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => onEdit(pkg)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => onDuplicate(pkg)}><Copy className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => onToggleActive(pkg)}><Power className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(pkg)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
