import nodemailer from "nodemailer";
import type { Logger } from "pino";

import type { AppConfig } from "../config.js";

export interface EmailService {
  send(message: { to: string; subject: string; text: string }): Promise<void>;
}

export const createEmailService = (appConfig: AppConfig, logger: Logger): EmailService => {
  const transporter =
    appConfig.mailTransport === "smtp"
      ? nodemailer.createTransport({
          host: appConfig.smtpHost,
          port: appConfig.smtpPort,
          secure: appConfig.smtpPort === 465,
          auth:
            appConfig.smtpUser && appConfig.smtpPassword
              ? { user: appConfig.smtpUser, pass: appConfig.smtpPassword }
              : undefined
        })
      : nodemailer.createTransport({ jsonTransport: true });

  return {
    async send(message) {
      await transporter.sendMail({ from: appConfig.mailFrom, ...message });
      logger.info(
        appConfig.mailTransport === "console" && appConfig.nodeEnv !== "production"
          ? { recipient: message.to, subject: message.subject, preview: message.text.split("\n")[0] }
          : { recipient: message.to, subject: message.subject },
        "email queued"
      );
    }
  };
};
