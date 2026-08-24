#!/bin/sh

set -eu

mogi_repo_root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
mogi_preamble="$mogi_repo_root/guide-tutor-preamble.md"
mogi_head_guide="$mogi_repo_root/guide-mogi-head-test.md"
mogi_head_dir="$mogi_repo_root/head-test"
mogi_dashboard_url="http://127.0.0.1:8766"

for mogi_required_file in "$mogi_preamble" "$mogi_head_guide"; do
  if [ ! -f "$mogi_required_file" ]; then
    echo "mogi-cards SessionStart hook: required file missing: $mogi_required_file" >&2
    exit 1
  fi
done

mogi_latest_review=$(
  find "$mogi_head_dir" -maxdepth 1 -type f \
    -name '*-learning-observation-cumulative-review.md' -print 2>/dev/null \
    | LC_ALL=C sort \
    | tail -n 1
)

mogi_total_bytes=$(wc -c < "$mogi_preamble")
mogi_total_bytes=$((mogi_total_bytes + $(wc -c < "$mogi_head_guide")))

if [ -n "$mogi_latest_review" ]; then
  mogi_review_label=${mogi_latest_review##*/}
  mogi_review_route="head-test/$mogi_review_label"
  mogi_handoff_status="$mogi_review_label 읽음"
else
  mogi_review_label="누적 검토 없음"
  mogi_review_route=""
  mogi_handoff_status="$mogi_review_label"
fi

if [ "$mogi_total_bytes" -gt 40000 ]; then
  echo "mogi-cards SessionStart hook: tutor context is ${mogi_total_bytes} bytes; 40000-byte safety cap exceeded" >&2
  exit 1
fi

printf '%s\n' \
  '# mogi-cards 과외 세션 자동 인수인계' \
  '' \
  '아래 원문은 프로젝트 로컬 SessionStart 훅이 불러온 현재 과외 지시다.' \
  '시작 인사 전에 과외냥이는 `node review-dashboard/start.mjs`를 실행해 상태판을 시작하거나 기존 서버를 재사용한다.' \
  '로컬 포트 권한 때문에 실패하면 모기에게 명령을 넘기지 말고 과외냥이가 좁은 권한 상승으로 다시 실행한다.' \
  '시작 인사에 반드시 다음 두 줄로 실제 판독 파일과 확인된 상태판 링크를 알린다.' \
  "학습 인수인계: $mogi_handoff_status" \
  "읽은 문서 상태판: $mogi_dashboard_url" \
  '' \
  "## $mogi_preamble" \
  ''
sed -n '1,$p' "$mogi_preamble"

printf '\n%s\n\n' "## $mogi_head_guide"
sed -n '1,$p' "$mogi_head_guide"

if [ -n "$mogi_latest_review" ]; then
  printf '\n%s\n\n' '## 최신 학습 관찰 누적 검토 원문 라우팅'
  printf '%s\n\n' "원문 경로: $mogi_review_route"
  printf '%s\n' '시작 인사 전에 이 원문 전체를 직접 읽는다. 그중 `다음 세션에서 실제로 바꿀 것` 1~2개와 이미 효용이 관찰된 설명·외부화 방식만 이번 세션 행동으로 인수한다.'
else
  printf '\n%s\n' '## 최신 학습 관찰 누적 검토: 없음'
fi
