import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface EditableFeatureItem {
  id?: string;
  feature_key: string;
  feature_label: string;
  feature_value: string;
  feature_type: "text" | "boolean" | "number" | "unlimited" | "not_included";
  icon_type: "check" | "cross" | "badge" | "numeric_pill";
  is_highlighted: boolean;
  is_active: boolean;
}

export function FeatureRepeater({
  features,
  onChange,
}: {
  features: EditableFeatureItem[];
  onChange: (features: EditableFeatureItem[]) => void;
}) {
  const updateFeature = <K extends keyof EditableFeatureItem>(index: number, key: K, value: EditableFeatureItem[K]) => {
    const next = [...features];
    next[index] = { ...next[index], [key]: value };
    onChange(next);
  };

  const moveFeature = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= features.length) return;
    const next = [...features];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Package Features</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange([
              ...features,
              {
                feature_key: "",
                feature_label: "",
                feature_value: "",
                feature_type: "text",
                icon_type: "check",
                is_highlighted: false,
                is_active: true,
              },
            ])
          }
        >
          <Plus className="mr-2 h-4 w-4" /> Feature
        </Button>
      </div>

      {features.map((feature, index) => (
        <div key={`${feature.id || "new"}-${index}`} className="space-y-3 rounded-xl border p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Feature Key</Label>
              <Input value={feature.feature_key} onChange={(event) => updateFeature(index, "feature_key", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Feature Label</Label>
              <Input value={feature.feature_label} onChange={(event) => updateFeature(index, "feature_label", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Feature Value</Label>
              <Input value={feature.feature_value} onChange={(event) => updateFeature(index, "feature_value", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Feature Type</Label>
              <Select value={feature.feature_type} onValueChange={(value) => updateFeature(index, "feature_type", value as EditableFeatureItem["feature_type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">text</SelectItem>
                  <SelectItem value="boolean">boolean</SelectItem>
                  <SelectItem value="number">number</SelectItem>
                  <SelectItem value="unlimited">unlimited</SelectItem>
                  <SelectItem value="not_included">not included</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Icon Type</Label>
              <Select value={feature.icon_type} onValueChange={(value) => updateFeature(index, "icon_type", value as EditableFeatureItem["icon_type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="check">check</SelectItem>
                  <SelectItem value="cross">cross</SelectItem>
                  <SelectItem value="badge">badge</SelectItem>
                  <SelectItem value="numeric_pill">numeric pill</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Flags</Label>
              <div className="flex gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={feature.is_highlighted} onChange={(event) => updateFeature(index, "is_highlighted", event.target.checked)} />
                  Highlight
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={feature.is_active} onChange={(event) => updateFeature(index, "is_active", event.target.checked)} />
                  Active
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="icon" onClick={() => moveFeature(index, -1)}>
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => moveFeature(index, 1)}>
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => onChange(features.filter((_, itemIndex) => itemIndex !== index))}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
