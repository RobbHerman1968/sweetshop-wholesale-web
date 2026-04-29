"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-[#d1b79a] bg-white px-3 py-2 text-sm text-[#4a2b1f] outline-none ring-amber-300 focus:ring",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

