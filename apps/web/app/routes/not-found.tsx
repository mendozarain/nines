import { Link } from "react-router";
import { Button } from "~/components/ui/button";

export function meta() {
  return [{ title: "Not found · Nines" }];
}

export default function NotFound() {
  return (
    <div className="grid gap-3">
      <h1 className="text-2xl font-semibold">That page is not in Nines</h1>
      <p className="text-sm text-muted-foreground">Go back to the dashboard and pick a section from the menu.</p>
      <Button asChild className="w-fit">
        <Link to="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}
