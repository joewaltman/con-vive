import { redirect } from "next/navigation";

export default async function BookingRedirect({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  redirect(`/d/${token}`);
}
