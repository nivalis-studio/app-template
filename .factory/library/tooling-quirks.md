# Tooling Quirks and Gotchas

## Lefthook

### YAML Quoting for Commands with Colons
Lefthook commands that contain colons (`:`) need to be quoted to avoid YAML parsing errors. Use block scalars or quote the entire command string.

### wc -l False Positive on Multiple Files
The `wc -l` command outputs a "total" summary line when given multiple files. For example:
```
  100 file1.ts
  200 file2.ts
  300 total
```
If you're checking for files exceeding a line count threshold with `wc -l {staged_files} | awk`, the "total" line can trigger a false positive. Fix by filtering it out:
```bash
wc -l {staged_files} | grep -v ' total$' | awk '$1 > 500 { print "File too large:", $2; exit 1 }'
```

## Syncpack

### yaml Dependency for Dynamic Catalog Reading
The `yaml` package is a devDependency solely to support `.syncpackrc.mjs`'s dynamic reading of pnpm-workspace.yaml catalog entries. This pattern allows syncpack to automatically enforce catalog protocol usage without manual configuration updates. If syncpack adds native catalog support in a future version, this dependency can be removed.

## jscpd

### Generated Files in Ignore List
The `.jscpd.json` ignore list should include `**/src/prisma/client/**` to avoid false duplication reports from generated Prisma client code. Currently not included — may need to be added if false positives become noisy.
