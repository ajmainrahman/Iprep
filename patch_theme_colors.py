path = "artifacts/ielts-tracker/src/index.css"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

replacements = [
    ("--color-purple: #7B5EA7;", "--color-purple: #6c3fe8;"),
    ("--font-sans:    'Outfit', sans-serif;", "--font-sans:    'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif;"),
    ("--font-heading: 'Poppins', sans-serif;", "--font-heading: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif;"),
    ("--primary: 166 82% 22%;\n  --primary-foreground: 0 0% 100%;\n\n  --secondary: 210 30% 14%;\n  --secondary-foreground: 0 0% 100%;\n\n  --muted: 240 17% 94%;\n  --muted-foreground: 240 9% 48%;\n\n  --accent: 166 82% 22%;\n  --accent-foreground: 0 0% 100%;",
     "--primary: 256 79% 58%;\n  --primary-foreground: 0 0% 100%;\n\n  --secondary: 210 30% 14%;\n  --secondary-foreground: 0 0% 100%;\n\n  --muted: 240 17% 94%;\n  --muted-foreground: 240 9% 48%;\n\n  --accent: 256 79% 58%;\n  --accent-foreground: 0 0% 100%;"),
    ("  --ring: 166 82% 22%;\n\n  --card: 0 0% 100%;", "  --ring: 256 79% 58%;\n\n  --card: 0 0% 100%;"),
    ("--apps-accent: #684888;\n  --apps-accent-light: #EAD4FB;",
     "--apps-accent: #6c3fe8;\n  --apps-accent-light: #a972ed;\n  --apps-accent-pale: #dae5f7;"),
]

for old, new in replacements:
    count = content.count(old)
    content = content.replace(old, new)
    print(f"[{count}x] {old.strip().splitlines()[0][:55]}...")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
