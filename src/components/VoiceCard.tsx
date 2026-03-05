import { Play, Square, User, Volume2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import type { Voice } from "@/data/voices";

interface VoiceCardProps {
  voice: Voice;
}

const ACCENT_COLORS: Record<string, string> = {
  British:        "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  American:       "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  Scottish:       "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  Irish:          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  Australian:     "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20",
  Canadian:       "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  "South African":"bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
  Indian:         "bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20",
  "Northern Irish":"bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
};

const GENDER_COLORS: Record<string, string> = {
  Male:   "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  Female: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
};

/** Avatar initials derived from the display name. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function VoiceCard({ voice }: VoiceCardProps) {
  const { play, isPlayingUrl } = useAudioPlayer();
  const active = isPlayingUrl(voice.sampleUrl);

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    play(voice.sampleUrl);
  }

  const accentClass =
    ACCENT_COLORS[voice.accent] ?? "bg-muted text-muted-foreground border-border";
  const genderClass =
    GENDER_COLORS[voice.gender] ?? "bg-muted text-muted-foreground border-border";

  return (
    <Card
      className={[
        "group relative transition-all duration-200 select-none",
        "hover:shadow-md hover:-translate-y-0.5",
        active
          ? "ring-2 ring-primary shadow-md shadow-primary/10 border-primary/50"
          : "hover:border-primary/30",
      ].join(" ")}
    >
      <CardContent className="p-4 flex flex-col gap-3">
        {/* Avatar + name */}
        <div className="flex items-center gap-3">
          <div
            className={[
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-primary/10 text-primary group-hover:bg-primary/20",
            ].join(" ")}
          >
            {active ? (
              <Volume2 className="h-5 w-5 animate-pulse" />
            ) : (
              initials(voice.displayName)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-foreground leading-tight">
              {voice.displayName}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <User className="h-3 w-3 shrink-0" />
              {voice.gender}
            </p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant="outline"
            className={`text-[11px] px-2 py-0 h-5 font-medium border ${accentClass}`}
          >
            {voice.accent}
          </Badge>
          <Badge
            variant="outline"
            className={`text-[11px] px-2 py-0 h-5 font-medium border ${genderClass}`}
          >
            {voice.gender}
          </Badge>
        </div>

        {/* Play / Stop sample */}
        <Button
          variant={active ? "default" : "outline"}
          size="sm"
          onClick={handleToggle}
          className="w-full h-8 text-xs gap-1.5 mt-0.5"
        >
          {active ? (
            <>
              <Square className="h-3 w-3 fill-current" />
              Stop
            </>
          ) : (
            <>
              <Play className="h-3 w-3 fill-current" />
              Play Sample
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
