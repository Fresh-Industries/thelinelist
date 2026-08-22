import Script from "next/script";

export function AnalyticsScripts() {
  const provider = process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER;
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

  switch (provider) {
    case "plausible":
      if (!plausibleDomain) return null;
      return (
        <Script
          defer
          data-domain={plausibleDomain}
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
      );
    case "posthog":
      if (!posthogKey) return null;
      return (
        <Script id="posthog-init" strategy="afterInteractive">
          {`
            (function() {
              var s = document.createElement("script");
              s.async = true;
              s.src = ${JSON.stringify(`${posthogHost.replace(/\/$/, "")}/static/array.js`)};
              document.head.appendChild(s);
              window.posthog = window.posthog || { capture: function(){} };
              s.addEventListener("load", function() {
                if (window.posthog && window.posthog.init) {
                  window.posthog.init(${JSON.stringify(posthogKey)}, {
                    api_host: ${JSON.stringify(posthogHost)},
                    person_profiles: "identified_only"
                  });
                }
              });
            })();
          `}
        </Script>
      );
    case "console":
    case undefined:
    case "":
      return null;
    default: {
      const _exhaustive: never = provider as never;
      void _exhaustive;
      return null;
    }
  }
}
