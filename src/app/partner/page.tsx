import { redirect } from "next/navigation";
import { resolveMyPartner } from "./_lib/resolvePartner";

export default async function PartnerIndexPage() {
  const { role } = await resolveMyPartner();

  if (role === "admin" || role === "manager") {
    redirect("/all-partners");
  }

  redirect("/partner/overview");
}
