import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Heart, ChevronLeft, ChevronRight, Zap, Coffee, Target, Lightbulb, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const AFFIRMATIONS = [
  "I am fully capable of achieving my target band score.",
  "Every mistake is a stepping stone to mastery.",
  "I am calm, focused, and ready for any question.",
  "My English improves with every practice session.",
  "I trust my preparation and my abilities.",
  "Difficult passages build my reading stamina.",
  "My ideas are clear and my expression is accurate.",
  "I am confident in my spoken English.",
  "Focus on the process, the score will follow.",
  "I have enough time, I am well-prepared."
];

const TIPS = [
  { icon: Coffee, title: "Feeling bored?", text: "Switch the topic! If reading about history is dull, read about technology. Change the input.", color: "bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400" },
  { icon: Heart, title: "Feeling nervous?", text: "Remember: You can get 8–10 questions wrong in Reading and still reach a 6.5. Perfection is not required.", color: "bg-coral/20 text-coral border-coral/30" },
  { icon: Target, title: "Low practice score?", text: "Celebrate it! Every wrong answer in practice is one you won't repeat on exam day.", color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400" },
  { icon: Clock, title: "Running out of time?", text: "Practise with a strict timer for every single session until the pressure feels completely normal.", color: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-500" },
  { icon: Zap, title: "Can't find the answer?", text: "Move on after 90 seconds. You will waste points if you let one hard question steal time from easy ones.", color: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400" }
];

const QUICK_TIPS = [
  "Reading: Read the first and last sentence of paragraphs to get the main idea quickly.",
  "Writing: Plan your essay for 5 minutes before writing. A good structure is half the battle.",
  "Speaking: Don't memorize answers. Examiners are trained to spot reciting.",
  "Listening: Use the time given before the audio starts to underline keywords in questions.",
  "Writing: Ensure you have a clear position throughout your Task 2 essay.",
  "Speaking: If you make a grammar mistake, correct yourself quickly and move on naturally.",
  "Reading: True means the text confirms it. Not Given means the text doesn't say.",
  "Listening: Spelling matters! Double-check plurals and double letters when transferring answers.",
  "General: Sleep well the night before. A tired brain scores lower than an unprepared brain.",
  "Writing Task 1: Don't describe every detail. Summarise the main trends and key features.",
  "Speaking Part 2: Keep talking until the examiner stops you. Use stories to fill time.",
  "Reading: Skim for gist, scan for details. Don't read every single word."
];

export function MindsetCorner() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: affirmations = [], isLoading } = useQuery({ queryKey: ['affirmations'], queryFn: api.getAffirmations });
  const addAffirmation = useMutation({
    mutationFn: api.addAffirmation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['affirmations'] })
  });
  const removeAffirmation = useMutation({
    mutationFn: (id: number) => api.deleteAffirmation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['affirmations'] })
  });

  const [currentTipIdx, setCurrentTipIdx] = useState(0);

  const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
  const dailyAffirmation = AFFIRMATIONS[dayOfYear % AFFIRMATIONS.length];

  const existingFav = affirmations.find((a: any) => a.text === dailyAffirmation);
  const isFav = !!existingFav;

  const toggleFavourite = () => {
    if (isFav) {
      removeAffirmation.mutate(existingFav.id);
    } else {
      addAffirmation.mutate({ text: dailyAffirmation }, {
        onSuccess: () => toast({ description: "Affirmation saved to favourites 💛" })
      });
    }
  };

  const nextTip = () => setCurrentTipIdx((prev) => (prev + 1) % QUICK_TIPS.length);
  const prevTip = () => setCurrentTipIdx((prev) => (prev - 1 + QUICK_TIPS.length) % QUICK_TIPS.length);

  if (isLoading) {
    return <div className="space-y-8"><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-2 border-l-4 border-yellow-500 pl-3">
        <Brain className="w-8 h-8 text-yellow-500" />
        <h1 className="text-3xl font-heading font-bold text-foreground">Mindset Corner</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Affirmation Card */}
        <Card className="border-none bg-gradient-to-br from-[#FFD166] to-[#FCA311] dark:from-[#D97706] dark:to-[#9A3412] shadow-md overflow-hidden relative group rounded-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <CardContent className="p-8 sm:p-12 relative z-10 flex flex-col h-full justify-center min-h-[300px]">
            <p className="text-yellow-900/60 dark:text-orange-200/60 font-bold uppercase tracking-widest text-sm mb-6">Daily Affirmation</p>
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-yellow-950 dark:text-orange-50 leading-tight mb-8">
              "{dailyAffirmation}"
            </h2>
            <Button 
              onClick={toggleFavourite}
              disabled={addAffirmation.isPending || removeAffirmation.isPending}
              className={`w-max rounded-full transition-all ${isFav ? 'bg-yellow-900 text-yellow-100 hover:bg-yellow-800' : 'bg-white/40 text-yellow-950 hover:bg-white/60 border border-white/50 backdrop-blur-sm dark:bg-black/20 dark:text-white dark:border-white/20'}`}
            >
              <Heart className={`w-4 h-4 mr-2 ${isFav ? 'fill-current text-yellow-100' : ''}`} /> 
              {isFav ? 'Saved' : 'I needed this today'}
            </Button>
          </CardContent>
        </Card>

        {/* Quick Tips Carousel */}
        <Card className="shadow-sm border-t-4 border-t-navy flex flex-col rounded-2xl">
          <CardContent className="p-8 flex-1 flex flex-col justify-center relative">
             <div className="absolute top-4 left-6 text-navy/10 dark:text-white/5 text-8xl font-serif leading-none select-none">"</div>
             <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs mb-6 text-center">Quick Tip {currentTipIdx + 1}/{QUICK_TIPS.length}</p>
             <p className="text-xl sm:text-2xl text-foreground font-medium text-center relative z-10 min-h-[100px] flex items-center justify-center">
                {QUICK_TIPS[currentTipIdx]}
             </p>
             
             <div className="flex justify-center gap-4 mt-8">
                <Button variant="outline" size="icon" onClick={prevTip} className="rounded-full w-10 h-10">
                  <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                </Button>
                <Button variant="outline" size="icon" onClick={nextTip} className="rounded-full w-10 h-10">
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </Button>
             </div>
          </CardContent>
        </Card>

      </div>

      <div>
        <h2 className="text-2xl font-heading font-bold text-foreground mb-6 mt-4">Overcoming Roadblocks</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {TIPS.map((tip, idx) => {
            const Icon = tip.icon;
            return (
              <Card key={idx} className={`shadow-sm border-t-4 border-l-0 border-r-0 border-b-0 hover:-translate-y-1 transition-transform duration-300 ${tip.color.split(' ')[2]} dark:bg-card`}>
                <CardContent className="p-5">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 ${tip.color.split(' ')[0]} ${tip.color.split(' ')[1]}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-foreground mb-2">{tip.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{tip.text}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
      
      {/* Show Favourites if any exist */}
      {affirmations.length > 0 && (
        <div className="pt-8">
          <h2 className="text-lg font-bold text-muted-foreground uppercase tracking-widest mb-4">Saved Affirmations</h2>
          <div className="flex flex-wrap gap-2">
            {affirmations.map((a: any) => (
              <span key={a.id} className="bg-card border border-border px-4 py-2 rounded-full text-sm font-medium text-foreground shadow-sm flex items-center gap-2 group">
                <Heart className="w-3 h-3 text-coral fill-coral" /> {a.text}
                <button onClick={() => removeAffirmation.mutate(a.id)} className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-muted-foreground hover:text-red-500">×</button>
              </span>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}