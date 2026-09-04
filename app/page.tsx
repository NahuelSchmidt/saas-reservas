import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { getDefaultPostLoginRedirect } from "@/lib/auth/post-login-redirect";
import { PadelLanding } from "@/components/landing/padel-landing";

export default async function Home() {
  const session = await auth();

  if (session?.user?.email) {
    const destination = await getDefaultPostLoginRedirect(session.user.email);
    if (destination !== "/") redirect(destination);
  }

  return <PadelLanding />;
}
