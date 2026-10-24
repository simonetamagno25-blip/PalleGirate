import { cn } from "@/lib/utils";

/** A native <select> dressed like the Input: 44px, 16px text, the 3:1 input outline. Native for every age and device. */
export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-11 w-full min-w-0 cursor-pointer rounded-md border border-input bg-card px-3 text-base text-foreground transition-colors duration-150 hover:border-foreground/60 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
