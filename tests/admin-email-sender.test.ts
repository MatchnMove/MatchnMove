import assert from "node:assert/strict";
import test from "node:test";
import { createServer, type Socket } from "node:net";
import { ADMIN_EMAIL_ADDRESS, ADMIN_EMAIL_FROM, adminEmailEnvelope, assertAdminGmailSender, isAdminEmailAddress } from "../lib/admin-email";
import { sendViaSmtp } from "../lib/email";
import { senderAddress } from "../lib/recruitment";
import { SUPPORT_MAILBOX } from "../lib/partner-inbox-policy";

test("admin SMTP headers and envelope always use contact despite legacy settings and saved senders", async t => {
  const previous = { ...process.env };
  const messages: string[] = [], senders: string[] = [];
  const sockets = new Set<Socket>();
  const smtp = createServer(socket => {
    sockets.add(socket); socket.on("close", () => sockets.delete(socket));
    socket.write("220 localhost sender test\r\n");
    let buffer = "", data = false;
    socket.on("data", chunk => {
      buffer += chunk.toString();
      while (buffer.includes("\r\n")) {
        if (data) {
          const end = buffer.indexOf("\r\n.\r\n");
          if (end < 0) return;
          messages.push(buffer.slice(0, end)); buffer = buffer.slice(end + 5); data = false;
          socket.write("250 accepted locally\r\n"); continue;
        }
        const end = buffer.indexOf("\r\n"), command = buffer.slice(0, end); buffer = buffer.slice(end + 2);
        if (command.startsWith("EHLO")) socket.write("250-localhost\r\n250 AUTH PLAIN\r\n");
        else if (command.startsWith("AUTH")) socket.write("235 authenticated\r\n");
        else if (command === "DATA") { data = true; socket.write("354 end with dot\r\n"); }
        else if (command === "QUIT") socket.end("221 bye\r\n");
        else { if (command.startsWith("MAIL FROM")) senders.push(command); socket.write("250 ok\r\n"); }
      }
    });
  });
  t.after(async () => {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>(resolve => smtp.close(() => resolve()));
    for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
  });
  await new Promise<void>(resolve => smtp.listen(0, "127.0.0.1", resolve));
  const address = smtp.address(); assert.ok(address && typeof address === "object");
  Object.assign(process.env, {
    SMTP_HOST: "127.0.0.1", SMTP_PORT: String(address.port), SMTP_USER: "old-login@validation.invalid", SMTP_PASS: "local-fixture",
    SMTP_SECURE: "false", SMTP_REQUIRE_TLS: "false", EMAIL_SMTP_POOL: "false", EMAIL_FORCE_SMTP_USER_FROM: "true",
    RECRUITMENT_FROM_EMAIL: "recruitment@matchnmove.co.nz", RECRUITMENT_REPLY_TO: "support@matchnmove.co.nz",
    DEFAULT_FROM_EMAIL: "old-default@validation.invalid", PARTNER_INBOX_ADDRESS: "support@matchnmove.co.nz",
  });
  assert.equal(senderAddress(), ADMIN_EMAIL_ADDRESS);
  assert.equal(SUPPORT_MAILBOX, ADMIN_EMAIL_ADDRESS);
  for (const kind of ["recruitment_invitation", "admin_team_invitation", "admin_password_reset"] as const) {
    await sendViaSmtp({ kind, from: "old-saved@validation.invalid", replyTo: "old-replies@validation.invalid", to: "recipient@validation.invalid", subject: kind, text: "Local test", html: "<p>Local test</p>" }, `sender-test-${kind}`);
  }
  assert.equal(messages.length, 3);
  assert.deepEqual(senders, Array(3).fill("MAIL FROM:<contact@matchnmove.co.nz>"));
  for (const message of messages) {
    assert.match(message, /^From:.*contact@matchnmove.co.nz/m);
    assert.match(message, /^Reply-To: contact@matchnmove.co.nz/m);
    assert.doesNotMatch(message, /old-saved@|old-replies@|old-login@/);
  }
});

test("admin queue identity is fixed and unrelated transactional identities are retained", () => {
  assert.deepEqual(adminEmailEnvelope("admin_team_invitation", "old", "other"), { from: ADMIN_EMAIL_FROM, replyTo: ADMIN_EMAIL_ADDRESS });
  assert.deepEqual(adminEmailEnvelope("mover_new_lead", "leads@validation.invalid", "help@validation.invalid"), { from: "leads@validation.invalid", replyTo: "help@validation.invalid" });
});

test("Google must authorise the contact primary identity or verified alias", () => {
  assert.doesNotThrow(() => assertAdminGmailSender({ sendAs: [{ sendAsEmail: ADMIN_EMAIL_ADDRESS, isPrimary: true }] }));
  assert.doesNotThrow(() => assertAdminGmailSender({ sendAs: [{ sendAsEmail: "support@matchnmove.co.nz", isPrimary: true }, { sendAsEmail: "CONTACT@matchnmove.co.nz", verificationStatus: "accepted" }] }));
  for (const sendAs of [undefined, [], [{ sendAsEmail: ADMIN_EMAIL_ADDRESS, verificationStatus: "pending" }], [{ sendAsEmail: "support@matchnmove.co.nz", isPrimary: true }], [{ sendAsEmail: "contact@other.invalid", verificationStatus: "accepted" }]]) {
    assert.throws(() => assertAdminGmailSender({ sendAs }), /verified Send mail as/);
  }
});

test("historical admin mailboxes remain internal participants", () => {
  for (const address of [ADMIN_EMAIL_ADDRESS, "support@matchnmove.co.nz", "recruitment@matchnmove.co.nz"]) assert.equal(isAdminEmailAddress(address), true);
  assert.equal(isAdminEmailAddress("workspace@validation.invalid", "workspace@validation.invalid"), true);
  assert.equal(isAdminEmailAddress("partner@validation.invalid"), false);
});
