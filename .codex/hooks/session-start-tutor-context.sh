#!/bin/sh

set -eu

mogi_repo_root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
mogi_preamble="$mogi_repo_root/guide-tutor-preamble.md"
mogi_head_guide="$mogi_repo_root/guide-mogi-head-test.md"
mogi_head_dir="$mogi_repo_root/head-test"

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
  mogi_total_bytes=$((mogi_total_bytes + $(wc -c < "$mogi_latest_review")))
  mogi_review_label=${mogi_latest_review##*/}
else
  mogi_review_label="누적 검토 없음"
fi

if [ "$mogi_total_bytes" -gt 40000 ]; then
  echo "mogi-cards SessionStart hook: tutor context is ${mogi_total_bytes} bytes; 40000-byte safety cap exceeded" >&2
  exit 1
fi

printf '%s\n' \
  '# mogi-cards 과외 세션 자동 인수인계' \
  '' \
  '아래 원문은 프로젝트 로컬 SessionStart 훅이 불러온 현재 과외 지시다.' \
  '시작 인사에 반드시 다음 형식으로 실제 판독 파일을 알린다.' \
  "학습 인수인계: $mogi_review_label 읽음" \
  '' \
  "## $mogi_preamble" \
  ''
sed -n '1,$p' "$mogi_preamble"

printf '\n%s\n\n' "## $mogi_head_guide"
sed -n '1,$p' "$mogi_head_guide"

if [ -n "$mogi_latest_review" ]; then
  printf '\n%s\n\n' "## $mogi_latest_review"
  sed -n '1,$p' "$mogi_latest_review"
else
  printf '\n%s\n' '## 최신 학습 관찰 누적 검토: 없음'
fi
