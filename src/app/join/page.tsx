"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/landing/header";
import { SignupSection } from "@/components/landing/signup-section";
import { Footer } from "@/components/landing/footer";

interface ResumeData {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  age_range: string | null;
  solo_or_couple: string | null;
  dietary_notes: string | null;
  available_days: string[] | null;
}

function JoinContent() {
  const searchParams = useSearchParams();
  const resumeToken = searchParams.get("resume");
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(!!resumeToken);

  useEffect(() => {
    if (resumeToken) {
      fetch(`/api/guest?token=${resumeToken}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          setResumeData(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [resumeToken]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="text-warm-gray">Loading...</p>
      </div>
    );
  }

  return <SignupSection resumeData={resumeData} />;
}

export default function JoinPage() {
  return (
    <main>
      <Header />
      <Suspense
        fallback={
          <div className="mx-auto max-w-2xl px-6 py-24 text-center">
            <p className="text-warm-gray">Loading...</p>
          </div>
        }
      >
        <JoinContent />
      </Suspense>
      <Footer />
    </main>
  );
}
