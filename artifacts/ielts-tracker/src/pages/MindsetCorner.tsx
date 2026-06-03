import React, { useState } from 'react';
import { useApp } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Heart, ChevronLeft, ChevronRight, Zap, Coffee, Target, Lightbulb, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  { icon: Coffee, title: "Feeling bored?", text: "Switch the topic! If reading about history is dull, read about technology. Change the input.", color: "bg-blue-100 text-blue-600 border-blue-200" },
  { icon: Heart, title: "Feeling nervous?", text: "Remember: You can get 8–10 questions wrong in Reading and still reach a 6.5. Perfection is not required.", color: "bg-coral/20 text-coral border-coral/30" },
  { icon: Target, title: "Low practice score?", text: "Celebrate it! Every wrong answer in practice is one you won't repeat on exam day.", color: "bg-green-100 text-green-700 border-green-200" },
  { icon: Clock, title: "Running out of time?", text: "Practise with a strict timer for every single session until the pressure feels completely normal.", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { icon: Zap, title: "Can't find the answer?", text: "Move on after 90 seconds. You will waste points if you let one hard question steal time from easy ones.", color: "bg-purple-100 text-purple-700 border-purple-200" }
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
  const { favouriteAffirmations, setFavouriteAffirmations } = useApp();
  const { toast } = useToast();
  
  const [currentTipIdx, setCurrentTipIdx] = useState(0);

  const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
  const dailyAffirmation = AFFIRMATIONS[dayOfYear % AFFIRMATIONS.length];

  const toggleFavourite = () => {
    if (favouriteAffirmations.includes(dailyAffirmation)) {
      setFavouriteAffirmations(favouriteAffirmations.filter(a => a !== dailyAffirmation));
    } else {
      setFavouriteAffirmations([...favouriteAffirmations, dailyAffirmation]);
      toast({ description: "Affirmation saved to favourites 💛" });
    }
  };

  const isFav = favouriteAffirmations.includes(dailyAffirmation);

  const nextTip = () => setCurrentTipIdx((prev) => (prev + 1) % QUICK_TIPS.length);
  const prevTip = () => setCurrentTipIdx((prev) => (prev - 1 + QUICK_TIPS.length) % QUICK_TIPS.length);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-2">
        <Brain className="w-8 h-8 text-yellow-500" />
        <h1 className="text-3xl font-heading font-bold text-navy dark:text-white">Mindset Corner</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Affirmation Card */}
        <Card className="border-none bg-gradient-to-br from-[#FFD166] to-[#FCA311] shadow-md overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <CardContent className="p-8 sm:p-12 relative z-10 flex flex-col h-full justify-center min-h-[300px]">
            <p className="text-yellow-900/60 font-bold uppercase tracking-widest text-sm mb-6">Daily Affirmation</p>
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-yellow-950 leading-tight mb-8">
              "{dailyAffirmation}"
            </h2>
            <Button 
              onClick={toggleFavourite}
              className={`w-max rounded-full transition-all ${isFav ? 'bg-yellow-900 text-yellow-100 hover:bg-yellow-800' : 'bg-white/40 text-yellow-950 hover:bg-white/60 border border-white/50 backdrop-blur-sm'}`}
            >
              <Heart className={`w-4 h-4 mr-2 ${isFav ? 'fill-current text-yellow-100' : ''}`} /> 
              {isFav ? 'Saved' : 'I needed this today'}
            </Button>
          </CardContent>
        </Card>

        {/* Quick Tips Carousel */}
        <Card className="shadow-sm border-t-4 border-t-navy flex flex-col">
          <CardContent className="p-8 flex-1 flex flex-col justify-center relative">
             <div className="absolute top-4 left-6 text-navy/10 text-8xl font-serif leading-none select-none">"</div>
             <p className="text-navy/50 font-bold uppercase tracking-widest text-xs mb-6 text-center">Quick Tip {currentTipIdx + 1}/{QUICK_TIPS.length}</p>
             <p className="text-xl sm:text-2xl text-navy dark:text-white font-medium text-center relative z-10 min-h-[100px] flex items-center justify-center">
                {QUICK_TIPS[currentTipIdx]}
             </p>
             
             <div className="flex justify-center gap-4 mt-8">
                <Button variant="outline" size="icon" onClick={prevTip} className="rounded-full w-10 h-10 border-gray-200">
                  <ChevronLeft className="w-5 h-5 text-gray-500" />
                </Button>
                <Button variant="outline" size="icon" onClick={nextTip} className="rounded-full w-10 h-10 border-gray-200">
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </Button>
             </div>
          </CardContent>
        </Card>

      </div>

      <div>
        <h2 className="text-2xl font-heading font-bold text-navy dark:text-white mb-6 mt-4">Overcoming Roadblocks</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {TIPS.map((tip, idx) => {
            const Icon = tip.icon;
            return (
              <Card key={idx} className={`shadow-sm border-t-4 border-l-0 border-r-0 border-b-0 hover:-translate-y-1 transition-transform duration-300 ${tip.color.split(' ')[2]}`}>
                <CardContent className="p-5">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 ${tip.color.split(' ')[0]} ${tip.color.split(' ')[1]}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-gray-800 dark:text-white mb-2">{tip.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{tip.text}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
      
      {/* Show Favourites if any exist */}
      {favouriteAffirmations.length > 0 && (
        <div className="pt-8">
          <h2 className="text-lg font-bold text-gray-400 uppercase tracking-widest mb-4">Saved Affirmations</h2>
          <div className="flex flex-wrap gap-2">
            {favouriteAffirmations.map((a, i) => (
              <span key={i} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-4 py-2 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 shadow-sm flex items-center gap-2">
                <Heart className="w-3 h-3 text-coral fill-coral" /> {a}
              </span>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}