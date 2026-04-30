import { cn } from "@/lib/utils";
import { useCookieConsent } from "@/hooks/use-cookie-consent";

type Props = {
  className?: string;
  children?: React.ReactNode;
  "data-testid"?: string;
};

export function CookiePreferencesButton({
  className,
  children = "Manage cookie preferences",
  ...rest
}: Props) {
  const { reset } = useCookieConsent();
  return (
    <button
      type="button"
      onClick={reset}
      className={cn(
        "text-left bg-transparent p-0 border-0 cursor-pointer text-muted-foreground hover:text-primary transition-colors",
        className,
      )}
      data-testid={rest["data-testid"] ?? "link-manage-cookies"}
    >
      {children}
    </button>
  );
}
