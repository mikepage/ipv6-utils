import { useSignal } from "@preact/signals";
import {
  IPv6Prefixes,
  parseIPv6CIDR,
  isInCIDRRange,
  type IPv6Details,
} from "../utils.ts";

export default function IPv6Utils() {
  const ipv6Address = useSignal("");
  const prefixLength = useSignal("64");
  const cidrRange = useSignal("");
  const convertResult = useSignal<IPv6Details | null>(null);
  const cidrResult = useSignal<{
    inRange: boolean;
    error?: string;
  } | null>(null);
  const convertError = useSignal<string | null>(null);
  const isLoadingMyIPv6 = useSignal(false);

  const handleConvert = () => {
    convertError.value = null;
    convertResult.value = null;

    if (!ipv6Address.value.trim()) {
      convertError.value = "Please enter an IPv6 address";
      return;
    }

    const result = parseIPv6CIDR(
      ipv6Address.value.trim(),
      parseInt(prefixLength.value, 10)
    );

    if (!result) {
      convertError.value = "Invalid IPv6 address format";
      return;
    }

    convertResult.value = result;
  };

  const handleCIDRCheck = () => {
    cidrResult.value = null;

    if (!ipv6Address.value.trim()) {
      cidrResult.value = { inRange: false, error: "Please enter an IPv6 address" };
      return;
    }

    if (!cidrRange.value.trim()) {
      cidrResult.value = { inRange: false, error: "Please enter a CIDR range" };
      return;
    }

    const result = isInCIDRRange(ipv6Address.value.trim(), cidrRange.value.trim());
    cidrResult.value = result;
  };

  const handleClear = () => {
    ipv6Address.value = "";
    prefixLength.value = "64";
    cidrRange.value = "";
    convertResult.value = null;
    cidrResult.value = null;
    convertError.value = null;
  };

  const handleUseMyIPv6 = async () => {
    isLoadingMyIPv6.value = true;
    convertError.value = null;

    try {
      const response = await fetch("/api/my-ipv6");
      const data = await response.json();

      if (data.success && data.address) {
        ipv6Address.value = data.address;
      } else {
        convertError.value = data.error || "No IPv6 address found";
      }
    } catch {
      convertError.value = "Failed to fetch IPv6 address";
    } finally {
      isLoadingMyIPv6.value = false;
    }
  };

  return (
    <div class="w-full">
      {/* Input Section */}
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-800 mb-4">IPv6 Address</h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              IPv6 Address
            </label>
            <input
              type="text"
              value={ipv6Address.value}
              onInput={(e) =>
                (ipv6Address.value = (e.target as HTMLInputElement).value)
              }
              placeholder="2001:db8::1"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Prefix Length
            </label>
            <select
              value={prefixLength.value}
              onChange={(e) =>
                (prefixLength.value = (e.target as HTMLSelectElement).value)
              }
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {IPv6Prefixes.map((prefix) => (
                <option key={prefix.value} value={prefix.value}>
                  {prefix.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">
            CIDR Range (for range check)
          </label>
          <input
            type="text"
            value={cidrRange.value}
            onInput={(e) =>
              (cidrRange.value = (e.target as HTMLInputElement).value)
            }
            placeholder="2001:db8::/32"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          />
        </div>

        {/* Action Buttons */}
        <div class="flex flex-wrap gap-3">
          <button
            onClick={handleConvert}
            disabled={!ipv6Address.value.trim()}
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Convert IPv6 to CIDR
          </button>
          <button
            onClick={handleCIDRCheck}
            disabled={!ipv6Address.value.trim() || !cidrRange.value.trim()}
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Check if in CIDR Range
          </button>
          <button
            onClick={handleClear}
            class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            Clear
          </button>
          <button
            onClick={handleUseMyIPv6}
            disabled={isLoadingMyIPv6.value}
            class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoadingMyIPv6.value ? "Loading..." : "Use My IPv6"}
          </button>
        </div>
      </div>

      {/* Convert Error */}
      {convertError.value && (
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p class="text-red-600">{convertError.value}</p>
        </div>
      )}

      {/* Convert Results */}
      {convertResult.value && (
        <div class="bg-white rounded-lg shadow p-6 mb-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">
            Address Details
          </h3>

          <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span class="text-sm text-gray-500">Full Address</span>
                <p class="font-mono text-sm bg-gray-50 p-2 rounded mt-1 break-all">
                  {convertResult.value.fullAddress}
                </p>
              </div>
              <div>
                <span class="text-sm text-gray-500">Compressed Address</span>
                <p class="font-mono text-sm bg-gray-50 p-2 rounded mt-1 break-all">
                  {convertResult.value.compressedAddress}
                </p>
              </div>
            </div>

            {convertResult.value.networkAddress && (
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span class="text-sm text-gray-500">Network Address</span>
                  <p class="font-mono text-sm bg-gray-50 p-2 rounded mt-1 break-all">
                    {convertResult.value.networkAddress}/
                    {convertResult.value.prefixLength}
                  </p>
                </div>
                <div>
                  <span class="text-sm text-gray-500">Total Addresses</span>
                  <p class="font-mono text-sm bg-gray-50 p-2 rounded mt-1">
                    {convertResult.value.totalAddresses}
                  </p>
                </div>
              </div>
            )}

            {convertResult.value.firstAddress &&
              convertResult.value.lastAddress && (
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span class="text-sm text-gray-500">First Address</span>
                    <p class="font-mono text-sm bg-gray-50 p-2 rounded mt-1 break-all">
                      {convertResult.value.firstAddress}
                    </p>
                  </div>
                  <div>
                    <span class="text-sm text-gray-500">Last Address</span>
                    <p class="font-mono text-sm bg-gray-50 p-2 rounded mt-1 break-all">
                      {convertResult.value.lastAddress}
                    </p>
                  </div>
                </div>
              )}
          </div>
        </div>
      )}

      {/* CIDR Check Results */}
      {cidrResult.value && (
        <div
          class={`rounded-lg p-6 mb-6 ${
            cidrResult.value.error
              ? "bg-red-50 border border-red-200"
              : cidrResult.value.inRange
                ? "bg-green-50 border border-green-200"
                : "bg-yellow-50 border border-yellow-200"
          }`}
        >
          <div class="flex items-center gap-3 mb-2">
            <span
              class={`text-2xl font-bold ${
                cidrResult.value.error
                  ? "text-red-600"
                  : cidrResult.value.inRange
                    ? "text-green-600"
                    : "text-yellow-600"
              }`}
            >
              {cidrResult.value.error
                ? "ERROR"
                : cidrResult.value.inRange
                  ? "IN RANGE"
                  : "NOT IN RANGE"}
            </span>
          </div>
          <p class="text-gray-700">
            {cidrResult.value.error
              ? cidrResult.value.error
              : cidrResult.value.inRange
                ? `${ipv6Address.value} is within the CIDR range ${cidrRange.value}`
                : `${ipv6Address.value} is NOT within the CIDR range ${cidrRange.value}`}
          </p>
        </div>
      )}

      {/* Reference Section */}
      <details class="bg-white rounded-lg shadow">
        <summary class="p-4 cursor-pointer font-medium text-gray-800 hover:bg-gray-50">
          IPv6 CIDR Reference
        </summary>
        <div class="p-4 pt-0 border-t">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-gray-500">
                <th class="pb-2">Prefix</th>
                <th class="pb-2">Addresses</th>
                <th class="pb-2">Common Use</th>
              </tr>
            </thead>
            <tbody class="text-gray-700">
              <tr class="border-t border-gray-100">
                <td class="py-2 font-mono">/128</td>
                <td class="py-2">1</td>
                <td class="py-2">Single host address</td>
              </tr>
              <tr class="border-t border-gray-100">
                <td class="py-2 font-mono">/127</td>
                <td class="py-2">2</td>
                <td class="py-2">Point-to-point links (RFC 6164)</td>
              </tr>
              <tr class="border-t border-gray-100">
                <td class="py-2 font-mono">/64</td>
                <td class="py-2">2^64</td>
                <td class="py-2">Standard subnet size</td>
              </tr>
              <tr class="border-t border-gray-100">
                <td class="py-2 font-mono">/56</td>
                <td class="py-2">256 /64s</td>
                <td class="py-2">Typical home/small office allocation</td>
              </tr>
              <tr class="border-t border-gray-100">
                <td class="py-2 font-mono">/48</td>
                <td class="py-2">65,536 /64s</td>
                <td class="py-2">Enterprise/site allocation</td>
              </tr>
              <tr class="border-t border-gray-100">
                <td class="py-2 font-mono">/32</td>
                <td class="py-2">2^96</td>
                <td class="py-2">ISP allocation from RIR</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
