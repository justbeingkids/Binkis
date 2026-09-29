import { NextResponse } from "next/server";
import { checkState, exchangeCode, isValidShop, saveToken, shopDomain } from "@/lib/shopify-oauth";
import { verifyOauthCallback } from "@/lib/shopify-verify";

export const dynamic = "force-dynamic";

/**
 * Where Shopify sends the authorisation code after the merchant approves.
 *
 * Four things have to hold before a token is stored: Shopify's signature over
 * the query, our own signature on the state, a well-formed shop domain, and
 * that domain being the one this deployment is configured for. Any of them
 * failing means somebody other than Shopify is calling, and nothing is saved.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const shop = (params.get("shop") ?? "").toLowerCase();
  const code = params.get("code") ?? "";
  const state = params.get("state") ?? "";

  const secret = process.env.SHOPIFY_OAUTH_CLIENT_SECRET ?? "";
  if (!verifyOauthCallback(params, secret)) {
    return NextResponse.json({ error: "firma invalida" }, { status: 401 });
  }
  if (!isValidShop(shop) || shop !== shopDomain()) {
    return NextResponse.json({ error: "tienda no autorizada" }, { status: 403 });
  }
  if (!(await checkState(state, shop))) {
    return NextResponse.json({ error: "state invalido o vencido" }, { status: 401 });
  }
  if (!code) {
    return NextResponse.json({ error: "falta el code" }, { status: 400 });
  }

  const exchanged = await exchangeCode(shop, code);
  if (!exchanged) {
    return NextResponse.json({ error: "no se pudo canjear el code" }, { status: 502 });
  }

  try {
    await saveToken(shop, exchanged.token, exchanged.scope);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "no se pudo guardar el token" }, { status: 500 });
  }

  // A page rather than JSON: a person is looking at this in a browser.
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><title>BinKis</title>
     <body style="font-family:system-ui;max-width:32rem;margin:15vh auto;padding:0 1.5rem;line-height:1.6">
       <h1 style="font-size:1.25rem">Listo</h1>
       <p>La app quedó instalada en <strong>${shop}</strong> con permisos:
          <code>${exchanged.scope || "write_customers"}</code>.</p>
       <p>Desde ahora, al pagar un pedido, el sistema pone <code>elite-access</code>
          a los 30 puntos y <code>vip-access</code> a los 40.</p>
       <p style="color:#666">Ya puedes cerrar esta ventana.</p>
     </body>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}
