import type { Prisma, User } from "@prisma/client";

export type SignupUserInput = {
  agencyName: string;
  agencyZipcode: string | null;
  agencyAddress: string | null;
  agencyPhone: string | null;
  name: string;
  phone: string | null;
  email: string;
};

export async function createSignupUser(
  tx: Prisma.TransactionClient,
  input: SignupUserInput,
  passwordHash: string,
): Promise<{ user: User; isFirstUser: boolean }> {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(824201409141::bigint) IS NULL AS locked`;
  const isFirstUser = (await tx.user.count()) === 0;
  const agency = await tx.agency.create({
    data: {
      name: input.agencyName,
      zipcode: input.agencyZipcode,
      address: input.agencyAddress,
      phone: input.agencyPhone,
    },
  });
  const user = await tx.user.create({
    data: {
      agencyId: agency.id,
      email: input.email,
      passwordHash,
      name: input.name,
      phone: input.phone,
      role: isFirstUser ? "superadmin" : "member",
    },
  });

  return { user, isFirstUser };
}
