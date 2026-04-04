import { useMemo, useState } from "react";
import { Search, X, Mic2, SlidersHorizontal, Volume2, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VoiceCard } from "@/components/VoiceCard";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { usePublicVoices } from "@/hooks/use-voice-queries";
import {
  ACCENT_OPTIONS,
  GENDER_OPTIONS,
  type Voice,
  type VoiceAccent,
  type VoiceGender,
} from "@/data/voices";

export default function PaygVoices() {
  const [search, setSearch] = useState("");
  const [accentFilters, setAccentFilters] = useState<Set<VoiceAccent>>(new Set());
  const [genderFilters, setGenderFilters] = useState<Set<VoiceGender>>(new Set());
  const { isPlaying, stop } = useAudioPlayer();

  const { data: apiVoices = [], isLoading } = usePublicVoices();

  const voices: Voice[] = useMemo(
    () =>
      apiVoices.map((v) => ({
        speakerId: v.speaker_id,
        displayName: v.display_name,
        gender: v.gender as VoiceGender,
        accent: v.accent as VoiceAccent,
        sampleUrl: v.sample_url,
      })),
    [apiVoices],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return voices.filter((v) => {
      if (
        q &&
        !v.displayName.toLowerCase().includes(q) &&
        !v.accent.toLowerCase().includes(q) &&
        !v.gender.toLowerCase().includes(q)
      )
        return false;
      if (accentFilters.size > 0 && !accentFilters.has(v.accent)) return false;
      if (genderFilters.size > 0 && !genderFilters.has(v.gender)) return false;
      return true;
    });
  }, [voices, search, accentFilters, genderFilters]);

  function toggleAccent(accent: VoiceAccent) {
    setAccentFilters((prev) => {
      const next = new Set(prev);
      if (next.has(accent)) {
        next.delete(accent);
      } else {
        next.add(accent);
      }
      return next;
    });
  }

  function toggleGender(gender: VoiceGender) {
    setGenderFilters((prev) => {
      const next = new Set(prev);
      if (next.has(gender)) {
        next.delete(gender);
      } else {
        next.add(gender);
      }
      return next;
    });
  }

  const hasFilters = search.trim() || accentFilters.size > 0 || genderFilters.size > 0;

  function clearAll() {
    setSearch("");
    setAccentFilters(new Set());
    setGenderFilters(new Set());
  }

  const activeFilterCount = accentFilters.size + genderFilters.size;

  return (
    <div className="space-y-[clamp(28px,4vw,56px)]">
      <div data-reveal className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Volume2 className="h-5 w-5 text-primary" />
            <h1 className="font-display text-h1 text-foreground">Audio Library</h1>
          </div>
          <p className="text-sm text-muted-foreground/80">
            {voices.length} voice profiles across various accents. Click{" "}
            <strong>Play Sample</strong> to preview.
          </p>
        </div>

        {isPlaying && (
          <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={stop}>
            <Mic2 className="h-3.5 w-3.5 animate-pulse text-primary" />
            Stop Playback
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search voices…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 bg-muted/40 border-border/20"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearch("")}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-10 gap-2">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="h-4 min-w-4 px-1 text-[10px] ml-0.5">{activeFilterCount}</Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
              Gender
            </DropdownMenuLabel>
            {GENDER_OPTIONS.map((g) => (
              <DropdownMenuCheckboxItem
                key={g}
                checked={genderFilters.has(g)}
                onCheckedChange={() => toggleGender(g)}
              >
                {g}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
              Accent
            </DropdownMenuLabel>
            {ACCENT_OPTIONS.map((a) => (
              <DropdownMenuCheckboxItem
                key={a}
                checked={accentFilters.has(a)}
                onCheckedChange={() => toggleAccent(a)}
              >
                {a}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {[...accentFilters].map((a) => (
          <Badge
            key={a}
            variant="secondary"
            className="gap-1 cursor-pointer hover:bg-muted"
            onClick={() => toggleAccent(a)}
          >
            {a}
            <X className="h-3 w-3" />
          </Badge>
        ))}
        {[...genderFilters].map((g) => (
          <Badge
            key={g}
            variant="secondary"
            className="gap-1 cursor-pointer hover:bg-muted"
            onClick={() => toggleGender(g)}
          >
            {g}
            <X className="h-3 w-3" />
          </Badge>
        ))}

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-10 text-muted-foreground hover:text-foreground ml-auto"
            onClick={clearAll}
          >
            Clear all
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading voices</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground/80 -mt-3">
            {filtered.length === voices.length
              ? `All ${voices.length} voices`
              : `${filtered.length} of ${voices.length} voices`}
          </p>

          {filtered.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filtered.map((voice) => (
                <div key={voice.speakerId}>
                  <VoiceCard voice={voice} />
                </div>
              ))}
            </div>
          ) : hasFilters ? (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
              <Mic2 className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">No voices match your filters</p>
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
              <Mic2 className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">No voices available</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
