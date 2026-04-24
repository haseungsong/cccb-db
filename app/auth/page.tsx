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
            담당자 계정으로 접속하고 모든 변경 이력을 남기세요
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-200 sm:text-base">
            새 연락처 생성, OCR 명함 업로드, 수정, 팔로업 기록이 모두 로그인한 계정 기준으로
            저장되도록 바꿨습니다. 각 실무자는 자기 이름으로 계정을 만들고 사용하면 됩니다.
          </p>

          <div className="mt-8 grid gap-3">
            {[
              "회원가입 시 담당자 이름과 팀 정보를 함께 저장합니다.",
              "새 연락처/OCR 명함은 로그인 계정 기준으로 생성자와 시각이 기록됩니다.",
              "수정, 병합, 행사 연결, 팔로업도 누가 처리했는지 감사 로그에 남습니다.",
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
                새 계정은 기본적으로 편집 가능한 실무자 계정으로 생성됩니다.
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
