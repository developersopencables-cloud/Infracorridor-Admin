"use client";

import { useParams } from "next/navigation";
import CorridorForm from "../components/corridor-form";

export default function EditCorridorPage() {
  const params = useParams();
  const id =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
        ? params.id[0]
        : "";

  return <CorridorForm mode="edit" corridorId={id} />;
}
