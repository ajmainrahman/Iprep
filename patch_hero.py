path = "artifacts/ielts-tracker/src/App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_hero = """      {/* Hero */}
      <div className="relative w-full overflow-hidden" style={{ minHeight: 'clamp(360px, 46vw, 480px)' }}>
        <img
          src="/images/hero-nordic.jpg"
          alt="A study desk overlooking a Nordic fjord town at sunset, with mountains, national flags, and a journal reading Plan: Learn, Explore, Grow, Inspire"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(100deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.82) 26%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0.05) 68%, rgba(255,255,255,0) 82%)' }}
        />

        {/* Floating quote card */}
        <div
          className="hidden lg:block absolute top-8 right-8 max-w-[220px] rounded-2xl px-5 py-4"
          style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(6px)', boxShadow: '0 8px 30px rgba(0,0,0,0.10)' }}
        >
          <p className="text-[26px] leading-none mb-1" style={{ color: '#684888' }}>&ldquo;</p>
          <p className="text-[13px] leading-snug text-foreground/80 mb-2">
            The best way to predict your future is to create it.
          </p>
          <p className="text-[11.5px] font-semibold text-muted-foreground">&mdash; Abraham Lincoln</p>
        </div>

        <div className="relative z-10 flex h-full flex-col justify-center px-6 sm:px-10 py-8 max-w-2xl">
          <div className="inline-flex w-fit items-center gap-2 px-3.5 py-1 rounded-full mb-4 text-[10.5px] font-bold tracking-widest uppercase bg-white"
            style={{ color: '#684888', border: '1px solid #EAD4FB' }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#684888' }} />
            Your IELTS &amp; Higher Study Platform
          </div>
          <h1 className="font-black leading-[1.05] mb-3"
            style={{ fontFamily: "'Poppins', sans-serif", fontSize: 'clamp(2.1rem, 5vw, 3.1rem)', letterSpacing: '-0.02em' }}>
            <span className="block text-foreground">Within a Few</span>
            <span className="block" style={{ color: '#684888' }}>Weeks</span>
          </h1>
          <p className="max-w-md text-[14px] leading-relaxed text-foreground/70 mb-6">
            One place to prepare for IELTS, manage university applications, and stay on track toward your next academic goal.
          </p>

          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white" style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
              <span className="text-xl">🔥</span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-orange-600">Study Streak</p>
                <p className="text-lg font-black leading-none text-orange-600">{streak > 0 ? `${streak} ${streak === 1 ? 'day' : 'days'}` : 'Start today'}</p>
              </div>
            </div>
            <button
              onClick={() => setLocation('/study/scores')}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white text-left transition-transform hover:-translate-y-0.5"
              style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
            >
              <Target className="h-5 w-5" style={{ color: '#684888' }} />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#684888' }}>IELTS Exam</p>
                <p className="text-lg font-black leading-none" style={{ color: '#684888' }}>
                  {examDays === null ? 'Not set' : examDays < 0 ? 'Passed' : fmtDays(examDays)}
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>"""

new_hero = """      {/* Hero */}
      <div className="px-5 sm:px-8 pt-6">
        <div
          className="max-w-6xl mx-auto rounded-[32px] overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #FDEBDA 0%, #FBEAF3 45%, #F0E9FB 100%)' }}
        >
          <div className="grid lg:grid-cols-[1fr_1.05fr] items-center gap-6 sm:gap-10 p-6 sm:p-10">

            {/* Left: text content */}
            <div>
              <div className="inline-flex w-fit items-center gap-2 px-3.5 py-1 rounded-full mb-4 text-[10.5px] font-bold tracking-widest uppercase bg-white"
                style={{ color: '#EA6A1F', border: '1px solid #FBD3AC' }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#FB923C' }} />
                Your IELTS &amp; Higher Study Platform
              </div>
              <h1 className="font-black leading-[1.05] mb-3"
                style={{ fontFamily: "'Poppins', sans-serif", fontSize: 'clamp(2.1rem, 5vw, 3.1rem)', letterSpacing: '-0.02em' }}>
                <span className="block text-foreground">Within a Few</span>
                <span className="block bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg, #FB923C, #EC4899)' }}>Weeks</span>
              </h1>
              <p className="max-w-md text-[14px] leading-relaxed text-foreground/70 mb-6">
                One place to prepare for IELTS, manage university applications, and stay on track toward your next academic goal.
              </p>

              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white" style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full text-lg" style={{ backgroundColor: '#FFE3C7' }}>🔥</span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-orange-600">Study Streak</p>
                    <p className="text-lg font-black leading-none text-orange-600">{streak > 0 ? `${streak} ${streak === 1 ? 'day' : 'days'}` : 'Start today'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setLocation('/study/scores')}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white text-left transition-transform hover:-translate-y-0.5"
                  style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: '#EAD4FB' }}>
                    <Target className="h-4.5 w-4.5" style={{ color: '#684888' }} />
                  </span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#684888' }}>IELTS Exam</p>
                    <p className="text-lg font-black leading-none" style={{ color: '#684888' }}>
                      {examDays === null ? 'Not set' : examDays < 0 ? 'Passed' : fmtDays(examDays)}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Right: framed hero image */}
            <div className="relative rounded-[28px] overflow-hidden" style={{ minHeight: 280, boxShadow: '0 20px 50px rgba(0,0,0,0.14)' }}>
              <img
                src="/images/hero-nordic.jpg"
                alt="A study desk overlooking a Nordic fjord town at sunset, with mountains, national flags, and a journal reading Plan: Learn, Explore, Grow, Inspire"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <p
                className="absolute bottom-5 right-6 text-right text-white leading-tight"
                style={{ fontFamily: "'Caveat', cursive", fontSize: '26px', textShadow: '0 2px 10px rgba(0,0,0,0.45)' }}
              >
                Better Skills<br />Bigger Opportunities
              </p>
            </div>
          </div>
        </div>
      </div>"""

count = content.count(old_hero)
content = content.replace(old_hero, new_hero)
print(f"Hero block: {count} occurrence(s)")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
