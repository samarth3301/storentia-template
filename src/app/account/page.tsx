import Link from "next/link";
import { logoutAction, sendCodeAction, verifyCodeAction } from "@/app/actions";
import { readCustomerToken } from "@/lib/session";
import { getMe } from "@/lib/storefront";

export const metadata = { title: "Account" };

export default async function AccountPage(props: {
  searchParams: Promise<{ email?: string; error?: string; next?: string }>;
}) {
  const [token, params] = await Promise.all([
    readCustomerToken(),
    props.searchParams,
  ]);
  const customer = token ? await getMe(token).catch(() => null) : null;
  const next = params.next ?? "/account";

  if (customer) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-6 py-10">
        <h1 className="text-2xl font-semibold">Your account</h1>
        <dl className="flex flex-col gap-2 rounded-xl border border-black/10 p-6 text-sm dark:border-white/15">
          <div className="flex justify-between">
            <dt className="text-zinc-500">Name</dt>
            <dd>{customer.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Email</dt>
            <dd>{customer.email}</dd>
          </div>
        </dl>
        <Link href="/orders" className="text-sm underline">
          View your orders →
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-full border px-5 py-2 text-sm"
          >
            Sign out
          </button>
        </form>
      </div>
    );
  }

  const email = params.email;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-sm text-zinc-500">
          We email you a one-time code — no password to remember.
        </p>
      </div>

      {params.error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {params.error}
        </p>
      )}

      {!email ? (
        <form action={sendCodeAction} className="flex flex-col gap-3">
          <input type="hidden" name="next" value={next} />
          <label htmlFor="email" className="text-sm font-medium">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="rounded-lg border border-black/15 bg-transparent px-4 py-3 text-sm dark:border-white/20"
          />
          <button
            type="submit"
            className="h-12 rounded-full bg-black text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            Send code
          </button>
        </form>
      ) : (
        <form action={verifyCodeAction} className="flex flex-col gap-3">
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="next" value={next} />
          <p className="text-sm text-zinc-500">
            Code sent to <strong>{email}</strong>.
          </p>
          <label htmlFor="code" className="text-sm font-medium">
            Verification code
          </label>
          <input
            id="code"
            name="code"
            inputMode="numeric"
            required
            autoComplete="one-time-code"
            placeholder="000000"
            className="rounded-lg border border-black/15 bg-transparent px-4 py-3 text-sm tracking-[0.3em] dark:border-white/20"
          />
          <button
            type="submit"
            className="h-12 rounded-full bg-black text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            Verify and continue
          </button>
          <Link href="/account" className="text-center text-sm underline">
            Use a different email
          </Link>
        </form>
      )}
    </div>
  );
}
