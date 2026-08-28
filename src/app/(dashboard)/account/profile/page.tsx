import { requireUser } from '@/lib/auth';

export default async function ProfilePage() {
  const { profile } = await requireUser();

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Profile</h2>
      <div className="card max-w-lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First Name</label>
              <input type="text" defaultValue={profile.first_name || ''} className="input" readOnly />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input type="text" defaultValue={profile.last_name || ''} className="input" readOnly />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" defaultValue={profile.email || ''} className="input" readOnly />
          </div>
          <div>
            <label className="label">Role</label>
            <input type="text" defaultValue={profile.role || 'customer'} className="input" readOnly />
          </div>
          <p className="text-sm text-gray-500">
            Profile editing is available through account settings.
          </p>
        </div>
      </div>
    </div>
  );
}
