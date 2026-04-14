import { NextResponse } from "next/server";
import { query } from "@/lib/db";

interface BringItemInput {
  category: string;
  description?: string;
  slots?: number;
}

interface CreateItemsRequest {
  dinner_id: number;
  items: BringItemInput[];
}

export async function POST(request: Request) {
  try {
    const body: CreateItemsRequest = await request.json();
    const { dinner_id, items } = body;

    if (!dinner_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "dinner_id and items array are required" },
        { status: 400 }
      );
    }

    const createdItems = [];

    for (const item of items) {
      if (!item.category) {
        return NextResponse.json(
          { error: "Each item must have a category" },
          { status: 400 }
        );
      }

      const result = await query<{ id: number }>(
        `INSERT INTO bring_items (dinner_id, category, description, slots)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [dinner_id, item.category, item.description || null, item.slots || 1]
      );

      if (result && result.length > 0) {
        createdItems.push({
          id: result[0].id,
          category: item.category,
          description: item.description || null,
          slots: item.slots || 1,
        });
      }
    }

    return NextResponse.json({ items: createdItems });
  } catch (error) {
    console.error("Error creating bring items:", error);
    return NextResponse.json(
      { error: "Failed to create items" },
      { status: 500 }
    );
  }
}
