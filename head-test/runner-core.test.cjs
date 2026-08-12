const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("./runner-core.js");
const demo = require("./cases/policy-snapshot-demo.json");

function fresh(previousOrder) {
  return core.createSession(demo, previousOrder || null, 0);
}

function answerFor(question, overrides = {}) {
  const structured = {};
  for (const field of question.structured_fields) {
    structured[field.id] = Object.prototype.hasOwnProperty.call(field, "expected") ? field.expected : "응답";
  }
  return {
    question_id: question.id,
    reasoning: overrides.reasoning == null ? "원문 자유서술" : overrides.reasoning,
    structured: { ...structured, ...(overrides.structured || {}) },
  };
}

function blockPayload(session, phase) {
  const variant = core.variantForPhase(session, phase);
  return { answers: core.renderInitialQuestions(demo, variant).map((question) => answerFor(question)) };
}

function delayedPayload(session, phase, overrides) {
  const variant = core.variantForPhase(session, phase);
  return { answer: answerFor(core.renderDelayedQuestion(demo, variant), overrides) };
}

function throughInitial() {
  let session = fresh();
  session = core.transition(session, "start", { unfamiliar_material: false }, demo, 1000);
  session = core.transition(session, "submit_block", blockPayload(session, "block_1"), demo, 2000);
  session = core.transition(session, "submit_block", blockPayload(session, "block_2"), demo, 3000);
  return session;
}

function completeSession(lastOverrides) {
  let session = throughInitial();
  const unlock = new Date(session.delay_unlock_at).getTime();
  session = core.transition(session, "begin_delayed", {}, demo, unlock);
  session = core.transition(session, "submit_delayed", delayedPayload(session, "delayed_no_support"), demo, unlock + 1000);
  session = core.transition(session, "submit_delayed", delayedPayload(session, "delayed_with_support", lastOverrides), demo, unlock + 2000);
  return session;
}

test("validator는 정확히 5개 규칙과 네 질문 종류를 허용한다", () => {
  assert.deepEqual(core.validateCase(demo), { ok: true, errors: [] });
  const invalid = structuredClone(demo);
  invalid.rules.pop();
  invalid.initial_questions[3].type = "fact_recall";
  const result = core.validateCase(invalid);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /정확히 5개/);
  assert.match(result.errors.join("\n"), /정확히 하나씩/);
});

test("validator는 템플릿 토큰 누락과 A/B 동일 라벨을 거부한다", () => {
  const invalid = structuredClone(demo);
  invalid.rules[0].paragraph += " {{missing_token}}";
  invalid.variants.B.table = invalid.variants.A.table;
  const result = core.validateCase(invalid);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /missing_token/);
  assert.match(result.errors.join("\n"), /A\/B 라벨이 같음/);
});

test("validator는 표 필수 열과 중복 질문·입력 id를 거부한다", () => {
  const invalid = structuredClone(demo);
  delete invalid.rules[0].table["값의 주인"];
  invalid.initial_questions[1].id = invalid.initial_questions[0].id;
  invalid.initial_questions[2].structured_fields.push(structuredClone(invalid.initial_questions[2].structured_fields[0]));
  const result = core.validateCase(invalid);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /값의 주인 누락/);
  assert.match(result.errors.join("\n"), /initial_questions id가 중복/);
  assert.match(result.errors.join("\n"), /structured field id 중복/);
});

test("초기 active hard limit은 8~10분만 허용한다", () => {
  for (const value of [479, 601]) {
    const invalid = structuredClone(demo);
    invalid.initial_limit_seconds = value;
    assert.equal(core.validateCase(invalid).ok, false);
  }
});

test("제시 조건 순서는 이전 실행을 기준으로 교대한다", () => {
  assert.deepEqual(core.chooseOrder(null), ["paragraph", "table"]);
  assert.deepEqual(core.chooseOrder(["paragraph", "table"]), ["table", "paragraph"]);
  assert.deepEqual(core.chooseOrder(["table", "paragraph"]), ["paragraph", "table"]);
});

test("측정 케이스는 unfamiliar_material 확인 없이 시작할 수 없다", () => {
  const measurement = { ...demo, demo_only: false, id: "measurement" };
  let session = core.createSession(measurement, null, 0);
  assert.throws(() => core.transition(session, "start", { unfamiliar_material: false }, measurement, 1), /처음 보는 재료/);
  session = core.transition(session, "start", { unfamiliar_material: true }, measurement, 1);
  assert.equal(session.unfamiliar_material, true);
});

test("상태 머신은 네 답변이 모두 없으면 block_2를 열지 않는다", () => {
  let session = fresh();
  session = core.transition(session, "start", { unfamiliar_material: false }, demo, 1000);
  const payload = blockPayload(session, "block_1");
  payload.answers.pop();
  assert.throws(() => core.transition(session, "submit_block", payload, demo, 2000), /네 질문 답변/);
  assert.equal(session.phase, "block_1");
});

test("초기 블록 제한 시간을 넘기면 incomplete로 잠기며 잔여는 오답 처리하지 않는다", () => {
  let session = fresh();
  session = core.transition(session, "start", { unfamiliar_material: false }, demo, 1000);
  session = core.enforceTimeout(session, 1000 + demo.initial_limit_seconds * 1000 + 1);
  assert.equal(session.phase, "incomplete");
  assert.throws(() => core.transition(session, "fatigue_abort", {}, demo, 9999999), /종료된 세션/);
  const exported = core.exportRun(session, demo);
  assert.equal(exported.administration.block_1, "not_administered_timeout");
  assert.equal(exported.review, undefined);
});

test("B까지 제출하기 전 expected·피드백은 잠겨 있다", () => {
  let session = fresh();
  session = core.transition(session, "start", { unfamiliar_material: false }, demo, 1000);
  session = core.transition(session, "submit_block", blockPayload(session, "block_1"), demo, 2000);
  assert.equal(core.canViewFeedback(session), false);
  assert.throws(() => core.getReview(session, demo), /완료 전/);
  session = core.transition(session, "submit_block", blockPayload(session, "block_2"), demo, 3000);
  assert.equal(session.phase, "delay_wait");
  assert.equal(core.canViewFeedback(session), false);
});

test("지연 검사는 unlock 전 접근할 수 없다", () => {
  const session = throughInitial();
  const before = new Date(session.delay_unlock_at).getTime() - 1;
  assert.throws(() => core.transition(session, "begin_delayed", {}, demo, before), /아직 지나지 않음/);
  const opened = core.transition(session, "begin_delayed", {}, demo, new Date(session.delay_unlock_at).getTime());
  assert.equal(opened.phase, "delayed_no_support");
});

test("요약 없는 지연 답변을 잠근 뒤에만 표 지원 문항을 연다", () => {
  let session = throughInitial();
  const unlock = new Date(session.delay_unlock_at).getTime();
  session = core.transition(session, "begin_delayed", {}, demo, unlock);
  assert.equal(core.presentationForPhase(session, session.phase), "none");
  assert.throws(() => core.transition(session, "submit_block", {}, demo, unlock + 1), /submit_delayed/);
  session = core.transition(session, "submit_delayed", delayedPayload(session, "delayed_no_support"), demo, unlock + 2);
  assert.equal(session.phase, "delayed_with_support");
  assert.equal(core.presentationForPhase(session, session.phase), "table");
});

test("피로 중단은 즉시 잠그고 잔여 문항을 not_administered_fatigue로 보존한다", () => {
  let session = fresh();
  session = core.transition(session, "start", { unfamiliar_material: false }, demo, 1000);
  session = core.transition(session, "fatigue_abort", { reason: "같은 문장을 두 번 읽음" }, demo, 2000);
  assert.equal(session.phase, "fatigue_abort");
  assert.throws(() => core.transition(session, "submit_block", {}, demo, 3000), /종료된 세션/);
  const exported = core.exportRun(session, demo);
  assert.equal(exported.administration.block_2, "not_administered_fatigue");
  assert.equal(exported.review, undefined);
});

test("입력 결함 신고는 reason enum과 함께 비교를 무효화한다", () => {
  let session = fresh();
  session = core.transition(session, "start", { unfamiliar_material: false }, demo, 1000);
  assert.throws(() => core.transition(session, "invalidate_input", { reason: "other" }, demo, 2000), /허용된/);
  session = core.transition(session, "invalidate_input", {
    reason: "missing_subject",
    question_id: "fact_rls_source",
    detail: "주어가 없다",
  }, demo, 3000);
  assert.equal(session.phase, "invalidated");
  assert.equal(core.exportRun(session, demo).administration.block_1, "not_administered_input_defect");
  assert.throws(() => core.getReview(session, demo), /완료 전/);
});

test("draft와 제출 원답 이벤트는 append-only 배열에 보존된다", () => {
  let session = fresh();
  session = core.transition(session, "start", { unfamiliar_material: false }, demo, 1000);
  session = core.recordDraft(session, "block_1", "fact_rls_source", "reasoning", "첫 원답", 1100);
  session = core.recordDraft(session, "block_1", "fact_rls_source", "reasoning", "고친 원답", 1200);
  assert.deepEqual(session.draft_events.map((event) => event.raw_value), ["첫 원답", "고친 원답"]);
  session = core.transition(session, "submit_block", blockPayload(session, "block_1"), demo, 2000);
  assert.equal(session.answer_events.length, 1);
  assert.equal(session.answer_events[0].answers[0].reasoning, "원문 자유서술");
});

test("완료 뒤에만 exact structured score와 전후 반전을 계산한다", () => {
  const session = completeSession({ structured: { before: "없음", after: "있음" } });
  assert.equal(session.phase, "complete");
  const review = core.getReview(session, demo);
  assert.equal(review.totals.free_reasoning, "manual_review");
  assert.equal(review.totals.before_after_reversals, 1);
  assert.ok(review.totals.exact_correct < review.totals.exact_total);
  const exported = core.exportRun(session, demo);
  assert.ok(exported.review);
  assert.equal(exported.case_definition.initial_questions[0].prompt, demo.initial_questions[0].prompt);
  assert.equal(exported.administration.delayed_with_support, "submitted");
});
