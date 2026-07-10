import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";

import { ApiClientError, login, register, sendVerificationCode } from "../../../lib/api-client.js";
import { homeQueryKeys } from "../home-api.js";

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
}

type AuthMode = "login" | "register";

export function AuthDialog({ open, onClose }: AuthDialogProps) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [notice, setNotice] = useState("");

  const codeMutation = useMutation({
    mutationFn: () => sendVerificationCode(email),
    onSuccess: (result) => {
      if (result.developmentCode) setVerificationCode(result.developmentCode);
      setNotice("验证码已发送");
    },
    onError: (error) => setNotice(errorMessage(error))
  });
  const authMutation = useMutation({
    mutationFn: () =>
      mode === "login"
        ? login({ email, password })
        : register({ email, password, displayName, verificationCode }),
    onSuccess: async (session) => {
      queryClient.setQueryData(homeQueryKeys.session, session);
      await queryClient.invalidateQueries({ queryKey: homeQueryKeys.projects });
      setNotice("");
      onClose();
    },
    onError: (error) => setNotice(errorMessage(error))
  });

  if (!open) return null;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");
    authMutation.mutate();
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="auth-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="dialog-close"
          type="button"
          onClick={onClose}
          title="关闭"
          aria-label="关闭登录窗口"
        >
          <X className="ui-icon" size={18} strokeWidth={2} aria-hidden="true" />
        </button>
        <h2 id="auth-title">{mode === "login" ? "登录 AI Studio" : "创建账号"}</h2>
        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            className={mode === "login" ? "is-active" : ""}
            onClick={() => setMode("login")}
          >
            登录
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "register"}
            className={mode === "register" ? "is-active" : ""}
            onClick={() => setMode("register")}
          >
            注册
          </button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === "register" ? (
            <label>
              <span>昵称</span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                autoComplete="name"
                maxLength={80}
                required
              />
            </label>
          ) : null}
          <label>
            <span>邮箱</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              maxLength={320}
              required
            />
          </label>
          <label>
            <span>密码</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={8}
              maxLength={128}
              required
            />
          </label>
          {mode === "register" ? (
            <label>
              <span>验证码</span>
              <span className="verification-field">
                <input
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value)}
                  inputMode="numeric"
                  maxLength={6}
                  required
                />
                <button
                  type="button"
                  disabled={!email || codeMutation.isPending}
                  onClick={() => codeMutation.mutate()}
                >
                  {codeMutation.isPending ? "发送中" : "获取验证码"}
                </button>
              </span>
            </label>
          ) : null}
          {notice ? <p className="form-notice">{notice}</p> : null}
          <button className="auth-submit" type="submit" disabled={authMutation.isPending}>
            {authMutation.isPending ? "处理中" : mode === "login" ? "登录" : "注册并登录"}
          </button>
        </form>
      </section>
    </div>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof ApiClientError ? error.message : "请求失败，请稍后重试";
}
