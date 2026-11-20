import { useParams } from "react-router";
import { ShiftForm } from "~/components/shift-form";

export function meta() {
  return [{ title: "Edit shift · Nines" }];
}

export default function EditShift() {
  const { id } = useParams();
  return <ShiftForm shiftId={id} />;
}
