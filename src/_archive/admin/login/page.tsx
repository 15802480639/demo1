export default function AdminLogin() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100">
      <form className="w-80 rounded-xl border bg-white p-6">
        <h1 className="mb-4 text-xl font-semibold">Admin Login</h1>
        <input
          placeholder="Email"
          className="mb-3 w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-black"
        />
        <input
          type="password"
          placeholder="Password"
          className="mb-4 w-full rounded border border-zinc-300 px-3 py-2 outline-none focus:border-black"
        />
        <button className="w-full rounded bg-black py-2 text-sm font-medium text-white">
          Sign in
        </button>
        {/* TODO: 接入鉴权（NextAuth / 自定义 session + AUTH_SECRET） */}
      </form>
    </div>
  );
}
