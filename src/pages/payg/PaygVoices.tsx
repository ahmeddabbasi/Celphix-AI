import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Mic2, Search, SlidersHorizontal, Volume2, Play, X } from "lucide-react";

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
import { Card, CardContent } from "@/components/ui/card";

type Gender = "Male" | "Female";

type PaygVoice = {
  id: string;
  displayName: string;
  gender: Gender;
  accent: string;
};

const VOICES: PaygVoice[] = [
  { id: "v_ava_us", displayName: "Ava", gender: "Female", accent: "American" },
  { id: "v_noah_uk", displayName: "Noah", gender: "Male", accent: "British" },
  { id: "v_mia_au", displayName: "Mia", gender: "Female", accent: "Australian" },
  { id: "v_ethan_ca", displayName: "Ethan", gender: "Male", accent: "Canadian" },
  { id: "v_sophia_ie", displayName: "Sophia", gender: "Female", accent: "Irish" },
  { id: "v_james_sc", displayName: "James", gender: "Male", accent: "Scottish" },
];

const ACCENT_OPTIONS = Array.from(new Set(VOICES.map((v) => v.accent)));
const GENDER_OPTIONS: Gender[] = ["Male", "Female"];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.025 } },
};
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

function VoiceTile({ voice }: { voice: PaygVoice }) {
  const g = voice.gender.toLowerCase();
  const mark = g.startsWith("f") ? "F" : "M";

  return (
    <Card className="group relative transition-all duration-200 select-none hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30">
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary/20">
            <div className="relative">
              <Mic2 className="h-5 w-5" />
              <span className="absolute -bottom-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-background/80 border border-border px-1 text-[10px] font-semibold leading-none text-muted-foreground">
                {mark}
              </span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-foreground leading-tight">{voice.displayName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {voice.gender} · {voice.accent}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[11px] px-2 py-0 h-5 font-medium border bg-primary/10 text-primary border-primary/20">
            {voice.accent}
          </Badge>
          <Badge variant="outline" className="text-[11px] px-2 py-0 h-5 font-medium border bg-success/10 text-success border-success/20">
            {voice.gender}
          </Badge>
        </div>

        <Button variant="outline" size="sm" disabled className="w-full h-8 text-xs gap-1.5 mt-0.5">
          <Play className="h-3 w-3" />
          Play Sample
        </Button>
      </CardContent>
    </Card>
  );
}

export default function PaygVoices() {
  const [search, setSearch] = useState("");
  const [accentFilters, setAccentFilters] = useState<Set<string>>(new Set());
  const [genderFilters, setGenderFilters] = useState<Set<Gender>>(new Set());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return VOICES.filter((v) => {
      if (q && !v.displayName.toLowerCase().includes(q) && !v.accent.toLowerCase().includes(q) && !v.gender.toLowerCase().includes(q)) {
        return false;
      }
      if (accentFilters.size > 0 && !accentFilters.has(v.accent)) return false;
      if (genderFilters.size > 0 && !genderFilters.has(v.gender)) return false;
      return true;
    });
  }, [search, accentFilters, genderFilters]);

  const activeFilterCount = accentFilters.size + genderFilters.size;
  const hasFilters = search.trim() || activeFilterCount > 0;

  function toggleAccent(accent: string) {
    setAccentFilters((prev) => {
      const next = new Set(prev);
      next.has(accent) ? next.delete(accent) : next.add(accent);
      return next;
    });
  }

  function toggleGender(g: Gender) {
    setGenderFilters((prev) => {
      const next = new Set(prev);
      next.has(g) ? next.delete(g) : next.add(g);
      return next;
    });
  }

  function clearAll() {
    setSearch("");
    setAccentFilters(new Set());
    setGenderFilters(new Set());
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col h-full p-4 sm:p-6 gap-6">
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Volume2 className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Audio Library</h1>
          </div>
          <p className="text-sm text-muted-foreground">Browse voice profiles and accents.</p>
        </div>
      </motion.div>

      <motion.div variants={item} className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search voices…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
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
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="h-4 min-w-4 px-1 text-[10px] ml-0.5">{activeFilterCount}</Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">Gender</DropdownMenuLabel>
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
            <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">Accent</DropdownMenuLabel>
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

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-muted-foreground hover:text-foreground ml-auto"
            onClick={clearAll}
          >
            Clear all
          </Button>
        )}
      </motion.div>

      <motion.p variants={item} className="text-xs text-muted-foreground -mt-3">
        {filtered.length === VOICES.length ? `All ${VOICES.length} voices` : `${filtered.length} of ${VOICES.length} voices`}
      </motion.p>

      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 pb-6">
        {filtered.map((voice) => (
          <motion.div key={voice.id} variants={item}>
            <VoiceTile voice={voice} />
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
