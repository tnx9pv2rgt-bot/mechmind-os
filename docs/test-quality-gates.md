---
globs:
  - "**/*.spec.ts"
  - "**/*.test.ts"
  - "**/*.spec.tsx"
  - "**/*.test.tsx"
---
# Test Quality Gates — 7-Step Validation Pipeline (2026)

**Last updated:** April 2026  
**Standard:** World-class test quality with dual validation (technical + behavioral)

---

## 📋 Overview

The `fix-coverage.sh` script now enforces **7 mandatory quality gates** that validate not just test syntax, but test **behavior and assertion correctness**:

| Step | Gate | Checks | Pass Criteria |
|------|------|--------|---------------|
| 1️⃣ | TypeScript | TS compilation | 0 TS errors in spec |
| 2️⃣ | ESLint | Linting rules | 0 ESLint warnings |
| 3️⃣ | Mutation (Stryker) | Code coverage quality | Mutation score ≥80% |
| 4️⃣ | Flakiness (3×Jest run) | Test stability | 3/3 runs pass |
| **5️⃣** | **Assertion Coverage** | **Assertions per test** | **≥2 avg assertions/test** |
| **6️⃣** | **Mock State Management** | **Mock configuration** | **No persistent mocks (use Once)** |
| **7️⃣** | **Call Verification** | **Mock call assertions** | **≥1 toHaveBeenCalled per test** |

---

## 🎯 STEP 5: Assertion Coverage Validation

**Purpose:** Ensure every test has meaningful assertions (not just "runs without error")

**Rule:**
```bash
Average assertions/test ≥ 2
Formula: count(expect(...)) / count(it(...))
```

**Example - PASS:**
```typescript
it('sendSms returns error for invalid phone', async () => {
  const result = await service.sendSms('INVALID', 'hello');
  
  expect(result.success).toBe(false);           // Assertion 1
  expect(result.error).toContain('Invalid');    // Assertion 2
  expect(mockTwilio.create).not.toHaveBeenCalled(); // Assertion 3
  // AVG = 3 assertions > 2 ✅
});
```

**Example - FAIL:**
```typescript
it('sendSms returns something', async () => {
  await service.sendSms('+393331234567', 'hello');
  // Zero assertions! ❌
});
```

**Why:** Tests with <2 assertions often don't actually verify behavior—they just check "code didn't crash"

---

## 🎯 STEP 6: Mock State Management Validation

**Purpose:** Prevent mock pollution between tests (most common Jest pitfall)

**Rule:**
```bash
EVERY mock must use *Once suffix:
  ❌ mockResolvedValue(...)
  ❌ mockRejectedValue(...)
  ✅ mockResolvedValueOnce(...)
  ✅ mockRejectedValueOnce(...)
```

**Why:** Without `Once`, a mock's return value persists across tests, contaminating subsequent tests.

**Bad Example (FAIL):**
```typescript
it('test 1: Twilio fails', async () => {
  mockTwilio.mockRejectedValue(new Error('API down')); // ❌ NO Once!
  // All subsequent tests will ALSO get API down error
});

it('test 2: should succeed', async () => {
  // Inherits mockRejectedValue from test 1 ❌❌❌
  const result = await service.send('+393331234567', 'hello');
  expect(result.success).toBe(true); // FAILS because mock still rejects!
});
```

**Good Example (PASS):**
```typescript
beforeEach(() => {
  jest.clearAllMocks();
  mockTwilio.mockResolvedValue({ sid: 'sm_123' });
});

it('test 1: Twilio fails', async () => {
  mockTwilio.mockRejectedValueOnce(new Error('API down')); // ✅ Once!
  // Rejection only applies to this one call
});

it('test 2: should succeed', async () => {
  const result = await service.send('+393331234567', 'hello');
  expect(result.success).toBe(true); // ✅ PASSES - default resolved value
});
```

**Solution in beforeEach:**
```typescript
beforeEach(() => {
  jest.clearAllMocks();
  // Reset ALL mocks to a sensible default
  mockPrisma.user.findUnique.mockResolvedValue({ id: '123' });
  mockTwilio.messages.create.mockResolvedValue({ sid: 'sm_123' });
});
```

---

## 🎯 STEP 7: Call Verification Validation

**Purpose:** Ensure tests verify HOW functions are called (not just WHAT they return)

**Rule:**
```bash
Min call verifications ≥ number of tests
Formula: count(toHaveBeenCalled) ≥ count(it(...))
```

**Example - PASS:**
```typescript
it('sends SMS via Twilio', async () => {
  await service.sendSms('+393331234567', 'hello');
  
  // ✅ Verify behavior: Twilio.create WAS called
  expect(mockTwilio.messages.create).toHaveBeenCalledWith(
    expect.objectContaining({ to: '+393331234567' })
  );
});

it('rejects invalid phone without calling Twilio', async () => {
  await service.sendSms('INVALID', 'hello');
  
  // ✅ Verify behavior: Twilio.create was NOT called
  expect(mockTwilio.messages.create).not.toHaveBeenCalled();
});
```

**Example - FAIL:**
```typescript
it('sends SMS', async () => {
  const result = await service.sendSms('+393331234567', 'hello');
  expect(result.success).toBe(true);
  // No call verification! ❌
  // We don't know if sendSms actually called Twilio or just returned fake success
});
```

**Why:** Without call verification, you can't distinguish:
- "Code works" from "Code is faked"
- "Dependencies were called" from "Dependencies were skipped"

---

## ⚙️ How It Works (fix-coverage.sh)

When you run:
```bash
bash .claude/scripts/fix-coverage.sh booking
```

The script executes all 7 steps in sequence:

```
🔧 [FASE 0] TypeScript pre-flight check...
✅ [FASE 0] Nessun errore TypeScript

📂 Scansione moduli...
🔧 Processando: backend/src/booking/services/booking-slot.service.ts
  ⏳ STEP1: Generazione test...
  ✅ STEP1: spec scritto
  
  ⏳ STEP2: TypeScript check...
  ✅ STEP2: TypeScript OK
  
  ⏳ STEP3bis: TypeScript gate validation...
  ✅ STEP3bis: TS gate cleared
  
  ⏳ STEP3: Mutation testing...
  ✅ STEP3: Mutation score 85% ≥ 80%
  
  ⏳ STEP4: Jest 3× run (flakiness check)...
  ✅ STEP4: stabile (3/3 run passati)
  
  ⏳ STEP5: Assertion Coverage Validation...
  ✅ STEP5: Assertion coverage OK (media 3 per test)
  
  ⏳ STEP6: Mock State Management Validation...
  ✅ STEP6: Mock state management OK (no persistent mocks)
  
  ⏳ STEP7: Call Verification Validation...
  ✅ STEP7: Call verification OK (coverage 5/5 test)
  
  ✅ ALL STEPS PASSED
```

If ANY step fails, the test is rejected and logged as "ceiling" (architectural limit or error).

---

## 🚨 Common Failures & Fixes

### Failure: "Assertion coverage bassa (media 1 per test)"

**Problem:**
```typescript
it('test', async () => {
  await service.doSomething();
  expect(result).toBeDefined(); // Only 1 assertion
});
```

**Fix:** Add meaningful assertions
```typescript
it('test', async () => {
  const result = await service.doSomething();
  expect(result).toBeDefined();        // ✅
  expect(result.id).toMatch(/^[0-9]+/); // ✅
  expect(mockDb.save).toHaveBeenCalled(); // ✅
});
```

---

### Failure: "Mock state issues (N mockRejectedValue senza Once)"

**Problem:**
```typescript
mockDatabase.findUser.mockRejectedValue(new Error('DB down'));
// This rejects FOREVER
```

**Fix:** Use `Once` or reset in beforeEach
```typescript
// Option 1: Use Once
mockDatabase.findUser.mockRejectedValueOnce(new Error('DB down'));

// Option 2: Reset in beforeEach
beforeEach(() => {
  jest.clearAllMocks();
  mockDatabase.findUser.mockResolvedValue({ id: '123' });
});
```

---

### Failure: "Call verification insufficiente (1 vs 5 test)"

**Problem:**
```typescript
it('calls API', async () => {
  await service.fetchUser(123);
  // No call verification ❌
});

it('calls cache', async () => {
  await service.getUser(123);
  // No call verification ❌
});
```

**Fix:** Verify every mock call
```typescript
it('calls API and caches result', async () => {
  const result = await service.getUser(123);
  expect(mockApi.fetch).toHaveBeenCalledWith(123);       // ✅
  expect(mockCache.set).toHaveBeenCalledWith('user:123'); // ✅
});

it('returns cached value without API call', async () => {
  mockCache.get.mockResolvedValueOnce({ id: 123 });
  const result = await service.getUser(123);
  expect(mockApi.fetch).not.toHaveBeenCalled();          // ✅
  expect(result.id).toBe(123);                            // ✅
});
```

---

## 📊 Validation Metrics (2026 Standard)

| Metric | Target | Rationale |
|--------|--------|-----------|
| Statements coverage | ≥90% | Google exemplary standard |
| Branches coverage | ≥90% | Hidden logic bugs |
| Avg assertions/test | ≥2 | Meaningful validation |
| Mock Once ratio | 100% | No test pollution |
| Call verification | 100% of tests | Behavior verification |
| Mutation score | ≥80% | Code quality gates |
| Flakiness | 0% (3/3 pass) | Reliability |

---

## 🔗 References

- [Jest Mock Functions](https://jestjs.io/docs/mock-functions)
- [Jest Expect Assertions](https://jestjs.io/docs/expect#assertionsn)
- [Agentic Engineering Part 7: Dual Quality Gates (2026)](https://www.sagarmandal.com/2026/03/15/agentic-engineering-part-7-dual-quality-gates-why-validation-and-testing-must-be-separate-processes/)
- [Software Testing Strategies 2026](https://testcollab.com/blog/software-testing-strategies)

---

**Created:** April 2026  
**Owner:** MechMind OS Quality Gates Team
