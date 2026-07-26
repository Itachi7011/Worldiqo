import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchArticles, normalizeArticles } from "@/lib/gdelt";
import { sendAlertDigest } from "@/lib/email";
import type { CategoryId } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Triggered on a schedule (see vercel.json) to check every active saved
 * search against GDELT and email a digest of anything new since the last run.
 *
 * Auth: Vercel Cron automatically sends `Authorization: Bearer $CRON_SECRET`
 * when the CRON_SECRET env var is set — see
 * https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const searches = await prisma.savedSearch.findMany({
    where: { active: true },
    include: { user: { select: { email: true } } },
  });

  const results: { id: string; sent: boolean; newCount: number; error?: string }[] = [];

  for (const search of searches) {
    try {
      const { articles, error } = await fetchArticles(
        search.category as CategoryId,
        search.query,
        search.timespan,
        50
      );
      if (error) {
        results.push({ id: search.id, sent: false, newCount: 0, error });
        continue;
      }

      const events = normalizeArticles(articles, search.category as CategoryId);
      const newEvents = search.lastRunAt
        ? events.filter((e) => new Date(e.seenDate) > search.lastRunAt!)
        : events;

      let sent = false;
      if (newEvents.length > 0 && search.user.email) {
        const digest = await sendAlertDigest({
          to: search.user.email,
          searchName: search.name,
          category: search.category,
          events: newEvents,
        });
        sent = digest.sent;
      }

      await prisma.savedSearch.update({
        where: { id: search.id },
        data: { lastRunAt: new Date(), lastSentCount: newEvents.length },
      });

      results.push({ id: search.id, sent, newCount: newEvents.length });
    } catch (err) {
      results.push({
        id: search.id,
        sent: false,
        newCount: 0,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    checked: results.length,
    ranAt: new Date().toISOString(),
    results,
  });
}
