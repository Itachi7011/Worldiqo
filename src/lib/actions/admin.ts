"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    throw new Error("Not authorized.");
  }
  return session;
}

export async function setUserRole(userId: string, role: "user" | "admin") {
  const session = await requireAdmin();

  if (session.user.id === userId && role !== "admin") {
    throw new Error("You can't remove your own admin access.");
  }

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/users");
}

export async function deleteUser(userId: string) {
  const session = await requireAdmin();

  if (session.user.id === userId) {
    throw new Error("You can't delete your own account from here.");
  }

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin/users");
}
