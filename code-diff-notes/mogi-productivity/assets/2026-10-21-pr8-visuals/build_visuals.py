#!/usr/bin/env python3
"""Rebuild the PR #8 note's inline PNGs from its pinned Git objects.

uv run --with pillow python build_visuals.py --checkout /path/to/todo-ops
Requires Graphviz (neato); fonts below are the Mac defaults used for this note.
Runs only the selected parser statements and the selected comparison functions
from 73f2b00 in a temporary directory. It never writes to the source checkout.
DOT, observations.json and code excerpts are reproducibility evidence, not notes.
"""
import argparse
import ast
import io
import json
from pathlib import Path
import re
import subprocess
import tempfile

from PIL import Image, ImageDraw, ImageFont

SHA = "73f2b002aa5e47e746a3c9354c0037719d3d8d93"
HERE = Path(__file__).resolve().parent
BLUE, TEAL, INK, MUTED = "#2864ed", "#008f97", "#24354b", "#65788e"
FONT = "/System/Library/Fonts/AppleSDGothicNeo.ttc"
MONO = "/System/Library/Fonts/Menlo.ttc"
ap = argparse.ArgumentParser(description=__doc__)
ap.add_argument("--checkout", type=Path, required=True)
args = ap.parse_args()


def gitfile(name):
    return subprocess.check_output(
        ["git", "-C", str(args.checkout), "show", f"{SHA}:{name}"], text=True
    )


hook = gitfile("scripts/hooks/playbook-hint.sh")
test = gitfile("scripts/test-playbook-hint.sh")
hook_lines, test_lines = hook.splitlines(), test.splitlines()
fixture = test.split("cat > \"$FX\" <<'EOF'\n", 1)[1].split("\nEOF", 1)[0]
body = hook.split("out=$(python3 -c '\n", 1)[1].split("\n' \"$BOOK\"", 1)[0]
# Preserve original shell-file line numbers in the selected Python AST.
offset = hook[:hook.index(body)].count("\n")
tree = ast.parse("\n" * offset + body)
names = {"GENERAL", "STOP", "GENERIC", "SUFFIXES"}
nodes = [n for n in tree.body if (
    isinstance(n, ast.Assign) and any(
        isinstance(t, ast.Name) and t.id in names for t in n.targets
    )
) or (isinstance(n, ast.FunctionDef) and n.name == "words") or 97 <= n.lineno <= 113]
parser_code = compile(ast.Module(body=nodes, type_ignores=[]), "playbook-hint.sh@73f2b00", "exec")
snapshots = []
for n in (21, 23, 25, 27):
    env = {"re": re, "lines": fixture.splitlines()[:n]}
    exec(parser_code, env)
    rs, cur = env["recipes"], env["cur"]
    snapshots.append({
        "document_line": n,
        "in_goal": env["in_goal"],
        "cur_index": next(i for i, r in enumerate(rs) if r is cur),
        "recipes": [{**r, "kw": sorted(r["kw"])} for r in rs],
        "cur_is_list_entry": cur is rs[env["recipes"].index(cur)],
    })
assert [s["cur_index"] for s in snapshots] == [1, 1, 1, 2]
assert [s["in_goal"] for s in snapshots] == [False, True, True, False]
assert set(snapshots[2]["recipes"][1]["kw"]) == {"실비청구", "실비", "청구"}
assert snapshots[3]["recipes"][2]["kw"] == ["도수치료"]
assert snapshots[2]["recipes"][1] == snapshots[3]["recipes"][1]

# Run the original run_hook and judges_hit definitions, against a temporary
# copy of the pinned hook and its exact sed mutation. No real document needed.
with tempfile.TemporaryDirectory(prefix="pr8-visual-") as td:
    tmp = Path(td)
    (tmp / "hook.sh").write_text(hook)
    # The real comparison runs after two append operations on the fixture.
    appended = "\n\n## 고양이 사료 주문\n\n목표 표현: `사료 떨어졌어`.\n\n## 도수치료 서류 요청\n\n목표 표현: `도수치료 서류 받자`.\n"
    (tmp / "PLAYBOOKS.md").write_text(fixture + appended)
    functions = "\n".join(test_lines[30:41])
    sed_line = test_lines[266]
    script = '''set -u
T="$1"; HOOK="$T/hook.sh"; FX="$T/PLAYBOOKS.md"; LOG="$T/fire.jsonl"
'''+functions+"\n"+sed_line+'''
cmp -s "$HOOK" "$T/mut.sh"; same=$?
judges_hit "$FX" "도수치료 12시로 옮겨줘" "회사에서 도수치료 방문"; real_rc=$?
printf '%s' "$OUT" > "$T/normal.txt"
HOOK_UNDER_TEST="$T/mut.sh" judges_hit "$FX" "도수치료 12시로 옮겨줘" "회사에서 도수치료 방문"; mutant_rc=$?
printf '%s' "$OUT" > "$T/mutant.txt"
printf '%s %s %s\\n' "$same" "$real_rc" "$mutant_rc"
'''
    result = subprocess.run(["bash", "-c", script, "visual-check", td], text=True, capture_output=True, check=True)
    different, normal_rc, mutant_rc = map(int, result.stdout.strip().split())
    assert (different, normal_rc, mutant_rc) == (1, 0, 1), result
    judgement = {"normal_grep_exit": normal_rc, "mutant_grep_exit": mutant_rc,
                 "normal_OUT": (tmp / "normal.txt").read_text(),
                 "mutant_OUT": (tmp / "mutant.txt").read_text(),
                 "comparison_passes": different == 1 and normal_rc == 0 and mutant_rc == 1}

(HERE / "observations.json").write_text(json.dumps({
    "sha": SHA, "parser": snapshots, "judgement": judgement,
    "scope": "Selected original parser statements/functions executed locally; not the whole app or full test suite.",
}, ensure_ascii=False, indent=2) + "\n")


def font(size, mono=False):
    return ImageFont.truetype(MONO if mono else FONT, size)


def put(im, xy, text, size=28, fill=INK, mono=False):
    d = ImageDraw.Draw(im)
    if not mono:
        d.text(xy, text, font=font(size), fill=fill, spacing=9)
        return
    x, y = xy
    for part in re.findall(r"[\x00-\x7f]+|[^\x00-\x7f]+", text):
        f = font(size, part.isascii())
        d.text((x, y), part, font=f, fill=fill)
        x += d.textlength(part, font=f)


def code_width(d, text, size):
    return sum(d.textlength(p, font=font(size, p.isascii()))
               for p in re.findall(r"[\x00-\x7f]+|[^\x00-\x7f]+", text))


def box(im, rect, fill="white", outline="#cbd7e7", radius=16):
    ImageDraw.Draw(im).rounded_rectangle(rect, radius=radius, fill=fill, outline=outline, width=2)


def arrow(im, a, b, fill, dashed=False):
    import math
    d = ImageDraw.Draw(im)
    if dashed:
        length = ((b[0]-a[0])**2+(b[1]-a[1])**2)**.5
        for i in range(0, int(length), 16):
            ends = [tuple(a[j]+(b[j]-a[j])*min(t/length, 1) for j in (0, 1)) for t in (i, i+8)]
            d.line(ends, fill=fill, width=3)
    else:
        d.line([a, b], fill=fill, width=4)
    angle = math.atan2(b[1]-a[1], b[0]-a[0])
    d.polygon([b] + [(b[0]-16*math.cos(angle+s), b[1]-16*math.sin(angle+s)) for s in (-.45, .45)], fill=fill)


def reference_graph(s, name):
    # Fixed positions keep equal nodes at equal places across all four scenes.
    def label(t):
        return json.dumps(t, ensure_ascii=False)
    last = s["document_line"] == 27
    r1 = s["recipes"][1]
    kw = "실비청구" if len(r1["kw"]) == 1 else "실비청구, 실비, 청구"
    lines = ["digraph refs {", 'graph [layout=neato, bgcolor="transparent", pad="0.05", dpi=144, splines=line];',
             'node [shape=box, style="rounded,filled", fontname="Apple SD Gothic Neo", fontsize=23, penwidth=1.7, margin="0.15,0.12"];',
             'edge [penwidth=2.5, arrowsize=0.9];',
             'anchor1 [pos="0,0!", label="", shape=point, width=0, style=invis];',
             'anchor2 [pos="760,320!", label="", shape=point, width=0, style=invis];',
             f'cur [pos="105,255!", label="cur", width=2.3, fillcolor="#eaf1ff", color="{BLUE}", fontcolor="{BLUE}"];',
             f'list1 [pos="105,175!", label="recipes[1]", width=2.3, fillcolor="#eafff6", color="{TEAL}", fontcolor="{TEAL}"];',
             f'r1 [pos="515,205!", label={label("R1 · 실비청구"+chr(10)+"line = 21"+chr(10)+"kw = {"+kw+"}")}, width=4.5, fillcolor="#ecfcf5", color="{TEAL}", fontcolor="{TEAL}"];',
             f'flag [pos="105,25!", label="in_goal = {s["in_goal"]}", width=2.3, fillcolor="#f1f4f9", color="#bac9dc", fontsize=21];',
             f'list1:e -> r1:w [color="{TEAL}"];']
    if last:
        lines += [
            f'list2 [pos="105,95!", label="recipes[2]", width=2.3, fillcolor="#eafff6", color="{TEAL}", fontcolor="{TEAL}"];',
            f'r2 [pos="515,65!", label={label("R2 · 회사에서 도수치료 방문"+chr(10)+"line = 27 · kw = {도수치료}")}, width=4.5, fillcolor="#edf3ff", color="{BLUE}", fontcolor="{BLUE}"];',
            f'cur:e -> r2:w [color="{BLUE}"];', f'list2:e -> r2:w [color="{TEAL}"];']
    else:
        lines += [f'cur:e -> r1:w [color="{BLUE}"];']
    lines += ["}"]
    dot = "\n".join(lines)
    (HERE / f"{name}.dot").write_text(dot + "\n")
    data = subprocess.check_output(["neato", "-n2", "-Tpng"], input=dot.encode())
    return Image.open(io.BytesIO(data)).convert("RGBA")


graphs = [reference_graph(s, f"refs-{i+1}") for i, s in enumerate(snapshots)]


def pastefit(im, obj, rect):
    obj = obj.copy()
    obj.thumbnail((rect[2]-rect[0], rect[3]-rect[1]), Image.Resampling.LANCZOS)
    im.paste(obj, (rect[0]+(rect[2]-rect[0]-obj.width)//2, rect[1]+(rect[3]-rect[1]-obj.height)//2), obj if obj.mode == "RGBA" else None)


im = Image.new("RGB", (1800, 1140), "#fbfcfe")
put(im, (35, 24), "같은 객체를 가리키다가, cur만 다음 객체로 이동", 40)
put(im, (35, 79), "실제 가짜 문서의 21 → 23 → 25 → 27행을 읽은 직후 · 원본 파서 구간 실행 관찰", 27, MUTED)
titles = ["01 · 실비청구 제목", "02 · 목표 표현 시작", "03 · 검색 단어 추가", "04 · 다음 제목"]
changes = ["같은 R1을 cur와 recipes[1]에 연결", "in_goal만 False → True", "R1.kw 변경 · 두 참조는 그대로", "cur → R2 · recipes[1] → R1 유지"]
for i, (s, graph) in enumerate(zip(snapshots, graphs)):
    x, y = 30+(i%2)*890, 137+(i//2)*460
    box(im, (x, y, x+860, y+442))
    put(im, (x+22, y+16), titles[i], 32)
    put(im, (x+22, y+59), f'문서 {s["document_line"]}행 직후 · {changes[i]}', 23, MUTED)
    pastefit(im, graph, (x+12, y+106, x+847, y+418))
put(im, (35, 1070), "파랑: cur의 참조  /  청록: 목록 항목의 참조  /  R1·R2: 설명용 객체 이름", 25, MUTED)
put(im, (35, 1103), "앞에서 모은 recipes[0](NEXT)은 모든 컷에서 유지되어 생략 · kw 집합의 표시 순서는 설명용", 24, MUTED)
im.save(HERE / "parser-four-states.png", optimize=True)


def code_panel(im, rect, lines, numbers, highlight=(), size=22):
    box(im, rect, "#f5f7fb")
    x, y = rect[0]+18, rect[1]+16
    max_w = rect[2]-x-16
    d = ImageDraw.Draw(im)
    for n in numbers:
        raw = lines[n-1]
        # Pure visual wrapping; continuation lines have no invented source number.
        chunks = []
        part = ""
        for ch in raw:
            if code_width(d, part+ch, size) > max_w-65:
                split = part.rfind(" ", len(part)//2)
                if split > 0:
                    chunks.append(part[:split+1]); part = part[split+1:]
                else:
                    chunks.append(part); part = ""
            part += ch
        chunks.append(part)
        for j, chunk in enumerate(chunks):
            if y+size+8 > rect[3]:
                raise ValueError(f"Code panel overflow at source line {n}")
            if n in highlight:
                d.rectangle((x-5, y-2, rect[2]-10, y+size+8), fill="#e2ecff")
            put(im, (x, y), str(n) if j == 0 else ">", size-2, MUTED, True)
            put(im, (x+58, y), chunk, size, INK, True)
            y += size+12
    return y


# A readable original-code / corresponding-state pair, in addition to the
# simultaneous overview. This is the same note's inline reading material.
im = Image.new("RGB", (1800, 1100), "#fbfcfe")
put(im, (30, 22), "코드 왼쪽 · 27행까지 읽은 상태 오른쪽", 40)
put(im, (30, 78), "scripts/hooks/playbook-hint.sh · 73f2b00 · 97–113행 원본 발췌 (긴 줄은 시각적으로만 접음)", 27, MUTED)
code_panel(im, (28, 132, 1000, 1005), hook_lines, range(97, 114), (101, 102, 103, 113), 23)
box(im, (1020, 132, 1772, 1005))
put(im, (1045, 159), "④ 문서 27행의 새 제목을 읽은 직후", 30)
pastefit(im, graphs[3], (1034, 246, 1760, 660))
put(im, (1045, 722), "101행: 새 딕셔너리를 만들어 cur에 연결", 27)
put(im, (1045, 775), "102행: 같은 새 객체를 recipes에 추가", 27)
put(im, (1045, 828), "103행: in_goal을 False로 되돌림", 27)
put(im, (1045, 900), "이전 R1의 kw는 지우지 않아.", 28, TEAL)
put(im, (30, 1032), "R1.kw의 실비·청구는 앞선 25행에서 113행 코드로 추가한 값 · 실제 문서 27행에서는 101–104행 실행", 25, MUTED)
im.save(HERE / "parser-code-and-state.png", optimize=True)


im = Image.new("RGB", (1800, 1140), "#fbfcfe")
put(im, (30, 22), "같은 judges_hit() · 실행 대상과 반환 결과를 비교", 40)
put(im, (30, 79), "scripts/test-playbook-hint.sh · 73f2b00 · 원본 함수 발췌 + 두 호출을 직접 실행한 결과", 27, MUTED)
code_panel(im, (28, 135, 780, 675), test_lines, range(37, 42), (39, 40), 23)
put(im, (45, 698), "호출 입력은 두 번 모두 같아", 29)
put(im, (45, 750), "문서: $FX (시험용 PLAYBOOKS.md)", 27)
put(im, (45, 795), "문장: 도수치료 12시로 옮겨줘", 27)
put(im, (45, 840), "기대 제목: 회사에서 도수치료 방문", 27)
put(im, (45, 920), "정상: 271행 · 기본 $HOOK 사용", 25, TEAL)
put(im, (45, 963), "사본: 273행 · HOOK_UNDER_TEST 교체", 25, BLUE)
xs = [865, 1190, 1515]
for x, title in zip(xs, ("비교 시험", "judges_hit()", "run_hook()")):
    box(im, (x-75, 138, x+215, 194), "#f1f5fb")
    put(im, (x-58, 149), title, 26)
    ImageDraw.Draw(im).line((x+65, 194, x+65, 971), fill="#c5d1df", width=2)
for y, color, bg, label_, out, rc in (
    (225, TEAL, "#ebfbf3", "정상 훅", "안내 문자열 있음", 0),
    (615, BLUE, "#eef4ff", "무출력 사본", "빈 문자열", 1),
):
    box(im, (805, y, 1770, y+342), bg, color)
    put(im, (824, y+12), label_, 28, color)
    a, b, c = [x+65 for x in xs]
    arrow(im, (a, y+82), (b, y+82), color)
    put(im, (a+10, y+48), "같은 입력·기대 제목", 22, color)
    arrow(im, (b, y+146), (c, y+146), color)
    put(im, (b+10, y+110), "문서·문장 → 선택한 훅", 21, color)
    arrow(im, (c, y+213), (b, y+213), color, dashed=True)
    put(im, (b+10, y+174), "OUT ← "+out, 21, color)
    arrow(im, (b, y+280), (a, y+280), color, dashed=True)
    put(im, (a+10, y+241), f"grep 종료 코드 {rc}", 23, color)
put(im, (821, 979), "실선: 호출 →  /  점선: 출력·종료 코드가 돌아옴", 23, MUTED)
box(im, (30, 1035, 1770, 1112), "#fff8e8", "#e8b84c")
put(im, (58, 1056), "비교 시험 통과 = 사본 생성 확인 + 정상 판정 0 + 사본 판정 1   (268–276행)", 31, "#78561a")
im.save(HERE / "test-code-and-comparison.png", optimize=True)

for filename, lines, start, end in (
    ("parser-original.txt", hook_lines, 97, 113),
    ("judgement-original.txt", test_lines, 31, 48),
    ("comparison-original.txt", test_lines, 266, 278),
):
    (HERE / filename).write_text("\n".join(f"{n:3}  {lines[n-1]}" for n in range(start, end+1))+"\n")
print("Generated 3 inline PNGs, 4 DOT sources, original excerpts and observations.json at", HERE)
