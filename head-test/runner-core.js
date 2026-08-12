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
    "content_assistance_received",
  ];
  const ORDER_OUTCOMES = new Set(["complete", "fatigue_abort", "incomplete", "invalidated", "reset"]);
  const TABLE_COLUMNS = ["정보 출처", "값의 주인", "관측·판단", "이벤트", "변경 전", "변경 후"];
  const ID_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;
  const TOKEN_ROLE_PATTERN = /^[a-z][a-z0-9_]*$/;
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
    else if (!ID_PATTERN.test(field.id)) errors.push(`${path}: id는 영문자로 시작하는 영문·숫자·밑줄만 허용`);
    if (!field.label || typeof field.label !== "string") errors.push(`${path}: label 누락`);
    if (!['text', 'select'].includes(field.type)) errors.push(`${path}: type은 text 또는 select여야 함`);
    if (field.type === "select") {
      if (!Array.isArray(field.options) || field.options.length < 2) {
        errors.push(`${path}: select에는 options가 2개 이상 필요`);
      } else {
        if (field.options.some((option) => typeof option !== "string" || !option.trim())) errors.push(`${path}: option은 비어 있지 않은 문자열이어야 함`);
        if (new Set(field.options).size !== field.options.length) errors.push(`${path}: option 중복`);
      }
    }
    if (Object.prototype.hasOwnProperty.call(field, "expected")) errors.push(`${path}: expected는 참가자 케이스에 둘 수 없음`);
  }

  function validateQuestion(question, path, errors, requireType) {
    if (!question || typeof question !== "object") {
      errors.push(`${path}: 질문이 객체가 아님`);
      return;
    }
    if (!question.id || typeof question.id !== "string") errors.push(`${path}: id 누락`);
    else if (!ID_PATTERN.test(question.id)) errors.push(`${path}: id는 영문자로 시작하는 영문·숫자·밑줄만 허용`);
    if (!question.prompt || typeof question.prompt !== "string") errors.push(`${path}: prompt 누락`);
    if (requireType && !QUESTION_TYPES.includes(question.type)) errors.push(`${path}: 알 수 없는 질문 종류`);
    if (!Array.isArray(question.structured_fields) || question.structured_fields.length === 0) errors.push(`${path}: structured_fields는 최소 1개 필요`);
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
    if (typeof question.reasoning_label !== "string" || !question.reasoning_label.trim()) errors.push(`${path}: reasoning_label 누락`);
  }

  function validateCase(caseData) {
    const errors = [];
    if (!caseData || typeof caseData !== "object") return { ok: false, errors: ["케이스가 객체가 아님"] };
    if (caseData.schema_version !== 1) errors.push("schema_version은 1이어야 함");
    if (!caseData.protocol_version || typeof caseData.protocol_version !== "string") errors.push("protocol_version 누락");
    if (!caseData.id || typeof caseData.id !== "string") errors.push("id 누락");
    if (!caseData.title || typeof caseData.title !== "string") errors.push("title 누락");
    if (typeof caseData.demo_only !== "boolean") errors.push("demo_only 불리언 누락");
    if (!Number.isInteger(caseData.block_limit_seconds) || caseData.block_limit_seconds < 240 || caseData.block_limit_seconds > 300) {
      errors.push("block_limit_seconds는 240~300 사이 정수여야 함");
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
        if (!rule.fact || typeof rule.fact !== "object" || Array.isArray(rule.fact)) errors.push(`${path}: typed fact 누락`);
        else TABLE_COLUMNS.forEach((column) => {
          if (typeof rule.fact[column] !== "string" || !rule.fact[column].trim()) errors.push(`${path}.fact: ${column} 누락`);
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
      const roleKeys = caseData.token_roles && typeof caseData.token_roles === "object" ? Object.keys(caseData.token_roles).sort() : [];
      if (JSON.stringify(aKeys) !== JSON.stringify(roleKeys)) errors.push("token_roles 키가 A/B 토큰 키와 다름");
      for (const key of aKeys) {
        if (typeof variants.A[key] !== "string" || typeof variants.B[key] !== "string") {
          errors.push(`토큰 ${key}: A/B 값은 문자열이어야 함`);
        } else if (variants.A[key].trim() === variants.B[key].trim()) {
          errors.push(`토큰 ${key}: A/B 라벨이 같음`);
        }
        if (!caseData.token_roles || typeof caseData.token_roles[key] !== "string" || !TOKEN_ROLE_PATTERN.test(caseData.token_roles[key])) {
          errors.push(`토큰 ${key}: 유효한 역할 누락`);
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
      Object.keys(variants.A).filter((token) => !allTokens.has(token)).forEach((token) => errors.push(`사용되지 않은 variant 토큰: ${token}`));
    }
    const domIds = new Set();
    const allQuestions = [...(Array.isArray(caseData.initial_questions) ? caseData.initial_questions : []), caseData.delayed_question].filter(Boolean);
    allQuestions.forEach((question) => {
      (question.structured_fields || []).forEach((field) => {
        const domId = `${question.id}__${field.id}`;
        if (domIds.has(domId)) errors.push(`렌더 입력 id 충돌: ${domId}`);
        domIds.add(domId);
      });
    });
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
    return caseData.rules.map((rule) => {
      const fact = renderDeep(rule.fact, caseData.variants[variant]);
      const paragraph = `정보 출처 ${fact["정보 출처"]}에서 값의 주인 ${fact["값의 주인"]}을 관측한다. 관측·판단은 ${fact["관측·판단"]}이다. ${fact["이벤트"]} 이벤트에서 변경 전 값은 ${fact["변경 전"]}, 변경 후 값은 ${fact["변경 후"]}이다.`;
      return { id: rule.id, fact, table: fact, paragraph };
    });
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

  function validateOrderLedger(ledger) {
    if (!ledger || ledger.version !== 1 || !Array.isArray(ledger.events)) return false;
    let lastOrder = null;
    const allocatedRuns = new Set();
    const outcomes = new Set();
    let lastTime = -Infinity;
    for (const event of ledger.events) {
      const time = event && Date.parse(event.at);
      if (!event || !["allocate", "outcome"].includes(event.type) || !isCompleteString(event.run_id) || Number.isNaN(time) || time < lastTime) return false;
      lastTime = time;
      if (event.type === "allocate") {
        if (allocatedRuns.has(event.run_id)) return false;
        if (!isCompleteString(event.case_id)) return false;
        if (!Array.isArray(event.order) || !["paragraph,table", "table,paragraph"].includes(event.order.join(","))) return false;
        if (typeof event.balance_eligible !== "boolean") return false;
        if (event.balance_eligible && lastOrder && event.order.join(",") === lastOrder.join(",")) return false;
        allocatedRuns.add(event.run_id);
        if (event.balance_eligible) lastOrder = event.order;
      } else {
        if (!allocatedRuns.has(event.run_id) || outcomes.has(event.run_id) || !ORDER_OUTCOMES.has(event.outcome)) return false;
        outcomes.add(event.run_id);
      }
    }
    return true;
  }

  function emptyOrderLedger() {
    return { version: 1, events: [] };
  }

  function allocateOrder(session, ledger, nowValue) {
    const now = nowValue == null ? Date.now() : nowValue;
    assert(session.phase === "intro" && session.order == null, "시작 전 미배정 세션만 순서를 배정할 수 있음");
    assert(validateOrderLedger(ledger), "유효하지 않은 전역 순서 원장");
    const balanceEligible = session.demo_only !== true;
    const allocations = ledger.events.filter((event) => event.type === "allocate" && event.balance_eligible);
    const order = chooseOrder(allocations.length ? allocations[allocations.length - 1].order : null);
    const nextSession = clone(session);
    const nextLedger = clone(ledger);
    nextSession.order = order;
    nextSession.order_assignment = { scope: balanceEligible ? "global_across_measurement_cases" : "demo_only", at: iso(now) };
    nextLedger.events.push({ type: "allocate", run_id: session.run_id, case_id: session.case_id, order, balance_eligible: balanceEligible, at: iso(now) });
    return { session: nextSession, ledger: nextLedger };
  }

  function recordOrderOutcome(ledger, session, nowValue) {
    const now = nowValue == null ? Date.now() : nowValue;
    assert(validateOrderLedger(ledger), "유효하지 않은 전역 순서 원장");
    assert(TERMINAL_PHASES.has(session.phase) || session.phase === "reset", "종료 또는 reset 실행만 결과 기록 가능");
    const allocation = ledger.events.find((event) => event.type === "allocate" && event.run_id === session.run_id);
    assert(allocation, "결과를 기록할 순서 배정이 없음");
    assert(allocation.case_id === session.case_id && allocation.order.join(",") === session.order.join(","), "순서 배정과 세션이 불일치함");
    const next = clone(ledger);
    if (!next.events.some((event) => event.type === "outcome" && event.run_id === session.run_id)) {
      next.events.push({ type: "outcome", run_id: session.run_id, outcome: session.phase, at: iso(now) });
    }
    return next;
  }

  function createSession(caseData, now) {
    const validation = validateCase(caseData);
    assert(validation.ok, `유효하지 않은 케이스: ${validation.errors.join("; ")}`);
    const createdAt = iso(now == null ? Date.now() : now);
    return {
      session_version: 1,
      protocol_version: caseData.protocol_version,
      case_id: caseData.id,
      case_title: caseData.title,
      demo_only: caseData.demo_only,
      run_id: `${caseData.id}__${createdAt.replace(/[^0-9TZ]/g, "")}`,
      order: null,
      order_assignment: null,
      variant_order: ["A", "B"],
      phase: "intro",
      created_at: createdAt,
      started_at: null,
      initial_deadline_at: null,
      current_block_started_at: null,
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
      assert(Array.isArray(next.order), "전역 순서를 먼저 배정해야 함");
      assert(payload && typeof payload.unfamiliar_material === "boolean", "unfamiliar_material 확인값이 필요함");
      if (!caseData.demo_only) assert(payload.unfamiliar_material === true, "측정 케이스는 처음 보는 재료 확인이 필요함");
      next.unfamiliar_material = payload.unfamiliar_material;
      next.started_at = iso(now);
      next.current_block_started_at = iso(now);
      next.initial_deadline_at = addSeconds(now, caseData.block_limit_seconds);
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
        next.current_block_started_at = iso(now);
        next.initial_deadline_at = addSeconds(now, caseData.block_limit_seconds);
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

  function validateAnswerKey(caseData, answerKey) {
    const errors = [];
    if (!answerKey || answerKey.schema_version !== 1) errors.push("정답 키 schema_version은 1이어야 함");
    if (!answerKey || answerKey.case_id !== caseData.id) errors.push("정답 키 case_id 불일치");
    if (!answerKey || !answerKey.answers || typeof answerKey.answers !== "object") return { ok: false, errors: [...errors, "정답 키 answers 누락"] };
    const questions = [...caseData.initial_questions, caseData.delayed_question];
    for (const question of questions) {
      const keyed = answerKey.answers[question.id];
      if (!keyed || typeof keyed !== "object") {
        errors.push(`정답 키 질문 누락: ${question.id}`);
        continue;
      }
      for (const field of question.structured_fields) {
        if (typeof keyed[field.id] !== "string" || !keyed[field.id].trim()) {
          errors.push(`정답 키 필드 누락: ${question.id}.${field.id}`);
          continue;
        }
        if (field.type === "select") {
          for (const variant of ["A", "B"]) {
            const expected = renderTemplate(keyed[field.id], caseData.variants[variant]);
            const options = renderDeep(field.options, caseData.variants[variant]);
            if (!options.includes(expected)) errors.push(`정답 키가 선택지에 없음: ${question.id}.${field.id} (${variant})`);
          }
        }
      }
      const extra = Object.keys(keyed).filter((fieldId) => !question.structured_fields.some((field) => field.id === fieldId));
      if (extra.length) errors.push(`정답 키 알 수 없는 필드: ${question.id}.${extra.join(",")}`);
    }
    const knownIds = new Set(questions.map((question) => question.id));
    Object.keys(answerKey.answers).filter((id) => !knownIds.has(id)).forEach((id) => errors.push(`정답 키 알 수 없는 질문: ${id}`));
    return { ok: errors.length === 0, errors };
  }

  function expectedFor(answerKey, question, variant) {
    return Object.fromEntries(Object.entries(answerKey.answers[question.id]).map(([fieldId, value]) => [fieldId, renderTemplate(value, variant)]));
  }

  function scoreAnswer(question, answer, expected) {
    const fields = [];
    for (const field of question.structured_fields) {
      const actual = answer.structured[field.id];
      fields.push({
        field_id: field.id,
        label: field.label,
        actual,
        expected: expected[field.id],
        correct: normalizeExact(actual) === normalizeExact(expected[field.id]),
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

  function getReview(session, caseData, answerKey) {
    assert(canViewFeedback(session), "완료 전에는 expected·채점·피드백을 볼 수 없음");
    const keyValidation = validateAnswerKey(caseData, answerKey);
    assert(keyValidation.ok, `유효하지 않은 정답 키: ${keyValidation.errors.join("; ")}`);
    const blocks = {};
    for (const phase of ["block_1", "block_2"]) {
      const saved = session.answers[phase];
      const questions = renderInitialQuestions(caseData, saved.variant);
      blocks[phase] = saved.items.map((answer, index) => scoreAnswer(questions[index], answer, expectedFor(answerKey, questions[index], caseData.variants[saved.variant])));
    }
    for (const phase of ["delayed_no_support", "delayed_with_support"]) {
      const saved = session.answers[phase];
      const question = renderDelayedQuestion(caseData, saved.variant);
      blocks[phase] = [scoreAnswer(question, saved.item, expectedFor(answerKey, question, caseData.variants[saved.variant]))];
    }
    return {
      blocks,
      condition_summaries: Object.fromEntries(Object.entries(blocks).map(([phase, items]) => [phase, {
        question_count: items.length,
        exact_by_question: items.map((item) => ({ question_id: item.question_id, exact_correct: item.exact_correct, exact_total: item.exact_total, before_after_reversal: item.before_after_reversal })),
        free_reasoning: "manual_review",
      }])),
      delayed_interpretation: "descriptive_only_confounded_by_retention_and_retrieval_order",
    };
  }

  function exportRun(session, caseData, answerKey, orderLedger) {
    const terminalSuffix = session.phase === "fatigue_abort"
      ? "fatigue"
      : session.phase === "incomplete"
        ? "timeout"
        : session.phase === "invalidated"
          ? "input_defect"
          : null;
    const administration = {};
    for (const phase of ["block_1", "block_2", "delayed_no_support", "delayed_with_support"]) {
      const presented = session.transitions.some((event) => event.to === phase);
      const drafted = session.draft_events.some((event) => event.phase === phase);
      administration[phase] = session.answers[phase]
        ? "submitted"
        : drafted
          ? "partial_draft"
          : presented
            ? "presented_no_submission"
            : terminalSuffix
              ? `not_presented_${terminalSuffix}`
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
    if (orderLedger) {
      assert(validateOrderLedger(orderLedger), "유효하지 않은 전역 순서 원장은 export할 수 없음");
      exported.order_ledger_snapshot = clone(orderLedger);
    }
    if (canViewFeedback(session) && answerKey) exported.review = getReview(session, caseData, answerKey);
    return exported;
  }

  function validateSession(session, caseData) {
    const errors = [];
    if (!session || typeof session !== "object") return { ok: false, errors: ["세션이 객체가 아님"] };
    if (session.session_version !== 1) errors.push("session_version 불일치");
    if (session.case_id !== caseData.id || session.protocol_version !== caseData.protocol_version || session.case_title !== caseData.title || session.demo_only !== caseData.demo_only) errors.push("세션과 케이스 결합 불일치");
    if (!isCompleteString(session.run_id)) errors.push("run_id 누락");
    const phases = ["intro", "block_1", "block_2", "delay_wait", "delayed_no_support", "delayed_with_support", ...TERMINAL_PHASES];
    if (!phases.includes(session.phase)) errors.push("알 수 없는 phase");
    if (session.phase !== "intro" && (!Array.isArray(session.order) || !["paragraph,table", "table,paragraph"].includes(session.order.join(",")))) errors.push("시작된 세션 order 오류");
    if (!Array.isArray(session.transitions) || session.transitions.length === 0) errors.push("transitions 누락");
    else {
      let prior = null;
      let lastTime = -Infinity;
      session.transitions.forEach((event, index) => {
        const time = Date.parse(event.at);
        if (Number.isNaN(time) || time < lastTime) errors.push(`transition 시간 오류: ${index}`);
        if (event.from !== prior) errors.push(`transition 연속성 오류: ${index}`);
        const regular = {
          "null:create": "intro",
          "intro:start": "block_1",
          "block_1:submit_block": "block_2",
          "block_2:submit_block": "delay_wait",
          "delay_wait:begin_delayed": "delayed_no_support",
          "delayed_no_support:submit_delayed": "delayed_with_support",
          "delayed_with_support:submit_delayed": "complete",
          "block_1:timeout": "incomplete",
          "block_2:timeout": "incomplete",
        };
        const key = `${event.from === null ? "null" : event.from}:${event.event}`;
        const terminalShortcut = event.event === "fatigue_abort" ? event.to === "fatigue_abort" : event.event === "invalidate_input" ? event.to === "invalidated" : false;
        if (regular[key] !== event.to && !terminalShortcut) errors.push(`허용되지 않은 transition: ${index}`);
        prior = event.to;
        lastTime = time;
      });
      if (session.transitions[0].from !== null || session.transitions[0].to !== "intro" || session.transitions[0].event !== "create") errors.push("첫 transition 오류");
      if (prior !== session.phase) errors.push("마지막 transition과 phase 불일치");
      if (session.created_at !== session.transitions[0].at) errors.push("created_at 불일치");

      const block1Entry = session.transitions.find((event) => event.to === "block_1");
      const block2Entry = session.transitions.find((event) => event.to === "block_2");
      const delayEntry = session.transitions.find((event) => event.to === "delay_wait");
      const completeEntry = session.transitions.find((event) => event.to === "complete");
      if (block1Entry) {
        if (session.started_at !== block1Entry.at) errors.push("started_at 불일치");
        const currentBlockEntry = block2Entry || block1Entry;
        if (session.current_block_started_at !== currentBlockEntry.at) errors.push("current_block_started_at 불일치");
        if (session.initial_deadline_at !== addSeconds(currentBlockEntry.at, caseData.block_limit_seconds)) errors.push("initial_deadline_at 불일치");
      } else if (session.started_at || session.current_block_started_at || session.initial_deadline_at) {
        errors.push("시작 전 시간 필드 오류");
      }
      if (delayEntry) {
        if (session.delay_unlock_at !== addSeconds(delayEntry.at, caseData.delay_seconds)) errors.push("delay_unlock_at 불일치");
      } else if (session.delay_unlock_at) {
        errors.push("지연 단계 전 delay_unlock_at 오류");
      }
      if (completeEntry) {
        if (session.completed_at !== completeEntry.at) errors.push("completed_at 불일치");
      } else if (session.completed_at) {
        errors.push("완료 전 completed_at 오류");
      }
    }
    if (!session.answers || !session.draft_events || !Array.isArray(session.draft_events) || !Array.isArray(session.answer_events)) errors.push("답변 이벤트 구조 누락");
    if (session.answers && Array.isArray(session.order)) {
      for (const phase of ["block_1", "block_2"]) {
        const saved = session.answers[phase];
        if (!saved) continue;
        try {
          const variant = variantForPhase(session, phase);
          if (saved.variant !== variant || !Array.isArray(saved.items) || saved.items.length !== 4) throw new Error("variant 또는 item 수 불일치");
          renderInitialQuestions(caseData, variant).forEach((question, index) => validateAnswer(question, saved.items[index], `${phase}[${index}]`));
        } catch (error) { errors.push(`저장 답변 오류 ${phase}: ${error.message}`); }
      }
      for (const phase of ["delayed_no_support", "delayed_with_support"]) {
        const saved = session.answers[phase];
        if (!saved) continue;
        try {
          const variant = variantForPhase(session, phase);
          if (saved.variant !== variant || !saved.item) throw new Error("variant 또는 item 불일치");
          validateAnswer(renderDelayedQuestion(caseData, variant), saved.item, phase);
        } catch (error) { errors.push(`저장 답변 오류 ${phase}: ${error.message}`); }
      }
    }
    if (Array.isArray(session.draft_events)) session.draft_events.forEach((event, index) => {
      if (!isCompleteString(event.phase) || !isCompleteString(event.question_id) || !isCompleteString(event.field_path) || typeof event.raw_value !== "string" || Number.isNaN(Date.parse(event.at))) errors.push(`draft event 오류: ${index}`);
    });
    if (session.started_at && Number.isNaN(Date.parse(session.started_at))) errors.push("started_at 오류");
    if (session.current_block_started_at && Number.isNaN(Date.parse(session.current_block_started_at))) errors.push("current_block_started_at 오류");
    if (session.initial_deadline_at && Number.isNaN(Date.parse(session.initial_deadline_at))) errors.push("initial_deadline_at 오류");
    if (session.delay_unlock_at && Number.isNaN(Date.parse(session.delay_unlock_at))) errors.push("delay_unlock_at 오류");
    if (session.completed_at && Number.isNaN(Date.parse(session.completed_at))) errors.push("completed_at 오류");
    if (TERMINAL_PHASES.has(session.phase) && session.transitions[session.transitions.length - 1].to !== session.phase) errors.push("종료 phase 전이 오류");
    return { ok: errors.length === 0, errors };
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
    emptyOrderLedger,
    validateOrderLedger,
    allocateOrder,
    recordOrderOutcome,
    createSession,
    variantForPhase,
    presentationForPhase,
    enforceTimeout,
    transition,
    recordDraft,
    canViewFeedback,
    validateAnswerKey,
    getReview,
    exportRun,
    validateSession,
  };
});
