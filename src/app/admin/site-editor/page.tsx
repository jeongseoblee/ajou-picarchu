import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getHomeSections, getSiteSettings } from "@/lib/site";
import { SiteEditor } from "@/components/admin/site-editor";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const metadata: Metadata = { title: "사이트 편집" };

export default async function SiteEditorPage() {
  await requireAdmin();
  const [settings, sections] = await Promise.all([getSiteSettings(), getHomeSections()]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">사이트 편집</h1>
        <p className="text-sm text-muted-foreground mt-1">홈페이지 문구, 색상, 홈 섹션, ABOUT, Footer 를 수정합니다. 저장 즉시 반영됩니다.</p>
      </div>
      {sections.length === 0 && (
        <Alert variant="destructive">
          <AlertDescription>home_sections 데이터가 없습니다. <code>supabase/migrations/0002_site_editor.sql</code> 을 적용하세요.</AlertDescription>
        </Alert>
      )}
      <SiteEditor initialSettings={settings} initialSections={sections} />
    </div>
  );
}
