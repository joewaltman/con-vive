"use client";

import { useRouter } from "next/navigation";
import { CalSignupForm } from "./CalSignupForm";

interface CalSignupFormWrapperProps {
  bringItems: Array<{
    slot: number;
    name: string;
    claimed_by_guest_id: number | null;
  }>;
  isWaitlistMode: boolean;
}

export function CalSignupFormWrapper({
  bringItems,
  isWaitlistMode,
}: CalSignupFormWrapperProps) {
  const router = useRouter();

  return (
    <CalSignupForm
      bringItems={bringItems}
      isWaitlistMode={isWaitlistMode}
      onWaitlistSuccess={() => {
        router.push("/cal/waitlist-confirmed");
      }}
    />
  );
}
