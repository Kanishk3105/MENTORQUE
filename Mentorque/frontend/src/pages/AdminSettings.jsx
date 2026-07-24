import { useAuth } from "../context/AuthContext";

export default function AdminSettings() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-xl font-semibold text-white">Admin Settings</h1>

      <div className="bg-navy-900 border border-navy-700 rounded-xl p-6">
        <h2 className="text-lg font-medium text-white mb-2">Account</h2>
        <dl className="text-sm text-slate-300 space-y-2">
          <div className="flex justify-between">
            <dt className="text-slate-500">Name</dt>
            <dd>{user?.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Email</dt>
            <dd>{user?.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Role</dt>
            <dd>{user?.role}</dd>
          </div>
        </dl>
      </div>

      <div className="bg-navy-900 border border-navy-700 rounded-xl p-6">
        <h2 className="text-lg font-medium text-white mb-2">Meeting links</h2>
        <p className="text-slate-400 text-sm">
          This platform doesn&apos;t integrate with a calendar provider — when you schedule a meeting you paste in a
          Zoom/Meet/Teams link directly, which keeps auth and environment setup simple.
        </p>
      </div>
    </div>
  );
}
