"use client";

import React, { useActionState } from "react";
import { loginAction } from "../actions/auth-actions";
import { GraduationCap, Lock, User, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#400B1A] to-slate-900 flex items-center justify-center p-4">
      {/* Decorative backdrop glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-[#8A1538]/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-[#C59B27]/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl p-8 sm:p-10">
          {/* Header */}
          <div className="text-center space-y-3 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[#8A1538] mx-auto flex items-center justify-center text-white shadow-lg shadow-[#8A1538]/30">
              <GraduationCap className="w-9 h-9" />
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              نظام الأنشطة الطلابية
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              بوابة الإدارة المدرسية الموحدة — دولة قطر
            </p>
          </div>

          {/* Error Message */}
          {state?.error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{state.error}</span>
            </div>
          )}

          {/* Form */}
          <form action={formAction} className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-bold text-slate-700 mb-1.5"
              >
                اسم المستخدم
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="أدخل اسم المستخدم"
                  className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8A1538] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold text-slate-700 mb-1.5"
              >
                كلمة المرور
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8A1538] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full py-3 text-sm font-bold shadow-md shadow-[#8A1538]/20 mt-2"
            >
              {isPending ? "جاري التحقق والدخول..." : "تسجيل الدخول"}
              {!isPending && <ArrowLeft className="w-4 h-4" />}
            </Button>
          </form>

          {/* Footer note */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              للحصول على صلاحية أو استعادة الحساب، يرجى التواصل مع مدير النظام بالمدرسة.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
