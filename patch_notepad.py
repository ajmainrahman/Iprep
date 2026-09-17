path = "artifacts/ielts-tracker/src/pages/FlyNotepad.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '<p className="text-sm text-foreground/75 mt-2 whitespace-pre-wrap line-clamp-4">{n.content}</p>'
new = '<p className="text-sm text-foreground/75 mt-2 whitespace-pre-wrap">{n.content}</p>'

count = content.count(old)
content = content.replace(old, new)
print(f"Removed line-clamp-4: {count} occurrence(s)")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
