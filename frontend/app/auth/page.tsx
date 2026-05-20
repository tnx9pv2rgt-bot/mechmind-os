import { redirect } from 'next/navigation';

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const resolved = await searchParams;
  const params = new URLSearchParams(resolved);
  redirect(`/auth/login${params.size > 0 ? `?${params.toString()}` : ''}`);
}
