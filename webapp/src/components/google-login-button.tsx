"use client";

import { signIn } from "next-auth/react";

export function GoogleLoginButton({ label = "Google 계정으로 로그인" }: { label?: string }) {
  const handleClick = () => {
    void signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#EA4335"
          d="M12 10.2v4.08h5.66c-.24 1.32-.98 2.44-2.09 3.19l3.38 2.63c1.98-1.83 3.12-4.52 3.12-7.82 0-.75-.07-1.48-.21-2.18z"
        />
        <path
          fill="#34A853"
          d="M6.57 14.32l-.86.66-2.7 2.09C4.9 19.75 8.21 21.6 12 21.6c2.7 0 4.96-.89 6.61-2.42l-3.38-2.63c-.9.61-2.05.97-3.23.97-2.48 0-4.58-1.67-5.33-3.98z"
        />
        <path
          fill="#4A90E2"
          d="M3.01 7.98C2.37 9.2 2 10.56 2 12s.37 2.8 1.01 4.02c0 .01 3.56-2.77 3.56-2.77-.19-.58-.3-1.2-.3-1.85 0-.65.11-1.27.3-1.85z"
        />
        <path
          fill="#FBBC05"
          d="M12 4.38c1.46 0 2.78.5 3.82 1.48l2.86-2.86C16.96 1.8 14.7.9 12 .9 8.21.9 4.9 2.75 2.99 5.58l3.58 2.77C7.42 6.05 9.52 4.38 12 4.38z"
        />
      </svg>
      {label}
    </button>
  );
}
