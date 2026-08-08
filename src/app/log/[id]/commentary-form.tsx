"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PRESET_TAGS = [
  "heat",
  "cold",
  "rain",
  "wind",
  "hills",
  "faded late",
  "strong finish",
  "stomach issues",
  "cramps",
  "dehydrated",
  "great day",
  "tired legs",
  "easy effort",
  "tempo",
  "long run",
  "recovery",
  "trail",
  "road",
];

interface CommentaryFormProps {
  activityId: string;
}

export function CommentaryForm({ activityId }: CommentaryFormProps) {
  const [feelRating, setFeelRating] = useState<number | null>(null);
  const [shoes, setShoes] = useState("");
  const [nutrition, setNutrition] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function handleSave() {
    // TODO: Save to Supabase when connected
    console.log("Commentary:", {
      activityId,
      feelRating,
      shoes,
      nutrition,
      notes,
      tags,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Run Commentary</CardTitle>
        <p className="text-xs text-muted-foreground">
          Add your notes — this is what makes pattern analysis possible later.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Feel rating */}
        <div>
          <Label className="text-xs uppercase tracking-wider">
            How did it feel? (1–10)
          </Label>
          <div className="mt-1.5 flex gap-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setFeelRating(n)}
                className={`h-8 w-8 rounded text-sm font-medium transition-colors ${
                  feelRating === n
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-accent"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Shoes */}
        <div>
          <Label htmlFor="shoes" className="text-xs uppercase tracking-wider">
            Shoes
          </Label>
          <Input
            id="shoes"
            value={shoes}
            onChange={(e) => setShoes(e.target.value)}
            placeholder="e.g., Hoka Speedgoat 6"
            className="mt-1.5"
          />
        </div>

        {/* Nutrition */}
        <div>
          <Label
            htmlFor="nutrition"
            className="text-xs uppercase tracking-wider"
          >
            Nutrition
          </Label>
          <Input
            id="nutrition"
            value={nutrition}
            onChange={(e) => setNutrition(e.target.value)}
            placeholder="e.g., 2 gels, 500ml water, electrolytes"
            className="mt-1.5"
          />
        </div>

        {/* Tags */}
        <div>
          <Label className="text-xs uppercase tracking-wider">Tags</Label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {PRESET_TAGS.map((tag) => (
              <Badge
                key={tag}
                variant={tags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Free notes */}
        <div>
          <Label htmlFor="notes" className="text-xs uppercase tracking-wider">
            Notes
          </Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What happened during the run? Anything you'd want to remember for similar conditions?"
            rows={4}
            className="mt-1.5"
          />
        </div>

        {/* Save */}
        <div className="flex items-center gap-3">
          <Button onClick={handleSave}>Save Commentary</Button>
          {saved && (
            <span className="text-sm text-muted-foreground">Saved</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
