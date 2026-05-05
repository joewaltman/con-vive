"use client";

import { useRouter } from "next/navigation";
import { TrojanSignupForm } from "./TrojanSignupForm";

interface TrojanSignupFormWrapperProps {
  bringItems: Array<{
    slot: number;
    name: string;
    claimed_by_guest_id: number | null;
  }>;
  isWaitlistMode: boolean;
}

export function TrojanSignupFormWrapper({
  bringItems,
  isWaitlistMode,
}: TrojanSignupFormWrapperProps) {
  const router = useRouter();

  return (
    <TrojanSignupForm
      bringItems={bringItems}
      isWaitlistMode={isWaitlistMode}
      onWaitlistSuccess={() => {
        router.push("/trojan/waitlist-confirmed");
      }}
    />
  );
}
