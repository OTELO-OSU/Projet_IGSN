import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@projet-igsn/design-system/components/ui/carousel";
import { useEffect, useState } from "react";

import { m } from "#/paraglide/messages.js";

import { PHOTO_NAMES, Photo } from "./photo.tsx";

const AUTOPLAY_INTERVAL_MS = 3000;

export function PhotoSlideshow() {
  const [api, setApi] = useState<CarouselApi>();
  const [pageCount, setPageCount] = useState(0);
  const [selectedPage, setSelectedPage] = useState(0);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isAdvancing = !isReducedMotion && !isHovered;

  useEffect(() => {
    setIsReducedMotion(matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (!api || !isAdvancing) return;
    const timer = setInterval(() => api.scrollNext(), AUTOPLAY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [api, isAdvancing]);

  useEffect(() => {
    if (!api) return;
    const onReInit = () => setPageCount(api.scrollSnapList().length);
    const onSelect = () => setSelectedPage(api.selectedScrollSnap());
    onReInit();
    onSelect();
    api.on("reInit", onReInit);
    api.on("reInit", onSelect);
    api.on("select", onSelect);
    return () => {
      api.off("reInit", onReInit);
      api.off("reInit", onSelect);
      api.off("select", onSelect);
    };
  }, [api]);

  return (
    <Carousel
      aria-label={m.home_photos_label()}
      className="w-full"
      opts={{ loop: true, align: "start", slidesToScroll: "auto" }}
      setApi={setApi}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      <CarouselContent>
        {PHOTO_NAMES.map((name) => (
          <CarouselItem key={name} className="basis-1/2 sm:basis-1/4">
            <Photo name={name} className="aspect-[4/7] w-full" />
          </CarouselItem>
        ))}
      </CarouselContent>
      <div className="mt-4 flex h-2.5 justify-center gap-2">
        {Array.from({ length: pageCount }, (_, page) => (
          <button
            key={page}
            type="button"
            aria-label={m.home_photos_page({ index: page + 1 })}
            aria-current={page === selectedPage ? "true" : undefined}
            onClick={() => api?.scrollTo(page)}
            className={`size-2.5 rounded-full ${page === selectedPage ? "bg-primary" : "bg-primary/25"}`}
          />
        ))}
      </div>
    </Carousel>
  );
}
