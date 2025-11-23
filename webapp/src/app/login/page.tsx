import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { GoogleLoginButton } from "@/components/google-login-button";
import { AppShell } from "@/components/app-shell";
import { authOptions } from "@/server/auth";

export const metadata = {
  title: "로그인 · MorningDigest",
};

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  }

  return (
    <AppShell title="로그인" description="Google 계정으로 간편하게 가입·로그인하세요.">
      <div className="mx-auto max-w-xl space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Google OAuth 인증</h2>
          <p className="mt-2 text-sm text-slate-500">
            Google 계정으로 가입하면 키워드·발송 설정이 안전하게 저장되며, 관리자 승인 없이 바로 대시보드에 접근할 수 있습니다.
          </p>
          <div className="mt-6">
            <GoogleLoginButton label="Google 계정으로 계속하기" />
          </div>
        </section>
        <section className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">관리자 안내</p>
          <p className="mt-2">
            ADMIN_EMAILS 환경 변수에 등록된 주소로 로그인하면 관리자 권한이 부여되며, 회원 관리 메뉴를 사용할 수 있습니다.
          </p>
          <p className="mt-2">
            문제가 있으면 <Link href="mailto:hello@morningdigest.app" className="text-indigo-600 underline">hello@morningdigest.app</Link>으로 문의해 주세요.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
