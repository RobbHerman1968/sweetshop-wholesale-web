"use client";

import { useId } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type ForgotPasswordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBackToLogin?: () => void;
};

export function ForgotPasswordDialog({
  open,
  onOpenChange,
  onBackToLogin,
}: ForgotPasswordDialogProps) {
  const emailFieldId = useId();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#fdf7ef] text-[#4a2b1f] border-[#d1b79a]">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold uppercase tracking-[0.25em] text-[#7c5b44]">
            Reset Password
          </DialogTitle>
          <DialogDescription className="mt-2 text-xs text-[#7c5b44]">
            Enter the email associated with your wholesale account and we&apos;ll
            send you a link to reset your password.
          </DialogDescription>
        </DialogHeader>

        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <div className="space-y-1">
            <Label htmlFor={emailFieldId}>Email</Label>
            <Input
              id={emailFieldId}
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>
          <Button type="submit" className="mt-2 w-full">
            Send reset link
          </Button>
        </form>
        <button
          type="button"
          className="mt-3 rounded-sm text-[11px] uppercase tracking-[0.2em] text-[#a67c52] hover:text-[#4a2b1f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a78] focus-visible:ring-offset-2"
          onClick={() => {
            onOpenChange(false);
            onBackToLogin?.();
          }}
        >
          Back to login
        </button>
      </DialogContent>
    </Dialog>
  );
}

