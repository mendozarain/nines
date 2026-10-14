import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

/** Placeholder for a module that's planned but not built yet. Lists what it will do. */
export function ComingSoon({ items }: { items: string[] }) {
  return (
    <Card>
      <CardHeader>
        <span className="label-mono">Coming next</span>
        <CardTitle>What you'll be able to do here</CardTitle>
        <CardDescription>This part of Nines is being built.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2.5">
          {items.map((item) => (
            <li key={item} className="flex gap-2.5 text-subtle-foreground">
              <span className="mt-2 size-1.5 shrink-0 rounded-[1px] bg-chart-1" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
