import { define } from "../../utils.ts";

export const handler = define.handlers({
  GET() {
    const interfaces = Deno.networkInterfaces();

    // Find IPv6 addresses (excluding link-local fe80::)
    const ipv6Addresses: string[] = [];

    for (const iface of interfaces) {
      if (
        iface.family === "IPv6" &&
        !iface.address.startsWith("fe80:") &&
        !iface.address.startsWith("::1")
      ) {
        ipv6Addresses.push(iface.address);
      }
    }

    // Return the first global IPv6 address found, or null if none
    const address = ipv6Addresses.length > 0 ? ipv6Addresses[0] : null;

    return new Response(
      JSON.stringify({
        success: address !== null,
        address,
        allAddresses: ipv6Addresses,
        error: address === null ? "No global IPv6 address found" : undefined,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  },
});
