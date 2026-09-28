def patch(path, old, new, label):
    with open(path, encoding="utf-8") as f:
        c = f.read()
    if new in c:
        print(f"[skip] {label} already applied")
        return
    n = c.count(old)
    if n != 1:
        print(f"[FAIL] {label}: found {n} matches, expected 1")
        return
    with open(path, "w", encoding="utf-8") as f:
        f.write(c.replace(old, new))
    print(f"[ok]   {label}")

patch("lib/db/src/schema/higher-study-applications.ts",
      '  deadline: text("deadline"),\n  appliedDate: text("applied_date"),',
      '  deadline: text("deadline"),\n  startDate: text("start_date"),\n  appliedDate: text("applied_date"),',
      "applications DB schema")

patch("lib/db/src/schema/scholarships.ts",
      '  deadline: text("deadline"),\n  status: text("status").notNull().default("planning"),',
      '  deadline: text("deadline"),\n  startDate: text("start_date"),\n  status: text("status").notNull().default("planning"),',
      "scholarships DB schema")

patch("artifacts/api-server/src/routes/higher-study-applications.ts",
      '  deadline: z.string().nullable().optional(),\n  appliedDate: z.string().nullable().optional(),',
      '  deadline: z.string().nullable().optional(),\n  startDate: z.string().nullable().optional(),\n  appliedDate: z.string().nullable().optional(),',
      "applications API validation")

patch("artifacts/api-server/src/routes/scholarships.ts",
      '  deadline: z.string().nullable().optional(),\n  status: z.string().optional(),',
      '  deadline: z.string().nullable().optional(),\n  startDate: z.string().nullable().optional(),\n  status: z.string().optional(),',
      "scholarships API validation")
