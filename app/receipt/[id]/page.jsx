import { createClient } from '../../../lib/supabase/server';
import EditClient from './edit-client';

export const dynamic = 'force-dynamic';

export default async function ReceiptPage({ params }) {
  const supabase = createClient();

  const { data: receipt } = await supabase
    .from('receipts')
    .select('*')
    .eq('id', params.id)
    .single();

  let photoUrl = null;
  if (receipt?.image_path) {
    const { data: signed } = await supabase.storage
      .from('receipts')
      .createSignedUrl(receipt.image_path, 3600);
    photoUrl = signed?.signedUrl || null;
  }

  return <EditClient receipt={receipt || null} photoUrl={photoUrl} />;
}
