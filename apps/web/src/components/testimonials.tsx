import { Star } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

export type Testimonial = {
  name: string;
  role: string;
  text: string;
  rating: number;
};

/**
 * Landing testimonials: a clean responsive grid of review cards (1 / 2 / 3
 * columns). Every card is shown in full — no carousel peek/fade that could look
 * clipped or broken.
 */
export function Testimonials({
  title,
  items,
}: {
  title: string;
  items: Testimonial[];
}) {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-center text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">
          {title}
        </h2>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.name}
              className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-brand-200 hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <Avatar name={item.name} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-zinc-900">{item.name}</p>
                  <p className="truncate text-sm text-zinc-500">{item.role}</p>
                  <div className="mt-1 flex gap-0.5">
                    {Array.from({ length: 5 }, (_, s) => (
                      <Star
                        key={s}
                        size={15}
                        aria-hidden="true"
                        className={
                          s < item.rating
                            ? "fill-amber-400 text-amber-400"
                            : "fill-zinc-200 text-zinc-200"
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-zinc-600">
                {item.text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
