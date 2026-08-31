import { EditProductClient } from './edit-product-client';

export const dynamic = 'force-dynamic';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditProductClient productId={id} />;
}
