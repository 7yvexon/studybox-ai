"use client";

import { useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";

import { App } from "../apps/web/src/App";
import { AuthProvider } from "../apps/web/src/auth";

export const StudyBoxClient = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <main aria-busy="true" aria-label="StudyBox AI를 불러오는 중입니다." />;
  }

  return (
    <div id="root">
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
};
