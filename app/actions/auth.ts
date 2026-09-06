"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth/config";
import { getDefaultPostLoginRedirect } from "@/lib/auth/post-login-redirect";

export type SignInResult = { error?: string };

export async function credentialsSignIn(
  _prevState: SignInResult,
  formData: FormData,
): Promise<SignInResult> {
  const email = formData.get("email") as string;
  const callbackUrl = (formData.get("callbackUrl") as string) || "";

  try {
    await signIn("credentials", {
      email,
      password: formData.get("password"),
      redirect: false,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Email o contraseña incorrectos." };
    }
    throw err;
  }

  redirect(callbackUrl || (await getDefaultPostLoginRedirect(email)));
}

export async function googleSignIn(formData: FormData) {
  const callbackUrl = (formData.get("callbackUrl") as string) || "/";
  // Con OAuth no sabemos el email hasta que vuelve del provider, así que acá
  // sí dejamos que NextAuth redirija directo; el destino inteligente por rol
  // solo aplica al login por credenciales (ver credentialsSignIn).
  await signIn("google", { redirectTo: callbackUrl });
}

export async function doSignOut() {
  await signOut({ redirectTo: "/" });
}
