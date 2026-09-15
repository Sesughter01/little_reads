import { requireApprovedSeller } from '@/lib/seller';
import { SellerProfileForm } from './profile-form';

export const dynamic = 'force-dynamic';

/** /seller/profile — approved sellers edit safe display fields. */
export default async function SellerProfilePage() {
  const profile = await requireApprovedSeller();
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900">Seller Profile</h1>
      <SellerProfileForm
        profile={{
          display_name: profile.display_name,
          business_name: profile.business_name,
          bio: profile.bio,
        }}
      />
    </div>
  );
}
