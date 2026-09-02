"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { signIn, signOut } from "@/lib/auth/config";
import { getDefaultPostLoginRedirect } from "@/lib/auth/post-login-redirect";
import { prisma } from "@/lib/db/prisma";
import { registerSchema } from "@/lib/validation/schemas";

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

export async function registerAction(
  _prevState: SignInResult,
  formData: FormData,
): Promise<SignInResult> {
  const callbackUrl = (formData.get("callbackUrl") as string) || "";

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Ya existe una cuenta con ese email. Iniciá sesión." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { name, email, passwordHash } });

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "No pudimos iniciar sesión. Probá ingresar manualmente." };
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
