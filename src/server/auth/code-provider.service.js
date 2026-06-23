import DysmsapiClient, { SendSmsRequest } from "@alicloud/dysmsapi20170525";
import DmClient, { SingleSendMailRequest } from "@alicloud/dm20151123";
import { Config } from "@alicloud/openapi-client";
import { env } from "../config/env.js";
import { logInfo } from "../lib/logger.js";

function hasAliyunBaseConfig() {
  return Boolean(env.aliyunAccessKeyId && env.aliyunAccessKeySecret);
}

function createOpenApiConfig(endpoint) {
  return new Config({
    accessKeyId: env.aliyunAccessKeyId,
    accessKeySecret: env.aliyunAccessKeySecret,
    endpoint
  });
}

async function sendAliyunSms({ target, code }) {
  if (!hasAliyunBaseConfig() || !env.aliyunSmsSignName || !env.aliyunSmsTemplateCode) {
    throw new Error("Aliyun SMS is not configured");
  }
  const client = new DysmsapiClient.default(createOpenApiConfig(env.aliyunSmsEndpoint));
  const request = new SendSmsRequest({
    phoneNumbers: target,
    signName: env.aliyunSmsSignName,
    templateCode: env.aliyunSmsTemplateCode,
    templateParam: JSON.stringify({ code })
  });
  await client.sendSms(request);
}

async function sendAliyunEmail({ target, code }) {
  if (!hasAliyunBaseConfig() || !env.aliyunDmAccountName) {
    throw new Error("Aliyun Direct Mail is not configured");
  }
  const client = new DmClient.default(createOpenApiConfig(env.aliyunDmEndpoint));
  const request = new SingleSendMailRequest({
    accountName: env.aliyunDmAccountName,
    addressType: 1,
    replyToAddress: env.aliyunDmReplyToAddress === "true",
    toAddress: target,
    subject: "AI Studio 验证码",
    fromAlias: env.aliyunDmFromAlias,
    textBody: `你的 AI Studio 验证码是 ${code}，5 分钟内有效。若非本人操作，请忽略。`
  });
  await client.singleSendMail(request);
}

export async function deliverVerificationCode({ channel, target, purpose, code }) {
  if (env.authCodeProvider === "mock" || env.nodeEnv === "test") {
    logInfo("mock verification code issued", { channel, target, purpose, code });
    return { delivery: "mock", code };
  }

  if (env.authCodeProvider !== "aliyun") {
    throw new Error(`Unsupported auth code provider: ${env.authCodeProvider}`);
  }

  if (channel === "sms") {
    await sendAliyunSms({ target, code });
    return { delivery: "aliyun-sms" };
  }

  await sendAliyunEmail({ target, code });
  return { delivery: "aliyun-email" };
}
