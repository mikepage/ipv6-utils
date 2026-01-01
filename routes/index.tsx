import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import IPv6Utils from "../islands/IPv6Utils.tsx";

export default define.page(function Home() {
  return (
    <div class="min-h-screen bg-[#fafafa]">
      <Head>
        <title>IPv6 Utils</title>
      </Head>
      <div class="px-6 md:px-12 py-8">
        <div class="max-w-4xl mx-auto">
          <h1 class="text-2xl font-normal text-[#111] tracking-tight mb-2">
            IPv6 Utils
          </h1>
          <p class="text-[#666] text-sm mb-8">
            Convert IPv6 addresses to different formats and check if an address
            falls within a CIDR range.
          </p>
          <IPv6Utils />
        </div>
      </div>
    </div>
  );
});
