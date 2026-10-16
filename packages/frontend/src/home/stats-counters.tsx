import type { Stats } from "@projet-igsn/domain/stats/model";

import { LayersIcon, UsersIcon } from "lucide-react";

import { m } from "#/paraglide/messages.js";
import { getLocale } from "#/paraglide/runtime.js";

export function StatsCounters({ samples, users }: Stats) {
  const number = new Intl.NumberFormat(getLocale());
  const counters = [
    {
      key: "samples",
      Icon: LayersIcon,
      value: samples,
      label: m.home_stats_samples(),
    },
    {
      key: "users",
      Icon: UsersIcon,
      value: users,
      label: m.home_stats_users(),
    },
  ];

  return (
    <ul
      aria-label={m.home_stats_label()}
      className="divide-primary/20 flex flex-col gap-y-4 md:flex-row md:flex-wrap md:divide-x md:pe-10"
    >
      {counters.map(({ key, Icon, value, label }) => (
        <li
          key={key}
          className="text-primary flex items-center gap-3 md:px-10 md:first:ps-0 md:last:pe-0"
        >
          <Icon aria-hidden className="size-8" />
          <span>
            <strong className="block text-xl">{number.format(value)}</strong>{" "}
            <span className="text-body text-sm">{label}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
