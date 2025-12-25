# URL Hash Format Improvements

## Summary
Redesigned the URL hash format to be **compact, readable, and shareable**. The new format reduces URL length from 200+ characters to ~60 characters while improving clarity.

## New Format

### Basic Syntax
```
#seed=COLOR,harm=MODE[,lTOKEN=HEX][,dTOKEN=HEX]
```

### Examples

**Simple seed + harmony:**
```
http://localhost:8000/#seed=A7C39F,harm=split-complementary
```

**With light theme override:**
```
http://localhost:8000/#seed=A7C39F,harm=split-complementary,lcanv=E5F6CA
```

**With both light and dark theme overrides:**
```
http://localhost:8000/#seed=A7C39F,lcanv=E5F6CA,dcard=313230
```

**Named color (no hex needed):**
```
http://localhost:8000/#seed=red,harm=triadic
```

## Parameters

| Parameter | Example | Description |
|-----------|---------|-------------|
| `seed` | `seed=A7C39F` | Seed/accent color (hex or color name) |
| `harm` | `harm=split-complementary` | Harmony mode |
| `l[token]` | `lcanv=E5F6CA` | Light theme token override |
| `d[token]` | `dcard=313230` | Dark theme token override |

## Token Abbreviations

All tokens can be used with theme prefix (`l` for light, `d` for dark):

| Short | Full Name | Short | Full Name |
|-------|-----------|-------|-----------|
| `canv` | canvas | `ans` | accentNonContentStrong |
| `crd` | card | `ansub` | accentNonContentSubdued |
| `anb` | accentNonContentBaseline | `ansf` | accentNonContentSoft |
| `acb` | accentContentBaseline | `acs` | accentContentStrong |
| `acsub` | accentContentSubdued | `acsf` | accentContentSoft |
| `nnb` | neutralNonContentBaseline | `nns` | neutralNonContentStrong |
| `nnsub` | neutralNonContentSubdued | `nnsf` | neutralNonContentSoft |
| `ncb` | neutralContentBaseline | `ncs` | neutralContentStrong |
| `ncsub` | neutralContentSubdued | `ncsf` | neutralContentSoft |

## Backwards Compatibility

The old format is still supported for existing links:
```
#colors=light.seed=A7C39F,accent=A7C39F,harmony=split-complementary
```

Parsing automatically detects and handles both formats.

## Benefits

1. **Shorter URLs** - ~60 chars vs 200+ chars
2. **Clearer Parameters** - `seed=` vs `accent=`, `harm=` vs `harmony=`
3. **Easier to Share** - Shorter links in chat, docs, email
4. **More Consistent** - All parameters are 4 characters or less
5. **Better Readability** - Parameter names clearly indicate their purpose
6. **Backwards Compatible** - Old links still work

## Implementation

- `parseHashToOverrides()` in `js/main.js` - Parses both formats
- `setHashFromOverrides()` in `js/main.js` - Generates new compact format
- Automatic conversion happens on page load and when colors change
