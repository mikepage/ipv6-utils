import { define } from "../../utils.ts";

// Check if IPv6 is a global unicast address (2000::/3)
function isGlobalUnicast(address: string): boolean {
  const firstChar = address.charAt(0).toLowerCase();
  return firstChar === "2" || firstChar === "3";
}

// Check if IPv6 is a private/ULA address (fc00::/7)
function isULA(address: string): boolean {
  const prefix = address.slice(0, 2).toLowerCase();
  return prefix === "fc" || prefix === "fd";
}

// Check if address is link-local or loopback
function isLinkLocalOrLoopback(address: string): boolean {
  return address.startsWith("fe80:") || address === "::1";
}

// Check if string is a valid IPv6 address (basic check)
function isIPv6(address: string): boolean {
  return address.includes(":");
}

// Extract the best IPv6 from a list of IPs
function extractBestIPv6(ips: string[]): string | null {
  const globalAddresses: string[] = [];
  const otherAddresses: string[] = [];

  for (const ip of ips) {
    const addr = ip.trim();

    if (!isIPv6(addr)) continue;
    if (isLinkLocalOrLoopback(addr)) continue;
    if (isULA(addr)) continue;

    if (isGlobalUnicast(addr)) {
      globalAddresses.push(addr);
    } else {
      otherAddresses.push(addr);
    }
  }

  const allValid = [...globalAddresses, ...otherAddresses];
  return allValid.length > 0 ? allValid[0] : null;
}

export const handler = define.handlers({
  GET(ctx) {
    const headers = ctx.req.headers;

    // Check common proxy headers for client IP (first = original client)
    const forwardedFor = headers.get("x-forwarded-for");
    const realIp = headers.get("x-real-ip");
    const cfConnectingIp = headers.get("cf-connecting-ip");
    const trueClientIp = headers.get("true-client-ip");

    const candidates: string[] = [];

    // X-Forwarded-For can contain multiple IPs, first is the client
    if (forwardedFor) {
      candidates.push(...forwardedFor.split(",").map((ip) => ip.trim()));
    }

    if (cfConnectingIp) candidates.push(cfConnectingIp.trim());
    if (trueClientIp) candidates.push(trueClientIp.trim());
    if (realIp) candidates.push(realIp.trim());

    // Try to get the best IPv6 from headers
    let address = extractBestIPv6(candidates);

    // If no valid IPv6 found in headers, try connection info
    if (!address) {
      // Fallback: check server's network interfaces (for local development)
      const interfaces = Deno.networkInterfaces();
      const interfaceIps = interfaces
        .filter((iface) => iface.family === "IPv6")
        .map((iface) => iface.address);

      address = extractBestIPv6(interfaceIps);
    }

    return new Response(
      JSON.stringify({
        success: address !== null,
        address,
        source: candidates.length > 0 ? "client-request" : "server-interface",
        error: address === null ? "No global IPv6 address found" : undefined,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  },
});
