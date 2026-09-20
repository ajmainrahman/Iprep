path = "artifacts/ielts-tracker/index.html"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '<link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Poppins:wght@600;700;800;900&display=swap" rel="stylesheet">'
new = old + '\n    <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&display=swap" rel="stylesheet">'

count = content.count(old)
content = content.replace(old, new)
print(f"Font link added: {count} occurrence(s)")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
