import { Resend } from "resend";
import type { NewsEvent } from "@/lib/types";
import { categoryById } from "@/lib/gdelt";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM ?? "Worldiqo <alerts@worldiqo.app>";

export interface AlertDigestParams {
  to: string;
  searchName: string;
  category: string;
  events: NewsEvent[];
}

export async function sendAlertDigest({ to, searchName, category, events }: AlertDigestParams) {
  const cat = categoryById(category as never);
  const subject = `Worldiqo: ${events.length} new update${events.length === 1 ? "" : "s"} for "${searchName}"`;
  const html = renderDigestHtml({ searchName, category: cat.label, events });

  if (!resend) {
    // No RESEND_API_KEY set — safe local-dev fallback so alerts are still
    // testable end-to-end without signing up for an email provider.
    console.log(`[worldiqo] (dev) would send email to ${to}: ${subject}`);
    return { sent: false, reason: "RESEND_API_KEY not configured" };
  }

  const result = await resend.emails.send({ from: FROM, to, subject, html });
  return { sent: !result.error, error: result.error ?? null };
}

function renderDigestHtml({
  searchName,
  category,
  events,
}: {
  searchName: string;
  category: string;
  events: NewsEvent[];
}): string {
  const items = events
    .slice(0, 15)
    .map(
      (e) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #1F2530;">
          <a href="${e.url}" style="color:#4FD1C5;text-decoration:none;font-size:14px;">${escapeHtml(
            e.title
          )}</a>
          <div style="color:#8891A3;font-size:12px;margin-top:4px;">${escapeHtml(e.domain)}${
            e.country ? ` · ${escapeHtml(e.country)}` : ""
          }</div>
        </td>
      </tr>`
    )
    .join("");

  return `
  <div style="background:#0A0D12;padding:24px;font-family:-apple-system,sans-serif;">
    <div style="max-width:560px;margin:0 auto;">
      <p style="color:#4FD1C5;font-weight:700;font-size:16px;margin:0 0 4px;">Worldiqo</p>
      <h1 style="color:#E4E7EC;font-size:18px;margin:0 0 4px;">${escapeHtml(searchName)}</h1>
      <p style="color:#8891A3;font-size:13px;margin:0 0 20px;">${escapeHtml(category)} · ${
        events.length
      } new item(s)</p>
      <table width="100%" style="border-collapse:collapse;">${items}</table>
      <p style="color:#5C6577;font-size:12px;margin-top:24px;">
        You're receiving this because you saved this search on Worldiqo. Manage or delete
        it any time from your alerts page.
      </p>
    </div>
  </div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
