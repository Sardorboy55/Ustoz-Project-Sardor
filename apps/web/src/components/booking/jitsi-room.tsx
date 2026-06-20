"use client";

import { useEffect, useRef } from "react";

// Встроенный Jitsi Meet (бесплатно, без аккаунтов). Комната задаётся снаружи
// (= id брони), оба участника попадают в одну. Грузим официальный external_api.

const JITSI_SRC = "https://meet.jit.si/external_api.js";

type JitsiApi = {
  addEventListener: (event: string, cb: () => void) => void;
  dispose: () => void;
};
type JitsiCtor = new (domain: string, options: Record<string, unknown>) => JitsiApi;

declare global {
  interface Window {
    JitsiMeetExternalAPI?: JitsiCtor;
  }
}

export function JitsiRoom({
  room,
  displayName,
  onLeave,
}: {
  room: string;
  displayName: string;
  onLeave: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let api: JitsiApi | null = null;
    let cancelled = false;

    const init = () => {
      if (cancelled || !ref.current || !window.JitsiMeetExternalAPI) return;
      api = new window.JitsiMeetExternalAPI("meet.jit.si", {
        roomName: room,
        parentNode: ref.current,
        width: "100%",
        height: "100%",
        userInfo: { displayName },
        configOverwrite: {
          prejoinPageEnabled: false,
          disableDeepLinking: true,
        },
        interfaceConfigOverwrite: { MOBILE_APP_PROMO: false },
      });
      api.addEventListener("readyToClose", onLeave);
    };

    if (window.JitsiMeetExternalAPI) {
      init();
    } else {
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${JITSI_SRC}"]`,
      );
      if (existing) {
        existing.addEventListener("load", init);
      } else {
        const s = document.createElement("script");
        s.src = JITSI_SRC;
        s.async = true;
        s.onload = init;
        document.body.appendChild(s);
      }
    }

    return () => {
      cancelled = true;
      if (api) api.dispose();
    };
  }, [room, displayName, onLeave]);

  return <div ref={ref} className="h-full w-full" />;
}
