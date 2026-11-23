"""Повторы последних тренировок в план (как кнопка «Повторить в плане»): те же упражнения, вес и повторы
каждого подхода, как сделал; несделанное — как было запланировано. Вход — notebook.json, выход — JSON для отправки."""
import json
import sys
from datetime import datetime

src = json.load(open(sys.argv[1], encoding="utf-8"))
NOW = int(datetime.now().timestamp() * 1000)
MON = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]
# Порядок по кругу после последней (7.11, становая): присед уже стоит запланированной страницей, дальше грудь, становая, присед.
ORDER = [("nb-2026-11-05", 0.6), ("nb-2026-11-07", 0.7), ("nb-2026-10-15", 0.8)]


def first(v):
    import re
    m = re.search(r"\d+(?:[.,]\d+)?", str(v))
    return m.group(0).replace(",", ".") if m else ""


def pi(pid, k, it):
    done = [x for x in it["sets"] if x["done"]]
    base = {"id": f"{pid}-i{k}", "names": [], "weight": "", "reps": "", "sets": 4, "each": [], "pct": "65, 75, 85",
            "lastMax": True, "drops": "", "note": it.get("note", "") if done else ""}
    if it["kind"] == "combo":
        use = done or it["sets"]
        return {**base, "kind": "combo", "name": it["name"], "names": it["names"], "mode": "same",
                "weight": use[0]["w"], "reps": use[0]["r"], "sets": len(use)}
    each = [{"w": x["w"], "r": x["r"]} for x in done] if done else [{"w": first(x["w"]) or x["w"], "r": x["r"]} for x in it["plan"]["sets"]]
    drops = next((x["drops"] for x in done if x["drops"]), [])
    return {**base, "kind": "ex", "name": it["name"], "mode": "each", "each": each, "sets": len(each),
            "drops": ", ".join(d["w"] or "0" for d in drops)}


plans = []
for sid, ord_ in ORDER:
    s = next(x for x in src["sessions"] if x["id"] == sid)
    d = datetime.fromtimestamp(s["start"] / 1000)
    pid = f"repeat-{sid}"
    plans.append({"id": pid, "ord": ord_, "programId": s["programId"], "title": s["title"],
                  "desc": f"Повтор тренировки {d.day} {MON[d.month - 1]}: вес и повторы как в прошлый раз",
                  "warmup": 3, "items": [pi(pid, k, it) for k, it in enumerate(s["items"])], "upd": NOW, "sessionId": None})

json.dump({"exercises": [], "gyms": [], "programs": [], "plans": plans, "sessions": []}, sys.stdout, ensure_ascii=False, indent=1)
