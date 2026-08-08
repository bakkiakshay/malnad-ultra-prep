import { createSupabaseClient } from "@/lib/supabase";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const activityId = request.nextUrl.searchParams.get("activity_id");
  if (!activityId) {
    return Response.json({ error: "activity_id required" }, { status: 400 });
  }

  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("commentary")
      .select("*")
      .eq("activity_id", activityId)
      .maybeSingle();

    if (error) throw error;
    return Response.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { activity_id, feel_rating, shoes, nutrition, notes, tags } = body;

    if (!activity_id) {
      return Response.json({ error: "activity_id required" }, { status: 400 });
    }

    const supabase = createSupabaseClient();

    const { data: existing } = await supabase
      .from("commentary")
      .select("id")
      .eq("activity_id", activity_id)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from("commentary")
        .update({
          feel_rating,
          shoes,
          nutrition,
          notes,
          tags,
          updated_at: new Date().toISOString(),
        })
        .eq("activity_id", activity_id)
        .select()
        .single();

      if (error) throw error;
      return Response.json(data);
    } else {
      const { data, error } = await supabase
        .from("commentary")
        .insert({
          activity_id,
          feel_rating,
          shoes,
          nutrition,
          notes,
          tags,
        })
        .select()
        .single();

      if (error) throw error;
      return Response.json(data, { status: 201 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return Response.json({ error: message }, { status: 500 });
  }
}
