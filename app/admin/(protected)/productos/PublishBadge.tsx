/** Estado de publicación en la tienda: texto + color, nunca solo color. */
export function PublishBadge({ published }: { published: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        published
          ? "bg-admin-accent-wash text-admin-accent"
          : "bg-admin-surface-sunken text-admin-ink-secondary ring-1 ring-admin-border-strong"
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${published ? "bg-admin-accent" : "ring-1 ring-admin-ink-secondary"}`}
      />
      {published ? "Publicado" : "No publicado"}
    </span>
  );
}
