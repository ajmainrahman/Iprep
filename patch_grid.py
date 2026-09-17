path = "artifacts/ielts-tracker/src/pages/HigherStudyPrep.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_grid = '<div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">'
new_grid = '<div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">'

count = content.count(old_grid)
content = content.replace(old_grid, new_grid)
print(f"Application pulse grid: replaced {count} occurrence(s)")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
