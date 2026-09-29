"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

type SubmitButtonProps = {
  children: string;
  pendingChildren: string;
};

export function SubmitButton({ children, pendingChildren }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" disabled={pending} type="submit">
      {pending ? pendingChildren : children}
    </Button>
  );
}
