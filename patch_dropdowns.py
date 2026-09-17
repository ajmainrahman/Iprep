path = "artifacts/ielts-tracker/src/pages/HigherStudyPrep.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

EXCLUDE = "(['shortlisted', 'preparing', 'under_review', 'accepted', 'deferred'] as AppStatus[]).includes(status))"

old_inline = "{(Object.entries(APP_STATUS_META) as [AppStatus, typeof APP_STATUS_META[AppStatus]][]).map(([key, value]) => <SelectItem key={key} value={key}>{value.label}</SelectItem>)}"
new_inline = "{(Object.entries(APP_STATUS_META) as [AppStatus, typeof APP_STATUS_META[AppStatus]][]).filter(([status]) => !" + EXCLUDE + ".map(([key, value]) => <SelectItem key={key} value={key}>{value.label}</SelectItem>)}"

count1 = content.count(old_inline)
content = content.replace(old_inline, new_inline)
print(f"Inline SelectItem pattern: replaced {count1} occurrence(s)")

old_multiline = """{(Object.entries(APP_STATUS_META) as [AppStatus, typeof APP_STATUS_META[AppStatus]][]).map(([key, value]) => (
                  <SelectItem key={key} value={key}>{value.label}</SelectItem>
                ))}"""
new_multiline = """{(Object.entries(APP_STATUS_META) as [AppStatus, typeof APP_STATUS_META[AppStatus]][])
                  .filter(([status]) => !""" + EXCLUDE + """
                  .map(([key, value]) => (
                  <SelectItem key={key} value={key}>{value.label}</SelectItem>
                ))}"""

count2 = content.count(old_multiline)
content = content.replace(old_multiline, new_multiline)
print(f"Multiline SelectItem pattern: replaced {count2} occurrence(s)")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
