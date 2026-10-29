import { Navigate } from "react-router";

/** Legacy path — customers is the primary receivables surface. */
export function meta() {
  return [{ title: "Customers · Nines" }];
}

export default function ReceivablesRedirect() {
  return <Navigate to="/customers" replace />;
}
