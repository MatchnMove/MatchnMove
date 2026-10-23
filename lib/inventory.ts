import { z } from "zod";
export const INVENTORY_ROOMS = [
  "Bedroom",
  "Living Room",
  "Kitchen",
  "Laundry",
  "Outdoor / garage",
  "Other",
] as const;
export const INVENTORY_ITEMS = [
  ["double-bed", "Double Bed", "Bedroom"],
  ["king-bed", "King Bed", "Bedroom"],
  ["bedside-table", "Bedside Table", "Bedroom"],
  ["dresser", "Dresser", "Bedroom"],
  ["mattress", "Mattress", "Bedroom"],
  ["wardrobe", "Wardrobe", "Bedroom"],
  ["sofa", "Sofa (3 Seater)", "Living Room"],
  ["tv-unit", "TV Unit", "Living Room"],
  ["armchair", "Armchair", "Living Room"],
  ["coffee-table", "Coffee table", "Living Room"],
  ["shelving", "Shelving", "Living Room"],
  ["fridge", "Fridge", "Kitchen"],
  ["freezer", "Freezer", "Kitchen"],
  ["dining-table", "Dining Table", "Kitchen"],
  ["dining-chairs", "Dining chairs", "Kitchen"],
  ["boxes", "Boxes", "Kitchen"],
  ["washing-machine", "Washing Machine", "Laundry"],
  ["dryer", "Dryer", "Laundry"],
  ["outdoor-furniture", "Outdoor furniture", "Outdoor / garage"],
  ["garage-items", "Garage items", "Outdoor / garage"],
  ["heavy-items", "Special or heavy items", "Other"],
] as const;
export const inventorySchema = z
  .array(
    z
      .object({
        id: z.string().trim().min(1).max(80),
        label: z.string().trim().min(1).max(100),
        room: z.enum(INVENTORY_ROOMS),
        quantity: z.number().int().min(1).max(200),
        notes: z.string().trim().max(400).default(""),
      })
      .strict(),
  )
  .max(100)
  .refine(
    (items) => new Set(items.map((item) => item.id)).size === items.length,
    "Inventory item IDs must be unique.",
  );
export type InventoryItem = z.infer<typeof inventorySchema>[number];
export function inventorySummary(items: InventoryItem[]) {
  return items
    .map(
      (item) =>
        item.room +
        ": " +
        item.label +
        " x" +
        item.quantity +
        (item.notes ? " (" + item.notes + ")" : ""),
    )
    .join("\n");
}
