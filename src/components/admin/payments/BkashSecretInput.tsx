import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  maskedValue?: string | null;
}

export function BkashSecretInput({ maskedValue, value, ...props }: Props) {
  const [show, setShow] = useState(false);
  const displayValue = typeof value === "string" && value.length > 0 ? value : "";

  return (
    <div className="relative">
      <Input
        {...props}
        type={show ? "text" : "password"}
        value={displayValue}
        placeholder={maskedValue || props.placeholder}
        className="pr-11"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1 h-8 w-8"
        onClick={() => setShow((current) => !current)}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  );
}
