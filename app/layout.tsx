import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "نظام إدارة الأنشطة الطلابية",
  description: "منظومة متكاملة لإدارة وتوثيق الأنشطة المدرسية ومشاركات الطلاب والإحصائيات والتقارير الرسمية",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className="h-full">
      <body className="h-full bg-slate-50 text-slate-900 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
