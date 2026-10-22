import {
  STATIC_MAP_HEIGHT,
  STATIC_MAP_WIDTH,
  staticMapUrl,
} from "@/lib/domain/checkout/staticMap";

/**
 * Static Google map with a marker on the resolved address. Uses the BROWSER key
 * (referrer-restricted in Google Cloud), which is public by design. Without it,
 * the resolved address in the surrounding text is the whole confirmation.
 * Explicit width/height + aspect ratio reserve the space (no CLS).
 */
export function DeliveryMap({
  resolvedAddress,
  browserKey,
}: {
  resolvedAddress: string;
  browserKey: string | null;
}) {
  const url = staticMapUrl(resolvedAddress, browserKey ?? undefined);
  if (!url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Google Static Maps: dynamic per address, already an optimized image; not an asset next/image can pre-optimize
    <img
      src={url}
      width={STATIC_MAP_WIDTH}
      height={STATIC_MAP_HEIGHT}
      alt={`Mapa con la ubicación de ${resolvedAddress}`}
      loading="lazy"
      decoding="async"
      referrerPolicy="origin"
      className="aspect-[2/1] w-full rounded-xl border border-ink/10 object-cover"
    />
  );
}
