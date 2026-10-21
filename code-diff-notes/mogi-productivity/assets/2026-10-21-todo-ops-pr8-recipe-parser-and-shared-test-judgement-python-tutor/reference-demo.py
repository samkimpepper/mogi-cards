recipes, cur, in_goal = [], None, False
cur = {"head": "실비청구", "line": 21, "kw": {"실비청구"}}
recipes.append(cur)
in_goal = True
cur["kw"].update({"실비", "청구"})
in_goal = False
cur = {"head": "회사에서 도수치료 방문", "line": 27, "kw": {"도수치료"}}
recipes.append(cur)
in_goal = False
