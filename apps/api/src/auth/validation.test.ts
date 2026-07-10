import { describe, expect, it } from "vitest";

import { loginSchema, registerSchema } from "./validation.js";

const validRegistration = {
  username: "Student_01",
  password: "secure-password",
  inviteCode: "school-beta-2026",
  realName: "홍길동",
  schoolName: "스터디고등학교",
  grade: 2,
  classNumber: 3,
  studentNumber: 14
};

describe("auth validation", () => {
  it("normalizes a username and accepts valid school information", () => {
    expect(registerSchema.parse(validRegistration)).toMatchObject({
      username: "student_01",
      realName: "홍길동",
      schoolName: "스터디고등학교",
      grade: 2,
      classNumber: 3,
      studentNumber: 14
    });
  });

  it("rejects invalid usernames and school information", () => {
    expect(() => loginSchema.parse({ username: "student-id", password: "password" })).toThrow();
    expect(() => registerSchema.parse({ ...validRegistration, grade: 7 })).toThrow();
    expect(() => registerSchema.parse({ ...validRegistration, classNumber: 100 })).toThrow();
    expect(() => registerSchema.parse({ ...validRegistration, studentNumber: 0 })).toThrow();
    expect(() => registerSchema.parse({ ...validRegistration, realName: "   " })).toThrow();
  });
});
