"use client";

import React from "react";
import { LogOut, Calendar, School, User as UserIcon } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { InspirationalQuoteWidget } from "./InspirationalQuoteWidget";
import { InspirationalQuoteItem } from "@/lib/services/quote-service";

interface NavbarProps {
  schoolName: string;
  currentYearName?: string | null;
  user: {
    displayName: string;
    username: string;
    roleNames: string[];
  };
  onLogout: () => Promise<void>;
  quotes?: InspirationalQuoteItem[];
  canManageQuotes?: boolean;
}

export function Navbar({
  schoolName,
  currentYearName,
  user,
  onLogout,
  quotes = [],
  canManageQuotes = false,
}: NavbarProps) {
  return (
    <header className="min-h-[76px] lg:h-20 px-4 md:px-6 bg-white/95 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-30 shadow-xs gap-3">
      {/* School Info (Right side in RTL) */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
          <School className="w-5 h-5 text-[#8A1538]" />
          <span>{schoolName}</span>
        </div>

        {currentYearName ? (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-xs font-semibold text-amber-900">
            <Calendar className="w-3.5 h-3.5 text-[#C59B27]" />
            <span>العام الدراسي: {currentYearName}</span>
          </div>
        ) : (
          <Badge variant="warning">لم يتم تحديد عام دراسي حالي</Badge>
        )}
      </div>

      {/* Left side in RTL: User Info, Logout & Motivational Quote Widget at FAR TOP-LEFT */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {/* User Info */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
            <UserIcon className="w-4 h-4" />
          </div>
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-800 leading-tight">
              {user.displayName}
            </span>
            <span className="text-[10px] text-[#8A1538] font-medium">
              {user.roleNames[0] || user.username}
            </span>
          </div>
        </div>

        {/* Logout Form / Button */}
        <form action={onLogout}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 gap-1.5 h-8 px-2.5"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">خروج</span>
          </Button>
        </form>

        {/* Divider */}
        <div className="hidden lg:block h-9 w-[1px] bg-slate-200 mx-0.5" />

        {/* Inspirational Quote Card Banner (Far Top-Left Corner of Page) */}
        <div className="hidden sm:block">
          <InspirationalQuoteWidget
            quotes={quotes}
            canManage={canManageQuotes}
            intervalSeconds={8}
            variant="header"
          />
        </div>
      </div>
    </header>
  );
}
