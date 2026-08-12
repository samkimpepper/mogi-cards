(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.HeadTestCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const QUESTION_TYPES = [
    "fact_recall",
    "state_tracking",
    "novel_inference",
    "contradiction_detection",
  ];
  const TERMINAL_PHASES = new Set(["complete", "fatigue_abort", "incomplete", "invalidated"]);
  const INPUT_DEFECT_REASONS = [
    "missing_subject",
    "missing_value_source",
    "contradiction",
    "ambiguous_scope",
    "missing_option",
    "external_knowledge_required",
  ];
  const TABLE_COLUMNS = ["정보 출처", "값의 주인", "관측·판단", "이벤트", "변경 전", "변경 후"];
  const TOKEN_PATTERN = /\{\{([a-zA-Z0-9_]+)\}\}/g;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  function iso(now) {
    return new Date(now).toISOString();
  }

  function addSeconds(now, seconds) {
    return new Date(new Date(now).getTime() + seconds * 1000).toISOString();
  }

  function extractTokens(value, found) {
    const target = found || new Set();
    if (typeof value === "string") {
      for (const match of value.matchAll(TOKEN_PATTERN)) target.add(match[1]);
      return target;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => extractTokens(item, target));
      return target;
    }
    if (value && typeof value === "object") {
      Object.values(value).forEach((item) => extractTokens(item, target));
    }
    return target;
  }

  function validateInputField(field, path, errors) {
    if (!field || typeof field !== "object") {
      errors.push(`${path}: 입력 필드가 객체가 아님`);
      return;
    }
    if (!field.id || typeof field.id !== "string") errors.push(`${path}: id 누락`);
    if (!field.label || typeof field.label !== "string") errors.push(`${path}: label 누락`);
    if (!['text', 'select'].includes(field.type)) errors.push(`${path}: type은 text 또는 select여야 함`);
    if (field.type === "select") {
      if (!Array.isArray(field.options) || field.options.length < 2) {
        errors.push(`${path}: select에는 options가 2개 이상 필요`);
      }
    }
    if (Object.prototype.hasOwnProperty.call(field, "expected") && typeof field.expected !== "string") {
      errors.push(`${path}: expected는 문자열이어야 함`);
    }
  }

  function validateQuestion(question, path, errors, requireType) {
    if (!question || typeof question !== "object") {
      errors.push(`${path}: 질문이 객체가 아님`);
      return;
    }
    if (!question.id || typeof question.id !== "string") errors.push(`${path}: id 누락`);
    if (!question.prompt || typeof question.prompt !== "string") errors.push(`${path}: prompt 누락`);
    if (requireType && !QUESTION_TYPES.includes(question.type)) errors.push(`${path}: 알 수 없는 질문 종류`);
    if (!Array.isArray(question.structured_fields)) errors.push(`${path}: structured_fields 누락`);
    else {
      const fieldIds = new Set();
      question.structured_fields.forEach((field, index) => {
        validateInputField(field, `${path}.structured_fields[${index}]`, errors);
        if (field && typeof field.id === "string") {
          if (fieldIds.has(field.id)) errors.push(`${path}: structured field id 중복 (${field.id})`);
          fieldIds.add(field.id);
        }
      });
    }
    if (question.reasoning_label != null && typeof question.reasoning_label !== "string") {
      errors.push(`${path}: reasoning_label은 문자열이어야 함`);
    }
  }

  function validateCase(caseData) {
    const errors = [];
    if (!caseData || typeof caseData !== "object") return { ok: false, errors: ["케이스가 객체가 아님"] };
    if (caseData.schema_version !== 1) errors.push("schema_version은 1이어야 함");
    if (!caseData.protocol_version || typeof caseData.protocol_version !== "string") errors.push("protocol_version 누락");
    if (!caseData.id || typeof caseData.id !== "string") errors.push("id 누락");
    if (!caseData.title || typeof caseData.title !== "string") errors.push("title 누락");
    if (typeof caseData.demo_only !== "boolean") errors.push("demo_only 불리언 누락");
    if (!Number.isInteger(caseData.initial_limit_seconds) || caseData.initial_limit_seconds < 480 || caseData.initial_limit_seconds > 600) {
      errors.push("initial_limit_seconds는 480~600 사이 정수여야 함");
    }
    if (!Number.isInteger(caseData.delay_seconds) || caseData.delay_seconds < 0) {
      errors.push("delay_seconds는 0 이상의 정수여야 함");
    }
    if (!Array.isArray(caseData.rules) || caseData.rules.length !== 5) {
      errors.push("canonical rules는 정확히 5개여야 함");
    } else {
      const ids = new Set();
      caseData.rules.forEach((rule, index) => {
        const path = `rules[${index}]`;
        if (!rule.id || typeof rule.id !== "string") errors.push(`${path}: id 누락`);
        else if (ids.has(rule.id)) errors.push(`${path}: id 중복`);
        else ids.add(rule.id);
        if (!rule.paragraph || typeof rule.paragraph !== "string") errors.push(`${path}: paragraph 누락`);
        if (!rule.table || typeof rule.table !== "object" || Array.isArray(rule.table)) errors.push(`${path}: table 누락`);
        else TABLE_COLUMNS.forEach((column) => {
          if (typeof rule.table[column] !== "string" || !rule.table[column].trim()) errors.push(`${path}.table: ${column} 누락`);
        });
      });
    }

    const variants = caseData.variants;
    if (!variants || typeof variants !== "object" || !variants.A || !variants.B) {
      errors.push("variants.A와 variants.B가 필요함");
    } else {
      const aKeys = Object.keys(variants.A).sort();
      const bKeys = Object.keys(variants.B).sort();
      if (JSON.stringify(aKeys) !== JSON.stringify(bKeys)) errors.push("A/B 토큰 키가 서로 다름");
      for (const key of aKeys) {
        if (typeof variants.A[key] !== "string" || typeof variants.B[key] !== "string") {
          errors.push(`토큰 ${key}: A/B 값은 문자열이어야 함`);
        } else if (variants.A[key].trim() === variants.B[key].trim()) {
          errors.push(`토큰 ${key}: A/B 라벨이 같음`);
        }
      }
    }

    if (!Array.isArray(caseData.initial_questions) || caseData.initial_questions.length !== 4) {
      errors.push("initial_questions는 정확히 4개여야 함");
    } else {
      caseData.initial_questions.forEach((question, index) => validateQuestion(question, `initial_questions[${index}]`, errors, true));
      const questionIds = caseData.initial_questions.map((question) => question && question.id).filter(Boolean);
      if (new Set(questionIds).size !== questionIds.length) errors.push("initial_questions id가 중복됨");
      const types = caseData.initial_questions.map((question) => question.type).sort();
      if (JSON.stringify(types) !== JSON.stringify([...QUESTION_TYPES].sort())) {
        errors.push("초기 블록에는 네 질문 종류가 정확히 하나씩 있어야 함");
      }
    }

    if (!caseData.delayed_question) errors.push("delayed_question 누락");
    else {
      validateQuestion(caseData.delayed_question, "delayed_question", errors, false);
      if (Array.isArray(caseData.initial_questions) && caseData.initial_questions.some((question) => question.id === caseData.delayed_question.id)) {
        errors.push("delayed_question id가 초기 질문과 중복됨");
      }
    }

    const allTokens = extractTokens({ rules: caseData.rules, questions: caseData.initial_questions, delayed: caseData.delayed_question });
    if (variants && variants.A && variants.B) {
      for (const token of allTokens) {
        if (!Object.prototype.hasOwnProperty.call(variants.A, token)) errors.push(`템플릿 토큰 ${token}: variant A 값 누락`);
        if (!Object.prototype.hasOwnProperty.call(variants.B, token)) errors.push(`템플릿 토큰 ${token}: variant B 값 누락`);
      }
    }
    return { ok: errors.length === 0, errors };
  }

  function renderTemplate(value, tokens) {
    if (typeof value !== "string") return value;
    return value.replace(TOKEN_PATTERN, (_, key) => {
      assert(Object.prototype.hasOwnProperty.call(tokens, key), `토큰 값 누락: ${key}`);
      return tokens[key];
    });
  }

  function renderDeep(value, tokens) {
    if (typeof value === "string") return renderTemplate(value, tokens);
    if (Array.isArray(value)) return value.map((item) => renderDeep(item, tokens));
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, renderDeep(item, tokens)]));
    }
    return value;
  }

  function renderRules(caseData, variant) {
    assert(["A", "B"].includes(variant), "variant는 A 또는 B여야 함");
    return caseData.rules.map((rule) => renderDeep(rule, caseData.variants[variant]));
  }

  function renderInitialQuestions(caseData, variant) {
    assert(["A", "B"].includes(variant), "variant는 A 또는 B여야 함");
    return caseData.initial_questions.map((question) => renderDeep(question, caseData.variants[variant]));
  }

  function renderDelayedQuestion(caseData, variant) {
    assert(["A", "B"].includes(variant), "variant는 A 또는 B여야 함");
    return renderDeep(caseData.delayed_question, caseData.variants[variant]);
  }

  function chooseOrder(previousOrder) {
    if (Array.isArray(previousOrder) && previousOrder.join(",") === "paragraph,table") return ["table", "paragraph"];
    if (Array.isArray(previousOrder) && previousOrder.join(",") === "table,paragraph") return ["paragraph", "table"];
    return ["paragraph", "table"];
  }

  function createSession(caseData, previousOrder, now) {
    const validation = validateCase(caseData);
    assert(validation.ok, `유효하지 않은 케이스: ${validation.errors.join("; ")}`);
    const createdAt = iso(now == null ? Date.now() : now);
    return {
      session_version: 1,
      protocol_version: caseData.protocol_version,
      case_id: caseData.id,
      case_title: caseData.title,
      demo_only: caseData.demo_only,
      order: chooseOrder(previousOrder),
      variant_order: ["A", "B"],
      phase: "intro",
      created_at: createdAt,
      started_at: null,
      initial_deadline_at: null,
      delay_unlock_at: null,
      completed_at: null,
      abort_reason: null,
      incomplete_reason: null,
      unfamiliar_material: null,
      invalidation: null,
      answers: {
        block_1: null,
        block_2: null,
        delayed_no_support: null,
        delayed_with_support: null,
      },
      draft_events: [],
      answer_events: [],
      transitions: [{ from: null, to: "intro", event: "create", at: createdAt }],
    };
  }

  function variantForPhase(session, phase) {
    if (phase === "block_1" || phase === "delayed_no_support") return session.variant_order[0];
    if (phase === "block_2" || phase === "delayed_with_support") return session.variant_order[1];
    return null;
  }

  function presentationForPhase(session, phase) {
    if (phase === "block_1") return session.order[0];
    if (phase === "block_2") return session.order[1];
    if (phase === "delayed_no_support") return "none";
    if (phase === "delayed_with_support") return "table";
    return null;
  }

  function isCompleteString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function validateAnswer(question, answer, path) {
    assert(answer && typeof answer === "object", `${path}: 답변 누락`);
    assert(answer.question_id === question.id, `${path}: question_id 불일치`);
    if (question.reasoning_label) assert(typeof answer.reasoning === "string", `${path}: reasoning 원문 누락`);
    assert(answer.structured && typeof answer.structured === "object", `${path}: structured 누락`);
    for (const field of question.structured_fields) {
      if (!field.optional) assert(isCompleteString(answer.structured[field.id]), `${path}: ${field.id} 답변 누락`);
      else assert(typeof answer.structured[field.id] === "string", `${path}: ${field.id} 원문 누락`);
    }
  }

  function recordTransition(session, to, event, now) {
    const from = session.phase;
    session.phase = to;
    session.transitions.push({ from, to, event, at: iso(now) });
  }

  function enforceTimeout(session, now) {
    const next = clone(session);
    if (!["block_1", "block_2"].includes(next.phase) || !next.initial_deadline_at) return next;
    if (new Date(now).getTime() <= new Date(next.initial_deadline_at).getTime()) return next;
    next.incomplete_reason = "initial_hard_limit_exceeded";
    recordTransition(next, "incomplete", "timeout", now);
    return next;
  }

  function transition(session, event, payload, caseData, nowValue) {
    const now = nowValue == null ? Date.now() : nowValue;
    assert(!TERMINAL_PHASES.has(session.phase), `종료된 세션에서는 전이할 수 없음: ${session.phase}`);
    let next = enforceTimeout(session, now);
    if (next.phase === "incomplete") return next;

    if (event === "fatigue_abort") {
      next.abort_reason = payload && typeof payload.reason === "string" ? payload.reason : "사용자가 피로 중단을 선택함";
      recordTransition(next, "fatigue_abort", event, now);
      return next;
    }

    if (event === "invalidate_input") {
      assert(payload && INPUT_DEFECT_REASONS.includes(payload.reason), "허용된 입력 결함 사유가 필요함");
      next.invalidation = {
        reason: payload.reason,
        question_id: payload.question_id || null,
        detail: typeof payload.detail === "string" ? payload.detail : "",
        at: iso(now),
      };
      recordTransition(next, "invalidated", event, now);
      return next;
    }

    if (next.phase === "intro") {
      assert(event === "start", "intro에서는 start만 가능함");
      assert(payload && typeof payload.unfamiliar_material === "boolean", "unfamiliar_material 확인값이 필요함");
      if (!caseData.demo_only) assert(payload.unfamiliar_material === true, "측정 케이스는 처음 보는 재료 확인이 필요함");
      next.unfamiliar_material = payload.unfamiliar_material;
      next.started_at = iso(now);
      next.initial_deadline_at = addSeconds(now, caseData.initial_limit_seconds);
      recordTransition(next, "block_1", event, now);
      return next;
    }

    if (next.phase === "block_1" || next.phase === "block_2") {
      assert(event === "submit_block", `${next.phase}에서는 submit_block만 가능함`);
      const variant = variantForPhase(next, next.phase);
      const questions = renderInitialQuestions(caseData, variant);
      assert(payload && Array.isArray(payload.answers) && payload.answers.length === 4, "네 질문 답변을 모두 제출해야 함");
      questions.forEach((question, index) => validateAnswer(question, payload.answers[index], `${next.phase}[${index}]`));
      next.answers[next.phase] = { variant, submitted_at: iso(now), items: clone(payload.answers) };
      next.answer_events.push({ phase: next.phase, variant, answers: clone(payload.answers), at: iso(now) });
      if (next.phase === "block_1") {
        recordTransition(next, "block_2", event, now);
      } else {
        next.delay_unlock_at = addSeconds(now, caseData.delay_seconds);
        recordTransition(next, "delay_wait", event, now);
      }
      return next;
    }

    if (next.phase === "delay_wait") {
      assert(event === "begin_delayed", "delay_wait에서는 begin_delayed만 가능함");
      assert(new Date(now).getTime() >= new Date(next.delay_unlock_at).getTime(), "지연 검사 잠금 시간이 아직 지나지 않음");
      recordTransition(next, "delayed_no_support", event, now);
      return next;
    }

    if (next.phase === "delayed_no_support" || next.phase === "delayed_with_support") {
      assert(event === "submit_delayed", `${next.phase}에서는 submit_delayed만 가능함`);
      const variant = variantForPhase(next, next.phase);
      const question = renderDelayedQuestion(caseData, variant);
      assert(payload && payload.answer, "지연 답변 누락");
      validateAnswer(question, payload.answer, next.phase);
      next.answers[next.phase] = { variant, submitted_at: iso(now), item: clone(payload.answer) };
      next.answer_events.push({ phase: next.phase, variant, answer: clone(payload.answer), at: iso(now) });
      if (next.phase === "delayed_no_support") {
        recordTransition(next, "delayed_with_support", event, now);
      } else {
        next.completed_at = iso(now);
        recordTransition(next, "complete", event, now);
      }
      return next;
    }

    throw new Error(`처리되지 않은 phase: ${next.phase}`);
  }

  function recordDraft(session, phase, questionId, fieldPath, rawValue, nowValue) {
    const now = nowValue == null ? Date.now() : nowValue;
    assert(!TERMINAL_PHASES.has(session.phase), "종료된 세션의 답변은 수정할 수 없음");
    assert(session.phase === phase, "현재 단계의 답변만 기록할 수 있음");
    assert(typeof rawValue === "string", "원답은 문자열로 기록해야 함");
    const next = clone(session);
    next.draft_events.push({ phase, question_id: questionId, field_path: fieldPath, raw_value: rawValue, at: iso(now) });
    return next;
  }

  function canViewFeedback(session) {
    return session.phase === "complete";
  }

  function normalizeExact(value) {
    return String(value).trim().replace(/\s+/g, " ").toLocaleLowerCase("ko-KR");
  }

  function scoreAnswer(question, answer) {
    const fields = [];
    for (const field of question.structured_fields) {
      if (!Object.prototype.hasOwnProperty.call(field, "expected")) continue;
      const actual = answer.structured[field.id];
      fields.push({
        field_id: field.id,
        label: field.label,
        actual,
        expected: field.expected,
        correct: normalizeExact(actual) === normalizeExact(field.expected),
      });
    }
    let reversal = null;
    const before = fields.find((field) => field.field_id === "before");
    const after = fields.find((field) => field.field_id === "after");
    if (before && after) {
      reversal = normalizeExact(before.actual) === normalizeExact(after.expected)
        && normalizeExact(after.actual) === normalizeExact(before.expected);
    }
    return {
      question_id: question.id,
      exact_fields: fields,
      exact_correct: fields.filter((field) => field.correct).length,
      exact_total: fields.length,
      before_after_reversal: reversal,
      reasoning: "manual_review",
    };
  }

  function getReview(session, caseData) {
    assert(canViewFeedback(session), "완료 전에는 expected·채점·피드백을 볼 수 없음");
    const blocks = {};
    for (const phase of ["block_1", "block_2"]) {
      const saved = session.answers[phase];
      const questions = renderInitialQuestions(caseData, saved.variant);
      blocks[phase] = saved.items.map((answer, index) => scoreAnswer(questions[index], answer));
    }
    for (const phase of ["delayed_no_support", "delayed_with_support"]) {
      const saved = session.answers[phase];
      const question = renderDelayedQuestion(caseData, saved.variant);
      blocks[phase] = [scoreAnswer(question, saved.item)];
    }
    const all = Object.values(blocks).flat();
    return {
      blocks,
      totals: {
        exact_correct: all.reduce((sum, item) => sum + item.exact_correct, 0),
        exact_total: all.reduce((sum, item) => sum + item.exact_total, 0),
        before_after_reversals: all.filter((item) => item.before_after_reversal === true).length,
        free_reasoning: "manual_review",
      },
    };
  }

  function exportRun(session, caseData) {
    const terminalSuffix = session.phase === "fatigue_abort"
      ? "fatigue"
      : session.phase === "incomplete"
        ? "timeout"
        : session.phase === "invalidated"
          ? "input_defect"
          : null;
    const administration = {};
    for (const phase of ["block_1", "block_2", "delayed_no_support", "delayed_with_support"]) {
      administration[phase] = session.answers[phase]
        ? "submitted"
        : terminalSuffix
          ? `not_administered_${terminalSuffix}`
          : "pending";
    }
    const exported = {
      exported_at: iso(Date.now()),
      case: {
        id: caseData.id,
        title: caseData.title,
        demo_only: caseData.demo_only,
        schema_version: caseData.schema_version,
        protocol_version: caseData.protocol_version,
      },
      case_definition: clone(caseData),
      session: clone(session),
      administration,
    };
    if (canViewFeedback(session)) exported.review = getReview(session, caseData);
    return exported;
  }

  return {
    QUESTION_TYPES,
    TERMINAL_PHASES,
    INPUT_DEFECT_REASONS,
    TABLE_COLUMNS,
    validateCase,
    renderTemplate,
    renderRules,
    renderInitialQuestions,
    renderDelayedQuestion,
    chooseOrder,
    createSession,
    variantForPhase,
    presentationForPhase,
    enforceTimeout,
    transition,
    recordDraft,
    canViewFeedback,
    getReview,
    exportRun,
  };
});
