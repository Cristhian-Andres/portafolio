import Script from "next/script";

const GTM_ID_PATTERN = /^GTM-[A-Z0-9]{4,}$/;

export function isValidGtmId(id: string | undefined): id is string {
  return typeof id === "string" && GTM_ID_PATTERN.test(id);
}

/**
 * Carga Google Tag Manager si hay un ID válido (variable NEXT_PUBLIC_GTM_ID).
 * Sin ID no renderiza nada, pero los eventos igualmente se encolan en `dataLayer`.
 */
export function GoogleTagManager({
  gtmId = process.env.NEXT_PUBLIC_GTM_ID,
}: {
  gtmId?: string;
}) {
  if (!isValidGtmId(gtmId)) return null;

  const snippet = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`;

  return (
    <>
      <Script id="gtm-init" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: snippet }} />
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
          title="Google Tag Manager"
        />
      </noscript>
    </>
  );
}
