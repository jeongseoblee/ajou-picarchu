import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { getCurrentProfile } from "@/lib/auth";
import { getSiteSettings, accentStyle, DEFAULT_SETTINGS } from "@/lib/site";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings().catch(() => DEFAULT_SETTINGS);
  return {
    title: { default: s.site_name, template: `%s | ${s.site_name}` },
    description: s.hero_description,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [profile, settings] = await Promise.all([getCurrentProfile(), getSiteSettings()]);
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} style={accentStyle(settings.accent_color)}>
      <body className="min-h-full flex flex-col">
        <Navbar profile={profile} siteName={settings.site_name} siteSubtitle={settings.site_subtitle} />
        <main className="flex-1">{children}</main>
        <Footer settings={settings} />
      </body>
    </html>
  );
}
