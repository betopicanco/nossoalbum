"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import AutoPauseVideo from "./auto-pause-video";

type CarouselItem = {
  id: string;
  src: string;
  type: "image" | "video";
  location: string | null;
  description: string | null;
};

type PostCarouselProps = {
  items: CarouselItem[];
};

export default function PostCarousel({ items }: PostCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const activeItem = useMemo(() => items[activeIndex] ?? items[0], [activeIndex, items]);

  if (!activeItem) {
    return null;
  }

  const hasMultipleItems = items.length > 1;

  const goPrevious = () => {
    setActiveIndex((current) => (current === 0 ? items.length - 1 : current - 1));
  };

  const goNext = () => {
    setActiveIndex((current) => (current === items.length - 1 ? 0 : current + 1));
  };

  return (
    <>
      <div className="relative w-full bg-zinc-950">
        {activeItem.location ? (
          <div className="absolute left-3 top-3 z-10 rounded bg-black/60 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
            {activeItem.location}
          </div>
        ) : null}

        {hasMultipleItems ? (
          <div className="absolute right-3 top-3 z-10 rounded-full bg-black/60 px-2 py-1 text-xs text-zinc-200 backdrop-blur-sm">
            {activeIndex + 1}/{items.length}
          </div>
        ) : null}

        {activeItem.type === "image" ? (
          <Image
            src={activeItem.src}
            alt="Foto do álbum"
            width={680}
            height={900}
            priority={activeIndex === 0}
            className="h-auto w-full"
            sizes="(max-width: 768px) 100vw, 680px"
          />
        ) : (
          <AutoPauseVideo src={activeItem.src} className="h-full w-full object-cover" />
        )}

        {hasMultipleItems ? (
          <>
            <button
              type="button"
              onClick={goPrevious}
              aria-label="Conteúdo anterior"
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 px-2 py-1 text-sm text-zinc-100 backdrop-blur-sm"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Próximo conteúdo"
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 px-2 py-1 text-sm text-zinc-100 backdrop-blur-sm"
            >
              ›
            </button>
          </>
        ) : null}
      </div>

      {hasMultipleItems ? (
        <div className="flex items-center justify-center gap-1 py-2">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Ir para item ${index + 1}`}
              className={`h-1.5 w-1.5 rounded-full ${
                index === activeIndex ? "bg-zinc-100" : "bg-zinc-600"
              }`}
            />
          ))}
        </div>
      ) : null}

      <div className="space-y-1 px-4 py-3 text-sm">
        {activeItem.description ? <p className="text-zinc-200">{activeItem.description}</p> : null}
      </div>
    </>
  );
}
