"use client";

import { useEffect, useState } from "react";
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

export default function JoinPage() {
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resumeToken = params.get("resume");

    if (resumeToken) {
      fetch(`/api/guest?token=${resumeToken}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          setResumeData(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <main>
        <Header />
        <div className="mx-auto max-w-2xl px-6 py-24 text-center">
          <p className="text-warm-gray">Loading...</p>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main>
      <Header />
      <SignupSection resumeData={resumeData} />
      <Footer />
    </main>
  );
}
