export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  req: Request,
  { params }: { params: { gear_id: string } }
) {
  try {
    const gear_id = params.gear_id;

    if (!gear_id) {
      return NextResponse.json(
        { error: "Missing gear_id" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Pobieramy tylko ostatnie 3 lata
    const { data, error } = await supabase
      .from("gear_price_history")
      .select("*")
      .eq("gear_id", gear_id)
      .gte("recorded_at", new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString())
      .order("recorded_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, history: data });
  } catch (err) {
    console.error("Price history error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
