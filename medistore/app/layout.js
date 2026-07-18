import "./globals.css";

export const metadata = {
  title: "نظام إدارة محل المستهلكات الطبية",
  description: "نظام متكامل للمبيعات والمشتريات والمخزون",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
