// Analytics endpoint, read from a Vite build-time env var. Kept in a separate
// module because `siteConfig.ts` is also imported by the Node-run SEO
// generator (via tsx), where `import.meta.env` is not populated.
//
// Set `VITE_GOATCOUNTER_ENDPOINT` to the full count URL — e.g.
// `https://niclaslindstedt.goatcounter.com/count` — to enable tracking. Leave
// unset for local dev and previews; the hook becomes a no-op.
export const GOATCOUNTER_ENDPOINT: string = import.meta.env.VITE_GOATCOUNTER_ENDPOINT ?? "";
