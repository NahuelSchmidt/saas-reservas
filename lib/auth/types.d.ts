import { DefaultSession } from "next-auth";

export type TenantMembershipClaim = { tenantId: string; role: string };

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      globalRole: string | null;
      memberships: TenantMembershipClaim[];
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    globalRole?: string | null;
    memberships?: TenantMembershipClaim[];
  }
}
