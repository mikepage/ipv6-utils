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

export const handler = define.handlers({
  GET() {
    const interfaces = Deno.networkInterfaces();

    const globalAddresses: string[] = [];
    const otherAddresses: string[] = [];

    for (const iface of interfaces) {
      if (iface.family !== "IPv6") continue;

      const addr = iface.address;

      // Skip link-local and loopback
      if (addr.startsWith("fe80:") || addr === "::1") continue;

      // Skip ULA (private) addresses
      if (isULA(addr)) continue;

      // Prioritize global unicast addresses
      if (isGlobalUnicast(addr)) {
        globalAddresses.push(addr);
      } else {
        otherAddresses.push(addr);
      }
    }

    // Prefer global addresses, fall back to other non-private addresses
    const allAddresses = [...globalAddresses, ...otherAddresses];
    const address = allAddresses.length > 0 ? allAddresses[0] : null;

    return new Response(
      JSON.stringify({
        success: address !== null,
        address,
        allAddresses,
        error: address === null ? "No global IPv6 address found" : undefined,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  },
});
