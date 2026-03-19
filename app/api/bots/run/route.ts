export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addMinutes(date: Date, minutes: number): string {
  return new Date(date.getTime() + minutes * 60 * 1000).toISOString();
}

// Endpoint wywoływany przez Vercel Cron co 15 minut
export async function GET(request: NextRequest) {
  // Zabezpieczenie: Vercel Cron przesyła nagłówek Authorization: Bearer CRON_SECRET
  const authHeader = request.headers.get("Authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const now = new Date();

  // Pobierz aktywne boty z zaległym harmonogramem
  const { data: bots } = await supabase
    .from("profiles")
    .select("id, nick, bot_config, next_post_at, next_reply_at")
    .eq("is_bot", true)
    .filter("bot_config->is_active", "eq", true);

  if (!bots || bots.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let processed = 0;

  for (const bot of bots) {
    const cfg = bot.bot_config as any;
    if (!cfg) continue;

    // --- Nowy post ---
    const postCfg = cfg.scheduling?.new_post;
    if (
      postCfg?.enabled &&
      bot.next_post_at &&
      new Date(bot.next_post_at) <= now
    ) {
      try {
        const topicsStr = (cfg.topics ?? []).join(", ") || "gitary, sprzęt gitarowy";
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: cfg.system_prompt },
            {
              role: "user",
              content: `Napisz nowy post na forum gitarowym. Wybierz jeden temat z: ${topicsStr}. Zwróć JSON: {"title": "...", "content": "..."}. Tytuł max 80 znaków, treść 50–250 znaków. Pisz po polsku.`,
            },
          ],
          max_tokens: 400,
          temperature: 0.9,
        });

        const raw = completion.choices[0].message.content ?? "{}";
        const { title, content } = JSON.parse(raw);

        if (title && content) {
          const { data: post } = await supabase
            .from("posts")
            .insert({ author_id: bot.id, title, content, status: "approved" })
            .select()
            .single();

          if (post) {
            await supabase.from("bot_activity_log").insert({
              bot_id: bot.id,
              action_type: "post",
              target_id: post.id,
              content: `[${title}] ${content.slice(0, 80)}`,
            });
            processed++;
          }
        }
      } catch (e) {
        console.error(`Bot ${bot.nick} post error:`, e);
      }

      // Ustaw następny post za losowy czas
      const minH = postCfg.min_delay_hours ?? 24;
      const maxH = postCfg.max_delay_hours ?? 96;
      const delayMinutes = randomBetween(minH * 60, maxH * 60);
      await supabase
        .from("profiles")
        .update({ next_post_at: addMinutes(now, delayMinutes) })
        .eq("id", bot.id);
    }

    // --- Odpowiedź na komentarz ---
    const replyCfg = cfg.scheduling?.reply;
    if (
      replyCfg?.enabled &&
      bot.next_reply_at &&
      new Date(bot.next_reply_at) <= now
    ) {
      const probability = replyCfg.reply_probability ?? 0.4;

      if (Math.random() < probability) {
        try {
          // Pobierz losowy zatwierdzony post bez odpowiedzi bota
          const { data: posts } = await supabase
            .from("posts")
            .select("id, title, content")
            .eq("status", "approved")
            .order("created_at", { ascending: false })
            .limit(20);

          if (posts && posts.length > 0) {
            // Filtruj posty gdzie bot jeszcze nie komentował
            const { data: botComments } = await supabase
              .from("comments")
              .select("post_id")
              .eq("author_id", bot.id);

            const commentedIds = new Set((botComments ?? []).map((c: any) => c.post_id));
            const eligible = posts.filter((p: any) => !commentedIds.has(p.id));

            if (eligible.length > 0) {
              const target = eligible[randomBetween(0, eligible.length - 1)];

              const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                  { role: "system", content: cfg.system_prompt },
                  {
                    role: "user",
                    content: `Napisz krótki komentarz (30–150 znaków) do tego posta na forum gitarowym:\n\nTytuł: ${target.title}\nTreść: ${target.content}\n\nTylko treść komentarza, bez cudzysłowów.`,
                  },
                ],
                max_tokens: 200,
                temperature: 0.92,
              });

              const comment = completion.choices[0].message.content?.trim();
              if (comment) {
                await supabase.from("comments").insert({
                  post_id: target.id,
                  author_id: bot.id,
                  content: comment,
                  status: "approved",
                });
                await supabase.from("bot_activity_log").insert({
                  bot_id: bot.id,
                  action_type: "comment",
                  target_id: target.id,
                  content: comment.slice(0, 150),
                });
                processed++;
              }
            }
          }
        } catch (e) {
          console.error(`Bot ${bot.nick} reply error:`, e);
        }
      }

      // Ustaw następne sprawdzenie
      const minM = replyCfg.min_delay_minutes ?? 60;
      const maxM = replyCfg.max_delay_minutes ?? 1440;
      const delayMinutes = randomBetween(minM, maxM);
      await supabase
        .from("profiles")
        .update({ next_reply_at: addMinutes(now, delayMinutes) })
        .eq("id", bot.id);
    }
  }

  return NextResponse.json({ ok: true, processed, bots_checked: bots.length });
}
