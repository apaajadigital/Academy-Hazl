"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input, type InputProps } from "./Input";

export type PasswordInputProps = Omit<InputProps, "type" | "rightSlot"> &
  Pick<InputHTMLAttributes<HTMLInputElement>, "autoComplete">;

/**
 * Password field with a show/hide toggle.
 *
 * The input stays `type="password"` by default; the toggle only flips the
 * DOM `type` attribute between "password" and "text" — the value itself is
 * never read into component state, logged, or written anywhere (storage,
 * network) that a plain <Input type="password"> wouldn't already touch.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(props, ref) {
    const [visible, setVisible] = useState(false);

    return (
      <Input
        ref={ref}
        type={visible ? "text" : "password"}
        rightSlot={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            aria-pressed={visible}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        }
        {...props}
      />
    );
  },
);
