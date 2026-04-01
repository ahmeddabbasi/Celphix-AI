import { Play, Square, User, Volume2, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import type { Voice } from "@/data/voices";

interface VoiceCardProps {
  voice: Voice;
}

const ACCENT_COLORS: Record<string, string> = {
  British:        "bg-primary/10 text-primary border-primary/20",
  American:       "bg-primary/10 text-primary border-primary/20",
  Scottish:       "bg-primary/10 text-primary border-primary/20",
  Irish:          "bg-primary/10 text-primary border-primary/20",
  Australian:     "bg-primary/10 text-primary border-primary/20",
  Canadian:       "bg-primary/10 text-primary border-primary/20",
  "South African":"bg-primary/10 text-primary border-primary/20",
  Indian:         "bg-primary/10 text-primary border-primary/20",
  "Northern Irish":"bg-primary/10 text-primary border-primary/20",
};

const GENDER_COLORS: Record<string, string> = {
  Male:   "bg-success/10 text-success border-success/20",
  Female: "bg-success/10 text-success border-success/20",
};

function GenderAvatarIcon({ gender }: { gender: string }) {
  const g = gender.trim().toLowerCase();
  const mark = g.startsWith("f") ? "F" : g.startsWith("m") ? "M" : null;
  return (
    <div className="relative">
      <UserRound className="h-5 w-5" />
      {mark ? (
        <span className="absolute -bottom-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-background/80 border border-border px-1 text-[10px] font-semibold leading-none text-muted-foreground">
          {mark}
        </span>
      ) : null}
    </div>
  );
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
              "voice-logo flex shrink-0 items-center justify-center rounded-full text-sm font-semibold",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-primary/10 text-primary group-hover:bg-primary/20",
            ].join(" ")}
          >
            {active ? (
              <Volume2 className="h-5 w-5 animate-pulse" />
            ) : (
              <GenderAvatarIcon gender={voice.gender} />
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
          variant="outline"
          size="sm"
          onClick={handleToggle}
          className={[
            "btn--play-sample w-full h-8 text-xs gap-1.5 mt-0.5",
            active ? "is-playing" : "",
          ].join(" ")}
        >
          {active ? (
            <>
              <Square className="h-3 w-3 fill-current" />
              <span className="btn-label">Stop</span>
            </>
          ) : (
            <>
              <Play className="h-3 w-3 fill-current" />
              <span className="btn-label">Play Sample</span>
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
