import { createClient } from '../lib/supabase/server';
import DashboardClient from './dashboard-client';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: receipts } = await supabase
    .from('receipts')
    .select('*')
    .order('purchased_at', { ascending: false })
    .order('created_at', { ascending: false });

  const list = receipts || [];

  const paths = list.filter((r) => r.image_path).map((r) => r.image_path);
  let urlMap = {};
  if (paths.length) {
    const { data: signed } = await supabase.storage
      .from('receipts')
      .createSignedUrls(paths, 3600);
    (signed || []).forEach((s) => {
      if (s.path && s.signedUrl) urlMap[s.path] = s.signedUrl;
    });
  }

  const withUrls = list.map((r) => ({
    ...r,
    thumb: r.image_path ? urlMap[r.image_path] || null : null,
  }));

  return <DashboardClient email={user?.email || ''} receipts={withUrls} />;
}
