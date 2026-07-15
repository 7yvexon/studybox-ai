import type { Metadata } from "next";

import "../apps/web/src/styles.css";
import "../apps/web/src/deep-landing.css";

export const metadata: Metadata = {
  title: "StudyBox AI",
  description: "질문과 학습 수준에 맞춰 설명 방식을 바꾸는 AI 학습 공간"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
