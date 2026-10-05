import { lookup } from "node:dns";
import { BlockList, isIP, isIPv6, type LookupFunction } from "node:net";

import { envList } from "../env-list.ts";

const BLOCKED = new BlockList();
BLOCKED.addSubnet("0.0.0.0", 8, "ipv4");
BLOCKED.addSubnet("10.0.0.0", 8, "ipv4");
BLOCKED.addSubnet("100.64.0.0", 10, "ipv4");
BLOCKED.addSubnet("127.0.0.0", 8, "ipv4");
BLOCKED.addSubnet("169.254.0.0", 16, "ipv4");
BLOCKED.addSubnet("172.16.0.0", 12, "ipv4");
BLOCKED.addSubnet("192.0.0.0", 24, "ipv4");
BLOCKED.addSubnet("192.168.0.0", 16, "ipv4");
BLOCKED.addSubnet("198.18.0.0", 15, "ipv4");
BLOCKED.addSubnet("224.0.0.0", 4, "ipv4");
BLOCKED.addSubnet("240.0.0.0", 4, "ipv4");
BLOCKED.addAddress("::", "ipv6");
BLOCKED.addAddress("::1", "ipv6");
BLOCKED.addSubnet("64:ff9b::", 96, "ipv6");
BLOCKED.addSubnet("2002::", 16, "ipv6");
BLOCKED.addSubnet("fc00::", 7, "ipv6");
BLOCKED.addSubnet("fe80::", 10, "ipv6");
BLOCKED.addSubnet("ff00::", 8, "ipv6");

export const isPublicAddress = (address: string): boolean =>
  !BLOCKED.check(address, isIPv6(address) ? "ipv6" : "ipv4");

export const publicLookup: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error, "");
    if (!addresses.every(({ address }) => isPublicAddress(address))) {
      return callback(new Error(`${hostname} is not a public host`), "");
    }
    if (options.all) return callback(null, addresses);
    const [first] = addresses;
    callback(null, first?.address ?? "", first?.family);
  });
};

export const webhookTarget = (
  url: string,
): { url: URL; lookup: LookupFunction | undefined } | null => {
  const parsed = new URL(url);
  if (envList("WEBHOOK_DEV_HOSTS").includes(parsed.hostname)) {
    return { url: parsed, lookup: undefined };
  }
  const host = parsed.hostname.replace(/^\[(.*)\]$/, "$1");
  return parsed.protocol === "https:" &&
    (isIP(host) === 0 || isPublicAddress(host))
    ? { url: parsed, lookup: publicLookup }
    : null;
};
