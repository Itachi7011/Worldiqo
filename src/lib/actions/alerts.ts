"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isPremium, FREE_SAVED_SEARCH_LIMIT } from "@/lib/billing";
import type { CategoryId } from "@/lib/types";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Sign in required.");
  return session;
}

export async function createSavedSearch(input: {
  name: string;
  category: CategoryId;
  query: string | null;
  timespan: string;
}) {
  const session = await requireUser();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { subscriptionStatus: true, _count: { select: { savedSearches: true } } },
  });

  if (user && !isPremium(user.subscriptionStatus) && user._count.savedSearches >= FREE_SAVED_SEARCH_LIMIT) {
    throw new Error(
      `Free plan is limited to ${FREE_SAVED_SEARCH_LIMIT} saved searches — upgrade to Premium on your account page for unlimited alerts.`
    );
  }

  const name = input.name.trim() || `${input.category} watch`;
  await prisma.savedSearch.create({
    data: {
      userId: session.user.id,
      name,
      category: input.category,
      query: input.query?.trim() || null,
      timespan: input.timespan,
    },
  });
  revalidatePath("/alerts");
}

export async function toggleSavedSearch(id: string) {
  const session = await requireUser();
  const search = await prisma.savedSearch.findUnique({ where: { id } });
  if (!search || search.userId !== session.user.id) {
    throw new Error("Not found.");
  }
  await prisma.savedSearch.update({ where: { id }, data: { active: !search.active } });
  revalidatePath("/alerts");
}

export async function deleteSavedSearch(id: string) {
  const session = await requireUser();
  const search = await prisma.savedSearch.findUnique({ where: { id } });
  if (!search || search.userId !== session.user.id) {
    throw new Error("Not found.");
  }
  await prisma.savedSearch.delete({ where: { id } });
  revalidatePath("/alerts");
}
