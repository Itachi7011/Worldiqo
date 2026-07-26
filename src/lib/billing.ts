/** Saved-search cap for users without an active subscription. */
export const FREE_SAVED_SEARCH_LIMIT = 2;

export function isPremium(subscriptionStatus: string | null | undefined): boolean {
  return subscriptionStatus === "active";
}
