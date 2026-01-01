import { define } from "../../utils.ts";

export const handler = define.handlers({
  GET(ctx) {
    const address = ctx.info.remoteAddr.hostname;

    return new Response(
      JSON.stringify({
        success: address !== null,
        address,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  },
});
