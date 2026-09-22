path = "artifacts/ielts-tracker/src/App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Widen every max-w-6xl to max-w-[1400px] across the LandingPage
old_w = "max-w-6xl"
new_w = "max-w-[1400px]"
c1 = content.count(old_w)
content = content.replace(old_w, new_w)
print(f"[{c1}x] max-w-6xl -> max-w-[1400px]")

# 2. Boost the What's Next Mountain illustration's visibility (was too faint)
old_mountain = '<Mountain className="absolute -right-5 -bottom-4 h-24 w-24 opacity-[0.08] pointer-events-none" style={{ color: \'#6B46C1\' }} />'
new_mountain = '<Mountain className="absolute -right-4 -bottom-3 h-32 w-32 opacity-[0.18] pointer-events-none" style={{ color: \'#6B46C1\' }} />'
c2 = content.count(old_mountain)
content = content.replace(old_mountain, new_mountain)
print(f"[{c2}x] Mountain illustration visibility boosted")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
