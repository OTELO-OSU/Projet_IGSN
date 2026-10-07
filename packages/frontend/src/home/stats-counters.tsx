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
      className="divide-primary/20 mt-8 flex flex-wrap gap-y-4 divide-x"
    >
      {counters.map(({ key, Icon, value, label }) => (
        <li
          key={key}
          className="text-primary flex items-center gap-3 px-10 first:ps-0 last:pe-0"
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
