path = "artifacts/ielts-tracker/src/components/ui/select.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = "max-h-[--radix-select-content-available-height]"
new = "max-h-[var(--radix-select-content-available-height)]"

count = content.count(old)
content = content.replace(old, new)
print(f"Fixed max-h var() wrapper: {count} occurrence(s)")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
