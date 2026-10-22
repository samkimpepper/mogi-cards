"""Report session logs not listed as analysis targets in cumulative reviews."""

from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit


def pending_sessions(root: Path) -> list[Path]:
    directory = root / "head-test"
    sessions = {path.resolve() for path in directory.glob("*-session-end-analysis.md")
                if path.is_file()}
    covered = set()
    for review in sorted(directory.glob("*-learning-observation-cumulative-review.md")):
        if not review.is_file():
            continue
        text = review.read_text(encoding="utf-8")
        heading = re.search(r"^##\s+(?:\d+\.\s*)?분석 대상 세션 로그\s*$", text, re.M)
        if heading is None:
            raise ValueError(f"분석 대상 세션 로그 절 없음: {review.name}")
        section = re.split(r"^##\s+", text[heading.end():], maxsplit=1, flags=re.M)[0]
        # Count explicit local link targets only; passing mentions elsewhere do not count.
        for target in re.findall(r"\[[^\]\n]*\]\(([^)\n]+)\)", section):
            url = urlsplit(target.strip().strip("<>"))
            if not url.scheme and not url.netloc:
                path = (review.parent / unquote(url.path)).resolve()
                if path in sessions:
                    covered.add(path)
    return sorted(sessions - covered)


def hook_text(root: Path) -> str:
    count = len(pending_sessions(root))
    return (f"누적 검토 미반영 종료 기록: {count}개 (검토 기준: 4~5개)\n"
            "집계: head-test 바로 아래 종료 기록 중 기존 누적 검토의 분석 대상 목록에 없는 파일.")


if __name__ == "__main__":
    try:
        print(hook_text(Path(__file__).resolve().parents[1]))
    except (OSError, ValueError) as error:
        print(f"누적 검토 개수 조회 실패: {error}", file=sys.stderr)
        sys.exit(1)
