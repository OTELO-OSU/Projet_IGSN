import { m } from "#/paraglide/messages.js";

const PHOTO_ALTS = {
  "cave-shaft": m.photo_cave_shaft,
  "sediment-core": m.photo_sediment_core,
  "scree-sampling": m.photo_scree_sampling,
  "antarctic-micrometeorites": m.photo_antarctic_micrometeorites,
  "himalaya-moraine": m.photo_himalaya_moraine,
  "glacier-rock-sawing": m.photo_glacier_rock_sawing,
  "greenland-granite": m.photo_greenland_granite,
  "furnace-experiment": m.photo_furnace_experiment,
};

export type PhotoName = keyof typeof PHOTO_ALTS;

export const PHOTO_NAMES = Object.keys(PHOTO_ALTS) as PhotoName[];

export function Photo({
  name,
  className,
}: {
  name: PhotoName;
  className: string;
}) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}photos/${name}.jpg`}
      alt={PHOTO_ALTS[name]()}
      loading="lazy"
      className={`object-cover ${className}`}
    />
  );
}
