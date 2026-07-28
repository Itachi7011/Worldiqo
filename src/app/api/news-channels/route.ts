import { NextRequest, NextResponse } from "next/server";
import { fetchSingleFeed, linkOf, stripHtml } from "@/lib/rss";
import { NEWS_CHANNELS } from "@/lib/newsChannels";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const channel = NEWS_CHANNELS.find((c) => c.id === id);

  if (!channel) {
    return NextResponse.json({ error: "Unknown channel id" }, { status: 400 });
  }

  const { items, error } = await fetchSingleFeed(channel.feedUrl);

  const headlines = items
    .map((item) => {
      const link = linkOf(item);
      if (!item.title || !link) return null;
      const dateStr = item.pubDate ?? item["dc:date"];
      const seenDate = dateStr ? new Date(dateStr) : null;
      return {
        title: stripHtml(item.title),
        url: link,
        seenDate:
          seenDate && !Number.isNaN(seenDate.getTime()) ? seenDate.toISOString() : null,
      };
    })
    .filter((h): h is NonNullable<typeof h> => h !== null)
    .slice(0, 30);

  return NextResponse.json(
    { channel, headlines, error },
    { headers: { "Cache-Control": "no-store" } }
  );
}
