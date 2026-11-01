import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ErrorCode } from "@/contracts/api";
import { describeProblem } from "@/ui/problems";
import { Problem } from "./Problem";

function render(code: ErrorCode, retryAfterSeconds?: number): string {
  const html = renderToStaticMarkup(
    <Problem code={code} retryAfterSeconds={retryAfterSeconds} onRetry={() => {}} searchHref="/?q=matrix" />,
  );
  return html;
}

describe("Problem screen", () => {
  const codes: ErrorCode[] = ["invalid_query", "not_found", "rate_limited", "quota_reached", "provider_unavailable"];

  it.each(codes)("explains %s with its own title and a way back to search", (code) => {
    const html = render(code);

    expect(html).toContain('role="alert"');
    expect(html).toContain(describeProblem(code).title.replace("'", "&#x27;"));
    expect(html).toContain('href="/?q=matrix"');
  });

  it("offers Try again only when the data provider was unavailable", () => {
    const unavailable = render("provider_unavailable");
    const rateLimited = render("rate_limited", 300);

    expect(unavailable).toContain("Try again</button>");
    expect(rateLimited).not.toContain("</button>");
    expect(rateLimited).toContain("about 5 minutes");
  });
});
