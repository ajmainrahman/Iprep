path = "artifacts/ielts-tracker/src/App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = "  Rocket, ArrowUpRight, ListChecks, CircleCheckBig,"
new = "  Rocket, ArrowUpRight, ListChecks, CircleCheckBig, ChevronDown,"

count = content.count(old)
content = content.replace(old, new)
print(f"Import updated: {count} occurrence(s)")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
