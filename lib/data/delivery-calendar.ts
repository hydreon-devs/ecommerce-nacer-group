import "server-only";
import {
  bogotaDate,
  buildDeliveryCalendar,
  DELIVERY_HORIZON_DAYS,
} from "@/lib/domain/checkout/deliveryCalendar";
import { createAdminClient } from "@/lib/supabase/admin-client";

/**
 * Dates offered for pickup / delivery, from `business_hours` (one row per open
 * weekday, 0 = Sunday) and `holidays`, read fresh on every request.
 *
 * `is_delivery_date` is the authority and is re-checked at order creation
 * (slice 4); this calendar only decides what the picker shows.
 */
export interface DeliveryCalendarData {
  /** Today's Bogotá date; the picker marks it but never offers it. */
  today: string;
  /** Selectable dates (the source of truth). */
  dates: string[];
  /** Holidays inside the horizon, only to explain why a day is not offered. */
  holidays: string[];
}

export async function getDeliveryCalendar(now: Date = new Date()): Promise<DeliveryCalendarData> {
  const supabase = createAdminClient();
  const today = bogotaDate(now);

  const [hoursRes, holidaysRes] = await Promise.all([
    supabase.from("business_hours").select("weekday"),
    supabase.from("holidays").select("holiday_date").gte("holiday_date", today),
  ]);
  if (hoursRes.error) throw hoursRes.error;
  if (holidaysRes.error) throw holidaysRes.error;

  const holidays = (holidaysRes.data ?? []).map((r) => String(r.holiday_date));
  const dates = buildDeliveryCalendar({
    today,
    businessWeekdays: (hoursRes.data ?? []).map((r) => Number(r.weekday)),
    holidays,
    horizonDays: DELIVERY_HORIZON_DAYS,
  });
  const last = dates[dates.length - 1] ?? today;
  return { today, dates, holidays: holidays.filter((h) => h <= last) };
}
