/** Static map size in CSS pixels; the image is requested at 2x. Shared with the <img> dimensions. */
export const STATIC_MAP_WIDTH = 640;
export const STATIC_MAP_HEIGHT = 320;

/**
 * Google Static Maps URL with a marker on the address Google resolved.
 * The key is the BROWSER key (`NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY`), meant to
 * be restricted by HTTP referrer in Google Cloud. Without a key (or address)
 * returns null and the UI shows text only.
 */
export function staticMapUrl(
  resolvedAddress: string,
  browserKey: string | undefined,
): string | null {
  const address = resolvedAddress.trim();
  const key = browserKey?.trim();
  if (!address || !key) return null;
  const params = new URLSearchParams({
    size: `${STATIC_MAP_WIDTH}x${STATIC_MAP_HEIGHT}`,
    scale: "2",
    zoom: "16",
    maptype: "roadmap",
    markers: `color:green|${address}`,
    key,
  });
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}
