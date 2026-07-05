import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const ink = "#14110c";
const brass = "#b08422";
const cream = "#f4efe4";

export default async function SelectOrgPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // orgs this user can see (RLS scopes to their memberships)
  const { data: orgs } = await supabase
    .from("orgs")
    .select("id, name, legal_name, entity_type")
    .order("name");

  return (
    <main style={{ minHeight: "100vh", background: ink, padding: "3rem 1.5rem", fontFamily: "ui-serif, Georgia, serif" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
          <div style={{ fontSize: 24, fontWeight: 600, color: cream }}>Burn Industry Pocket</div>
          <form action="/auth/signout" method="post">
            <button style={{ background: "none", border: "none", color: brass, fontSize: 13, cursor: "pointer", fontFamily: "ui-monospace, monospace" }}>
              sign out
            </button>
          </form>
        </div>
        <div style={{ height: 1, background: brass, opacity: 0.4, margin: "1rem 0 2rem" }} />
        <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "#8a7d61", marginBottom: 16, fontFamily: "ui-monospace, monospace" }}>
          Select ledger
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(orgs ?? []).map((org) => (
            <Link
              key={org.id}
              href={`/dashboard?org=${org.id}`}
              style={{
                display: "block",
                background: cream,
                border: `1px solid ${brass}`,
                borderRadius: 4,
                padding: "1.25rem 1.5rem",
                textDecoration: "none",
              }}
            >
              <div style={{ fontSize: 19, fontWeight: 600, color: ink }}>{org.name}</div>
              <div style={{ fontSize: 13, color: "#6b6250", marginTop: 2 }}>
                {org.legal_name} · {org.entity_type}
              </div>
            </Link>
          ))}

          {(!orgs || orgs.length === 0) && (
            <div style={{ color: "#8a7d61", fontSize: 14, lineHeight: 1.6 }}>
              No ledgers found for this account. If you just set up the database, make sure your
              user is added to <code style={{ color: brass }}>org_members</code> for each org.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
