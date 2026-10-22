import { splitEmails } from "@/lib/splitEmails";
import type { LegalBlock, LegalDocument as LegalDocumentData } from "@/lib/content/legal";

interface LegalDocumentProps {
  document: LegalDocumentData;
}

/**
 * Vista de lectura para textos legales (privacidad, términos). Presentacional
 * y sin estado: el texto llega como dato de `lib/content/legal.ts` y aquí solo
 * se maqueta, para que ambas páginas compartan una única tipografía de lectura.
 *
 * `pt-36 md:pt-44` despeja el header flotante (`fixed`), igual que
 * `ComingSoon`. El ancho se limita a ~70ch: más ancho cansa en textos largos.
 */
export function LegalDocument({ document }: LegalDocumentProps) {
  return (
    <main className="flex-1 px-6 pt-36 pb-24 md:px-16 md:pt-44 md:pb-32">
      <article className="mx-auto w-full max-w-[70ch]">
        <h1 className="font-display text-4xl leading-tight text-ink md:text-5xl">
          {document.title}
        </h1>

        {document.sections.map((section) => (
          <section key={section.heading} className="mt-12">
            <h2 className="font-display text-xl leading-snug text-ink md:text-2xl">
              {section.heading}
            </h2>
            <div className="mt-4 space-y-4">
              {section.blocks.map((block, index) => (
                <Block key={index} block={block} />
              ))}
            </div>
          </section>
        ))}
      </article>
    </main>
  );
}

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === "string") {
    return (
      <p className="font-body text-base leading-relaxed text-ink/80">
        <LinkedText text={block} />
      </p>
    );
  }
  return (
    <ul className="list-disc space-y-2 pl-5 font-body text-base leading-relaxed text-ink/80 marker:text-moss">
      {block.list.map((item) => (
        <li key={item}>
          <LinkedText text={item} />
        </li>
      ))}
    </ul>
  );
}

/** Pinta los correos del texto como `mailto:`; el resto queda tal cual. */
function LinkedText({ text }: { text: string }) {
  return splitEmails(text).map((part, index) =>
    part.type === "email" ? (
      <a
        key={index}
        href={`mailto:${part.value}`}
        className="text-moss underline underline-offset-2 transition-colors duration-200 hover:text-moss-deep"
      >
        {part.value}
      </a>
    ) : (
      part.value
    ),
  );
}
