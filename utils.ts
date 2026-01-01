import { createDefine } from "fresh";

export interface State {
  shared: string;
}

export const define = createDefine<State>();

export interface IPv6Result {
  success: boolean;
  operation: "convert" | "cidr-check";
  input: string;
  cidrRange?: string;
  result?: string;
  isInRange?: boolean;
  error?: string;
  details?: IPv6Details;
}

export interface IPv6Details {
  fullAddress: string;
  compressedAddress: string;
  networkAddress?: string;
  prefixLength?: number;
  firstAddress?: string;
  lastAddress?: string;
  totalAddresses?: string;
}

// IPv6 CIDR prefix options
export const IPv6Prefixes = [
  { value: "128", label: "/128 (Single host)" },
  { value: "127", label: "/127 (Point-to-point)" },
  { value: "126", label: "/126 (4 addresses)" },
  { value: "120", label: "/120 (256 addresses)" },
  { value: "112", label: "/112 (65,536 addresses)" },
  { value: "64", label: "/64 (Standard subnet)" },
  { value: "56", label: "/56 (256 /64 subnets)" },
  { value: "48", label: "/48 (65,536 /64 subnets)" },
  { value: "32", label: "/32 (ISP allocation)" },
];

// Expand IPv6 address to full form
export function expandIPv6(address: string): string | null {
  address = address.trim();

  const parts = address.split("::");

  if (parts.length > 2) {
    return null;
  }

  let groups: string[] = [];

  if (parts.length === 2) {
    const left = parts[0] ? parts[0].split(":") : [];
    const right = parts[1] ? parts[1].split(":") : [];
    const missing = 8 - left.length - right.length;

    if (missing < 0) {
      return null;
    }

    groups = [...left, ...Array(missing).fill("0"), ...right];
  } else {
    groups = address.split(":");
  }

  if (groups.length !== 8) {
    return null;
  }

  const expanded = groups.map((group) => {
    if (!/^[0-9a-fA-F]{0,4}$/.test(group)) {
      return null;
    }
    return group.padStart(4, "0").toLowerCase();
  });

  if (expanded.includes(null)) {
    return null;
  }

  return expanded.join(":");
}

// Compress IPv6 address to shortest form
export function compressIPv6(fullAddress: string): string {
  const groups = fullAddress.split(":");
  const simplified = groups.map((g) => g.replace(/^0+/, "") || "0");

  let longestStart = -1;
  let longestLen = 0;
  let currentStart = -1;
  let currentLen = 0;

  for (let i = 0; i < simplified.length; i++) {
    if (simplified[i] === "0") {
      if (currentStart === -1) {
        currentStart = i;
        currentLen = 1;
      } else {
        currentLen++;
      }
    } else {
      if (currentLen > longestLen) {
        longestStart = currentStart;
        longestLen = currentLen;
      }
      currentStart = -1;
      currentLen = 0;
    }
  }

  if (currentLen > longestLen) {
    longestStart = currentStart;
    longestLen = currentLen;
  }

  if (longestLen > 1) {
    const before = simplified.slice(0, longestStart);
    const after = simplified.slice(longestStart + longestLen);

    if (before.length === 0 && after.length === 0) {
      return "::";
    } else if (before.length === 0) {
      return "::" + after.join(":");
    } else if (after.length === 0) {
      return before.join(":") + "::";
    } else {
      return before.join(":") + "::" + after.join(":");
    }
  }

  return simplified.join(":");
}

// Convert IPv6 address to BigInt
export function ipv6ToBigInt(fullAddress: string): bigint {
  const groups = fullAddress.split(":");
  let result = 0n;

  for (const group of groups) {
    result = (result << 16n) | BigInt(parseInt(group, 16));
  }

  return result;
}

// Convert BigInt to IPv6 address
export function bigIntToIPv6(value: bigint): string {
  const groups: string[] = [];

  for (let i = 0; i < 8; i++) {
    groups.unshift((value & 0xffffn).toString(16).padStart(4, "0"));
    value >>= 16n;
  }

  return groups.join(":");
}

// Calculate network address from IPv6 and prefix length
export function getNetworkAddress(
  fullAddress: string,
  prefixLength: number
): string {
  const addressInt = ipv6ToBigInt(fullAddress);
  const mask =
    ((1n << BigInt(prefixLength)) - 1n) << BigInt(128 - prefixLength);
  const networkInt = addressInt & mask;
  return bigIntToIPv6(networkInt);
}

// Calculate first usable address in range
export function getFirstAddress(
  fullAddress: string,
  prefixLength: number
): string {
  return getNetworkAddress(fullAddress, prefixLength);
}

// Calculate last address in range
export function getLastAddress(
  fullAddress: string,
  prefixLength: number
): string {
  const networkInt = ipv6ToBigInt(getNetworkAddress(fullAddress, prefixLength));
  const hostBits = 128 - prefixLength;
  const lastInt = networkInt | ((1n << BigInt(hostBits)) - 1n);
  return bigIntToIPv6(lastInt);
}

// Calculate total addresses in range
export function getTotalAddresses(prefixLength: number): string {
  const hostBits = 128 - prefixLength;
  const total = 1n << BigInt(hostBits);

  if (total > 1000000n) {
    return `2^${hostBits}`;
  }
  return total.toString();
}

// Check if IPv6 address is within CIDR range
export function isInCIDRRange(
  address: string,
  cidrRange: string
): { inRange: boolean; error?: string } {
  const [rangeAddress, prefixStr] = cidrRange.split("/");

  if (!prefixStr) {
    return {
      inRange: false,
      error: "Invalid CIDR notation. Use format: address/prefix",
    };
  }

  const prefixLength = parseInt(prefixStr, 10);

  if (isNaN(prefixLength) || prefixLength < 0 || prefixLength > 128) {
    return { inRange: false, error: "Prefix length must be between 0 and 128" };
  }

  const expandedAddress = expandIPv6(address);
  const expandedRange = expandIPv6(rangeAddress);

  if (!expandedAddress) {
    return { inRange: false, error: "Invalid IPv6 address" };
  }

  if (!expandedRange) {
    return { inRange: false, error: "Invalid IPv6 range address" };
  }

  const addressNetwork = getNetworkAddress(expandedAddress, prefixLength);
  const rangeNetwork = getNetworkAddress(expandedRange, prefixLength);

  return { inRange: addressNetwork === rangeNetwork };
}

// Parse and validate IPv6 address
export function parseIPv6(address: string): IPv6Details | null {
  const expanded = expandIPv6(address);

  if (!expanded) {
    return null;
  }

  return {
    fullAddress: expanded,
    compressedAddress: compressIPv6(expanded),
  };
}

// Parse and validate IPv6 CIDR
export function parseIPv6CIDR(
  address: string,
  prefixLength: number
): IPv6Details | null {
  const expanded = expandIPv6(address);

  if (!expanded) {
    return null;
  }

  const networkAddress = getNetworkAddress(expanded, prefixLength);

  return {
    fullAddress: expanded,
    compressedAddress: compressIPv6(expanded),
    networkAddress: compressIPv6(networkAddress),
    prefixLength,
    firstAddress: compressIPv6(getFirstAddress(expanded, prefixLength)),
    lastAddress: compressIPv6(getLastAddress(expanded, prefixLength)),
    totalAddresses: getTotalAddresses(prefixLength),
  };
}
