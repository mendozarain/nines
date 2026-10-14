import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

type FieldProps = React.ComponentProps<typeof Input> & {
  label: string;
  name: string;
  hint?: string;
  error?: string;
};

/** Label + input + hint or error, wired up for screen readers. */
export function Field({ label, name, hint, error, ...props }: FieldProps) {
  const id = `f-${name}`;
  const note = error ?? hint;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} aria-invalid={error ? true : undefined} aria-describedby={note ? `${id}-note` : undefined} {...props} />
      {note && (
        <span id={`${id}-note`} className={error ? "text-xs text-destructive-foreground" : "text-xs text-muted-foreground"}>
          {note}
        </span>
      )}
    </div>
  );
}
