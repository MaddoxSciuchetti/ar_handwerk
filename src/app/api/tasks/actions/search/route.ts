import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { searchItemPricesForTask } from "@/lib/tavily";
import { taskNeedsPurchase, type Task } from "@/lib/tasks";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { task?: Task; query?: string };
    if (!body.task?.id || !body.task?.title) {
      return NextResponse.json({ error: "A valid task is required" }, { status: 400 });
    }

    const query = body.query?.trim();
    if (!query && !taskNeedsPurchase(body.task)) {
      return NextResponse.json(
        { error: "A search query or purchasable item is required" },
        { status: 400 },
      );
    }

    const result = await searchItemPricesForTask(body.task, query);

    return NextResponse.json({
      type: "purchase-search" as const,
      purchaseSearch: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
