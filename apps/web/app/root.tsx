import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";

import type { Route } from "./+types/root";
import "./app.css";

export const meta: Route.MetaFunction = () => [
  { title: "Nines" },
  { name: "description", content: "Accounting for Philippine gas stations" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0E1118" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function HydrateFallback() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <span className="label-mono">Loading Nines…</span>
    </div>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Something went wrong";
  let details = "Please refresh the page. If it keeps happening, tell us what you were doing.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "Page not found" : "Error";
    details = error.status === 404 ? "That page doesn't exist." : error.statusText || details;
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="container mx-auto flex flex-col gap-3 p-6 pt-16">
      <h1 className="text-2xl font-medium">{message}</h1>
      <p className="text-subtle-foreground">{details}</p>
      {stack && (
        <pre className="w-full overflow-x-auto rounded-md border bg-card p-4 font-mono text-xs">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
