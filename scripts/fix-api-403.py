"""
批量修复：后台 API 权限拒绝返回 500 的问题。

背景：
  requirePermission() 抛 HttpError(403)，但绝大多数 admin route 没有捕获它
  → 异常冒泡到 Next.js → 返回 500 而不是 403。
  （实测：viewer 改订单返回 500，语义完全错，前端也分不清"没权限"和"服务器炸了"）

修法：
  给每个导出方法体外包一层 try/catch，HttpError → 对应状态码，其他 → 500。
  已正确处理 HttpError 的文件跳过（避免重复包）。

用法：python scripts/fix-api-403.py
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
API = ROOT / "src" / "app" / "api" / "admin"

# 匹配 export async function NAME(...) {
EXPORT_RE = re.compile(r"export\s+async\s+function\s+(\w+)\s*\(")


def find_body_bounds(text: str, start: int):
    """从 start（函数名后的 '(' 位置）开始，找到参数括号结束与函数体 { } 的范围。"""
    # 找参数括号结束
    i = text.index("(", start)
    depth = 0
    while i < len(text):
        c = text[i]
        if c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
            if depth == 0:
                break
        i += 1
    # 找到函数体开始的 {
    j = text.index("{", i)
    # 配对
    depth = 0
    k = j
    in_str = None
    in_line_comment = False
    while k < len(text):
        c = text[k]
        nxt = text[k + 1] if k + 1 < len(text) else ""
        if in_line_comment:
            if c == "\n":
                in_line_comment = False
        elif in_str:
            if c == "\\":
                k += 1
            elif c == in_str:
                in_str = None
        elif c == "/" and nxt == "/":
            in_line_comment = True
        elif c in "\"'`":
            in_str = c
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return j, k
        k += 1
    raise ValueError("未找到函数体结尾")


def process(path: Path):
    text = path.read_text(encoding="utf-8")

    if "instanceof HttpError" in text:
        return "skip", 0

    # 确保 import 了 HttpError 与 apiFail
    need_import = True
    if re.search(r"import\s*\{[^}]*HttpError[^}]*\}\s*from\s*'@/lib/auth'", text):
        need_import = False

    out = text
    count = 0
    # 从后往前改，避免偏移量失效
    matches = list(EXPORT_RE.finditer(text))
    targets = []
    for m in matches:
        try:
            b_open, b_close = find_body_bounds(text, m.end() - 1)
            targets.append((b_open, b_close))
        except Exception as e:
            print(f"  ⚠️ 跳过 {m.group(1)}: {e}")
    for b_open, b_close in reversed(targets):
        body = out[b_open + 1 : b_close]
        # body 已含首尾换行
        indented = "\n".join(("  " + ln) if ln.strip() else ln for ln in body.split("\n"))
        new = (
            "{\n"
            "  try {\n"
            + indented
            + "\n  } catch (e) {\n"
            "    return apiFail(e);\n"
            "  }\n"
            "}"
        )
        out = out[:b_open] + new + out[b_close + 1 :]
        count += 1

    if count == 0:
        return "noop", 0

    if need_import:
        # 在最后一个 import 后插入
        imports = list(re.finditer(r"^import .*?;$", out, re.M))
        if imports:
            last = imports[-1]
            add = (
                "\nimport { HttpError } from '@/lib/auth';\n"
                "import { apiFail } from '@/lib/api-fail';"
            )
            out = out[: last.end()] + add + out[last.end():]

    path.write_text(out, encoding="utf-8")
    return "fixed", count


def main():
    total = 0
    for p in sorted(API.rglob("route.ts")):
        try:
            status, n = process(p)
        except Exception as e:
            print(f"❌ {p}: {e}")
            continue
        if status == "fixed":
            total += n
            print(f"✅ {p.relative_to(ROOT)}  包裹 {n} 个方法")
        elif status == "skip":
            print(f"⏭️  {p.relative_to(ROOT)}  已处理")
    print(f"\n共修复 {total} 个方法")


if __name__ == "__main__":
    main()
