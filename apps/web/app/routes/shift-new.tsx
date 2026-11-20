import { ShiftForm } from "~/components/shift-form";

export function meta() {
  return [{ title: "Record a shift · Nines" }];
}

export default function NewShift() {
  return <ShiftForm />;
}
