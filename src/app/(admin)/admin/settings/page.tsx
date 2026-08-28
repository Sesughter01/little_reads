export default function AdminSettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Settings</h1>
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Site Settings</h2>
        <div className="space-y-4 max-w-lg">
          <div>
            <label className="label">Site Name</label>
            <input type="text" defaultValue="LittleReads" className="input" readOnly />
          </div>
          <div>
            <label className="label">Site URL</label>
            <input type="text" defaultValue="https://littlereads.com" className="input" readOnly />
          </div>
          <div>
            <label className="label">Paystack Mode</label>
            <input type="text" defaultValue="Test" className="input" readOnly />
          </div>
          <p className="text-sm text-gray-500">
            Settings are configured through environment variables. Edit .env.local to change site configuration.
          </p>
        </div>
      </div>
    </div>
  );
}
