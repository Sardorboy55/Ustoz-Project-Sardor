"use client";

import { useEffect, useRef } from "react";

/**
 * Drop inside a <form>: submits it whenever a <select> or checkbox changes.
 * Text/number inputs still rely on the explicit "Apply" button (or Enter),
 * so typing a price doesn't trigger a reload per keystroke.
 */
export function AutoSubmit() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const onChange = (event: Event) => {
      const el = event.target;
      const isSelect = el instanceof HTMLSelectElement;
      const isCheckbox = el instanceof HTMLInputElement && el.type === "checkbox";
      if (isSelect || isCheckbox) form.requestSubmit();
    };
    form.addEventListener("change", onChange);
    return () => form.removeEventListener("change", onChange);
  }, []);

  return <span ref={ref} hidden />;
}
