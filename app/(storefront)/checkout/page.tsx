import type { Metadata } from "next";
import { connection } from "next/server";
import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";
import { getDeliveryCalendar, type DeliveryCalendarData } from "@/lib/data/delivery-calendar";

export const metadata: Metadata = {
  title: "Finalizar pedido — Crisálidas y Mariposas",
  robots: { index: false },
};

/**
 * Checkout step 1 (Entrega). Server Component: it builds the delivery calendar
 * fresh on every request (today in Bogotá, `business_hours`, `holidays`) and
 * hands it to the client leaf. `connection()` opts the route out of
 * prerendering, since the calendar depends on the current date.
 */
export default async function CheckoutPage() {
  await connection();

  let calendar: DeliveryCalendarData = { today: "", dates: [], holidays: [] };
  let calendarFailed = false;
  try {
    calendar = await getDeliveryCalendar();
  } catch (error) {
    console.error("getDeliveryCalendar failed", error);
    calendarFailed = true;
  }

  // Referrer-restricted browser key for the static map; absent -> text only.
  const mapsBrowserKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY?.trim() || null;

  return (
    // Mobile: top padding clears the floating header pill only; bottom padding
    // clears the fixed order-summary bar (see OrderSummary).
    <main className="flex flex-1 flex-col px-4 pt-20 pb-48 sm:px-6 md:px-16 md:pt-28 lg:pb-16">
      <div className="mx-auto w-full max-w-6xl">
        <CheckoutFlow
          calendar={calendar}
          calendarFailed={calendarFailed}
          mapsBrowserKey={mapsBrowserKey}
        />
      </div>
    </main>
  );
}
