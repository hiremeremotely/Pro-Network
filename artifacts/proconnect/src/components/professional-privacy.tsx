import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMyPrivacyQueryKey, useGetMyPrivacy, useUpdateMyPrivacy } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2Icon, ExternalLinkIcon, LockKeyholeIcon, RadioTowerIcon } from "lucide-react";

type Visibility = "public" | "hmr" | "private";
const fields = [
  ["identity", "Identity", "Name, headline and profile photo"],
  ["contact", "Contact", "Email and ways to reach you"],
  ["currentEmployer", "Current employer", "Your current workplace"],
  ["socialLinks", "Source links", "LinkedIn, GitHub and websites; only with explicit identity and source-link release"],
  ["portfolio", "Portfolio", "Projects and imported proof"],
  ["experience", "Experience", "Work history and achievements"],
  ["education", "Education", "Schools, degrees and study"],
  ["skills", "Skills", "Your skills and proficiency"],
] as const;

export function ProfessionalPrivacy({ profile, onOpenPortfolio }: { profile: any; onOpenPortfolio?: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const privacy = useGetMyPrivacy({ query: { queryKey: getGetMyPrivacyQueryKey() } });
  const update = useUpdateMyPrivacy();
  const [settings, setSettings] = useState<Record<string, Visibility>>({});
  const [discoveryEnabled, setDiscoveryEnabled] = useState(true);
  const sourceMetadata = privacy.data?.sourceMetadata ?? {};

  useEffect(() => {
    if (privacy.data) {
      const next = { ...(privacy.data.privacySettings ?? {}) };
      if (next.socialLinks === "public") next.socialLinks = "hmr";
      setSettings(next);
      setDiscoveryEnabled(privacy.data.discoveryEnabled);
    }
  }, [privacy.data]);

  const sources = useMemo(() => [
    { key: "linkedin", label: "LinkedIn", value: profile?.linkedinUrl, kind: "Linked proof" },
    { key: "behance", label: "Behance", value: sourceMetadata.behance?.url, kind: "Imported link" },
    { key: "github", label: "GitHub", value: profile?.githubUrl, kind: "Imported repositories" },
    { key: "website", label: "Personal website", value: profile?.website, kind: "Linked proof" },
    { key: "cv", label: "CV / case study", value: sourceMetadata.cv?.label, kind: "Uploaded file" },
    { key: "email", label: "Account email", value: profile?.email, kind: "Synced account detail" },
  ], [profile, sourceMetadata]);

  function save() {
    update.mutate({ data: { privacySettings: settings, discoveryEnabled } }, {
      onSuccess: data => {
        qc.setQueryData(getGetMyPrivacyQueryKey(), data);
        toast({ title: "Privacy settings saved", description: "Your Professional Hub visibility is updated." });
      },
      onError: () => toast({ title: "Could not save privacy settings", description: "Try again in a moment.", variant: "destructive" }),
    });
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-indigo-100 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-indigo-50 via-white to-amber-50 pb-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-indigo-600 p-2.5 text-white"><RadioTowerIcon className="w-5 h-5" /></div>
            <div>
              <CardTitle className="text-lg">Professional Hub</CardTitle>
              <p className="mt-1 max-w-2xl text-sm text-gray-600">One place for verified links, imported proof and the privacy rules that power HMR-mediated introductions.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
            <div><p className="text-sm font-semibold text-gray-900">Discoverable in the HMR marketplace</p><p className="text-xs text-gray-600 mt-0.5">Companies see an anonymous proof card until you approve an introduction.</p></div>
            <Switch checked={discoveryEnabled} onCheckedChange={setDiscoveryEnabled} aria-label="Enable marketplace discovery" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {sources.map(source => (
              <div key={source.key} className="flex items-center gap-3 rounded-xl border border-gray-200 p-3">
                <div className={`rounded-lg p-2 ${source.value ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
                  {source.value ? <CheckCircle2Icon className="w-4 h-4" /> : <LockKeyholeIcon className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-gray-800">{source.label}</p><p className="text-[11px] text-gray-500">{source.value ? source.kind : "Not connected yet"}</p></div>
                {source.value && source.key !== "email" && <a className="text-gray-400 hover:text-primary" href={source.value.startsWith("http") ? source.value : undefined} target="_blank" rel="noreferrer" aria-label={`Open ${source.label}`}><ExternalLinkIcon className="w-3.5 h-3.5" /></a>}
                {!source.value && source.key === "cv" && onOpenPortfolio && <Button type="button" size="sm" variant="outline" onClick={onOpenPortfolio}>Add proof</Button>}
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-gray-50 p-4 text-xs leading-relaxed text-gray-600"><strong className="text-gray-800">Private sources, reviewed work.</strong> Your source URLs stay private. GitHub repository details can be imported for your review; website and LinkedIn links are kept as private proof, not scraped. A company can open source links only after you approve a direct introduction with both Identity and Source links.</div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader><CardTitle className="text-base">Field-level privacy</CardTitle><p className="text-sm text-gray-500">Choose what is public, shared with HMR after a request, or private. Source URLs are never public.</p></CardHeader>
        <CardContent className="space-y-2">
          {fields.map(([key, label, description]) => (
            <div key={key} className="grid gap-2 rounded-xl border border-gray-100 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div><Label className="text-sm font-semibold">{label}</Label><p className="text-xs text-gray-500">{description}</p></div>
              <div className="flex rounded-lg border bg-white p-0.5" role="group" aria-label={`${label} visibility`}>
                {(key === "socialLinks" ? ["hmr", "private"] : ["public", "hmr", "private"] as Visibility[]).map((value: Visibility) => (
                  <button type="button" key={value} onClick={() => setSettings(current => ({ ...current, [key]: value }))} className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold capitalize focus:outline-none focus:ring-2 focus:ring-primary/40 ${((settings[key] ?? "hmr") === value) ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-50"}`}>{value === "hmr" ? "HMR only" : value}</button>
                ))}
              </div>
            </div>
          ))}
          <div className="flex items-center justify-end border-t pt-4"><Button onClick={save} disabled={update.isPending}>{update.isPending ? "Saving…" : "Save privacy settings"}</Button></div>
          {privacy.isError && <p className="text-sm text-destructive">Privacy settings could not be loaded. Refresh and try again.</p>}
          {privacy.isLoading && <Badge variant="outline">Loading privacy settings…</Badge>}
        </CardContent>
      </Card>
    </div>
  );
}