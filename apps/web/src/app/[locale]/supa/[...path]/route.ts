import { type NextRequest, NextResponse } from "next/server";

// Прокси в Supabase. Узбекские провайдеры не резолвят *.supabase.co (Cloudflare
// DNS), поэтому приложение/сайт ходят на ibilim.uz/_sb/* (резолвится в UZ,
// Vercel), а этот обработчик форвардит запрос в реальный Supabase. Покрывает
// auth / rest / storage / functions. Realtime (websockets) сюда не идёт.
const SUPABASE = "https://pohlwvzwzcscsyigswod.supabase.co";

export const dynamic = "force-dynamic";

async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await params;
  const target = `${SUPABASE}/${(path ?? []).join("/")}${req.nextUrl.search}`;

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("x-forwarded-host");
  headers.delete("x-forwarded-for");

  const method = req.method;
  const body =
    method === "GET" || method === "HEAD" ? undefined : await req.arrayBuffer();

  const upstream = await fetch(target, {
    method,
    headers,
    body,
    redirect: "manual",
  });

  // content-encoding/length уже не соответствуют (fetch раскодировал) — убираем,
  // иначе клиент получит битый ответ.
  const respHeaders = new Headers(upstream.headers);
  respHeaders.delete("content-encoding");
  respHeaders.delete("content-length");
  respHeaders.delete("transfer-encoding");

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: respHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
export const HEAD = proxy;
