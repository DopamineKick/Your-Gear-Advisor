export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const { queryHash, productIds } = await req.json();

    if (!queryHash || !Array.isArray(productIds)) {
      return NextResponse.json(
        { error: "Missing queryHash or productIds" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("ai_match_reasons")
      .select("product_id, reason")
      .eq("query_hash", queryHash)
      .in("product_id", productIds);

    if (error) {
      console.error("Error fetching reasoning:", error);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    return NextResponse.json({ results: data ?? [] });
  } catch (err) {
    console.error("Error in /api/reasoning/poll:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
