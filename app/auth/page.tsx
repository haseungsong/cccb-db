import { signInAction, signUpAction } from "@/app/auth/actions";

export default async function AuthPage({
  searchParams,
}: {
  searchParams?: Promise<{
    mode?: string;
    error?: string;
  }>;
}) {
  const params = (await searchParams) ?? {};
  const mode = params.mode === "signup" ? "signup" : "login";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-8 sm:px-6">
      <section className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-xl sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">
            CCCB Contact Hub
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            문화원 공식 계정으로만 접속합니다
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-200 sm:text-base">
            새 연락처 생성, OCR 명함 업로드, 수정, 팔로업 기록이 모두 로그인한 계정 기준으로
            저장됩니다. 계정은 @kccbrazil.com.br 이메일을 가진 실무자만 만들 수 있습니다.
          </p>

          <div className="mt-8 grid gap-3">
            {[
              "@kccbrazil.com.br 이메일만 회원가입과 로그인이 가능합니다.",
              "한 번 로그인하면 같은 브라우저에서는 자동으로 접속 상태가 유지됩니다.",
              "새 연락처/OCR 명함은 로그인 계정 기준으로 생성자와 시각이 기록됩니다.",
            ].map((item) => (
              <div key={item} className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-slate-100">
                {item}
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex gap-2 rounded-full bg-slate-100 p-1 text-sm font-semibold">
            <a
              href="/auth?mode=login"
              className={`flex-1 rounded-full px-4 py-2 text-center ${
                mode === "login" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
              }`}
            >
              로그인
            </a>
            <a
              href="/auth?mode=signup"
              className={`flex-1 rounded-full px-4 py-2 text-center ${
                mode === "signup" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
              }`}
            >
              회원가입
            </a>
          </div>

          {params.error ? (
            <div className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {params.error}
            </div>
          ) : null}

          {mode === "login" ? (
            <form action={signInAction} className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">이메일</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="name@kccbrazil.com.br"
                  pattern="^[^@\s]+@kccbrazil\.com\.br$"
                  title="@kccbrazil.com.br 이메일만 사용할 수 있습니다."
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">비밀번호</label>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
              >
                로그인
              </button>
            </form>
          ) : (
            <form action={signUpAction} className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">담당자 이름</label>
                <input
                  name="displayName"
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">팀/부서</label>
                <input
                  name="teamName"
                  placeholder="예: 행사팀, 홍보팀"
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">이메일</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="name@kccbrazil.com.br"
                  pattern="^[^@\s]+@kccbrazil\.com\.br$"
                  title="@kccbrazil.com.br 이메일만 사용할 수 있습니다."
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">비밀번호</label>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm"
                />
              </div>
              <p className="text-xs leading-6 text-slate-500">
                문화원 공식 이메일이 아니면 인증 메일을 보내지 않고 가입을 차단합니다.
              </p>
              <button
                type="submit"
                className="w-full rounded-2xl bg-cyan-700 px-5 py-3 text-sm font-semibold text-white"
              >
                계정 만들기
              </button>
            </form>
          )}
        </article>
      </section>
    </main>
  );
}
