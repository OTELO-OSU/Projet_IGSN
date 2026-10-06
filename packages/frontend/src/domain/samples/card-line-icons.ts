import type { LucideIcon } from "lucide-react";

import {
  FlaskConicalIcon,
  GraduationCapIcon,
  HourglassIcon,
  LayersIcon,
  MapPinIcon,
  MountainIcon,
  PickaxeIcon,
  ShapesIcon,
  UserIcon,
} from "lucide-react";

export const CARD_LINE_ICONS: Record<string, LucideIcon> = {
  typeNature: ShapesIcon,
  material: MountainIcon,
  location: MapPinIcon,
  collectorName: UserIcon,
  collectionMethod: PickaxeIcon,
  researchProgramName: FlaskConicalIcon,
  chiefScientist: GraduationCapIcon,
  numericAge: HourglassIcon,
  geologicalAge: LayersIcon,
};
