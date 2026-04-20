import { redirect } from "next/navigation";
import { createClient } from "@/src/utils/supabase/server";
import { getPostLoginPath } from "@/src/utils/auth/postLogin";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  redirect(await getPostLoginPath(supabase, user.id));
}
