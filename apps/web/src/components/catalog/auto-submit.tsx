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
      if (isSelect || isCheckbox) {
        // Subjects belong to a category — changing the category invalidates the
        // chosen subject, so clear it instead of carrying a stale one in the URL.
        if (isSelect && el.name === "category") {
          const subject =
            form.querySelector<HTMLSelectElement>('select[name="subject"]');
          if (subject) subject.value = "";
        }
        form.requestSubmit();
      }
    };
    form.addEventListener("change", onChange);
    return () => form.removeEventListener("change", onChange);
  }, []);

  return <span ref={ref} hidden />;
}
