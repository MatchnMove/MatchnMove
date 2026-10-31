import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes } from "node:crypto";
import {
  addresses,
  boundedInboxInput,
  decodeEmailHeader,
  allowedInboxFile,
  cleanFileName,
  draftSchema,
  extractGmailContent,
  messageIds,
  openInboxSecret,
  sanitizeEmailHtml,
  sealInboxSecret,
} from "../lib/partner-inbox-policy";

test("company matching uses mailbox addresses rather than email-like display names", () => {
  assert.deepEqual(addresses('"known@company.co.nz" <stranger@example.com>'), [
    "stranger@example.com",
  ]);
  assert.deepEqual(
    addresses(
      'Partners: "Known Partner" <one@example.com>, Two <two@example.com>;',
    ),
    ["one@example.com", "two@example.com"],
  );
  assert.equal(decodeEmailHeader("=?UTF-8?B?S2lhIG9yYSDwn5GL?="), "Kia ora 👋");
  assert.equal(decodeEmailHeader("=?ISO-8859-1?Q?caf=E9?="), "café");
});
test("inbox collections are bounded before schema traversal", () => {
  assert.equal(boundedInboxInput({ to: Array(101).fill("invalid") }), false);
  assert.equal(
    boundedInboxInput({ to: ["partner@example.com"], text: "Message" }),
    true,
  );
  assert.equal(
    boundedInboxInput(JSON.parse('{"a":'.repeat(12) + "null" + "}".repeat(12))),
    false,
  );
});
import { aucklandWeekStart } from "../lib/recruitment-dates";

test("email HTML blocks scripts, forms, trackers, unsafe schemes and embedded active content", () => {
  const html = sanitizeEmailHtml(
    '<p onclick="steal()">Hello <b>partner</b></p><img src="https://tracking.invalid/open"><script>steal()</script><iframe src="https://bad.invalid"></iframe><form action="/send"><input></form><svg onload="steal()"></svg><a href="javascript:steal()">bad</a><a href="//tracker.invalid">protocol</a><a href="https://example.com" onclick="steal()">safe</a>',
  );
  assert.match(html, /Hello <b>partner<\/b>/);
  assert.doesNotMatch(
    html,
    /<img|<script|<iframe|<form|<svg|onclick|javascript:|\/\/tracker/,
  );
  assert.match(html, /noopener noreferrer/);
  assert.match(html, /href="https:\/\/example.com"/);
});
test("OAuth secrets are authenticated, randomised ciphertext with a dedicated key", () => {
  process.env.PARTNER_INBOX_ENCRYPTION_KEY = randomBytes(32).toString("hex");
  const value = "local-test-refresh-value";
  const sealed = sealInboxSecret(value);
  assert.notEqual(sealed, sealInboxSecret(value));
  assert.doesNotMatch(sealed, /local-test-refresh/);
  assert.equal(openInboxSecret(sealed), value);
  const parts = sealed.split(".");
  parts[2] = Buffer.from("tampered").toString("base64url");
  assert.throws(() => openInboxSecret(parts.join(".")));
  const key = process.env.PARTNER_INBOX_ENCRYPTION_KEY;
  process.env.PARTNER_INBOX_ENCRYPTION_KEY = randomBytes(32).toString("hex");
  assert.throws(() => openInboxSecret(sealed));
  process.env.PARTNER_INBOX_ENCRYPTION_KEY = "bad";
  assert.throws(() => sealInboxSecret(value));
  process.env.PARTNER_INBOX_ENCRYPTION_KEY = key;
});
test("draft validation rejects header injection, malformed addresses, excessive recipients and unknown purposes", () => {
  const good = {
    mode: "new",
    to: ["Partner@Example.com"],
    subject: "Partner enquiry",
    text: "Hello",
    purpose: "SERVICE",
  };
  assert.equal(draftSchema.parse(good).to[0], "partner@example.com");
  for (const change of [
    { subject: "Hello\r\nBcc: stolen@example.com" },
    { to: ["a@example.com\r\nCc:x@example.com"] },
    { to: Array(21).fill("a@example.com") },
    { purpose: "BYPASS" },
    { text: "x".repeat(100001) },
  ])
    assert.equal(draftSchema.safeParse({ ...good, ...change }).success, false);
  assert.deepEqual(
    messageIds(
      "<good@example.com>\r\nBcc: bad@example.com <bad\r\nid@example.com> <good@example.com>",
    ),
    ["<good@example.com>"],
  );
});
test("attachment allowlist checks content and extension and blocks executable disguises", () => {
  assert.equal(
    allowedInboxFile(
      Buffer.from("%PDF-1.7"),
      "insurance.pdf",
      "application/pdf",
    ),
    "application/pdf",
  );
  assert.equal(
    allowedInboxFile(Buffer.from("MZbad"), "insurance.pdf", null),
    null,
  );
  assert.equal(
    allowedInboxFile(
      Buffer.from("%PDF-1.7"),
      "document.exe",
      "application/pdf",
    ),
    null,
  );
  assert.equal(
    allowedInboxFile(Buffer.from("plain text"), "notes.txt", null),
    "text/plain",
  );
  assert.equal(
    allowedInboxFile(Buffer.from([0xff, 0xfe, 0x33]), "notes.csv", null),
    null,
  );
  assert.equal(
    allowedInboxFile(
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      "archive.docx",
      null,
    ),
    null,
  );
  assert.equal(
    allowedInboxFile(
      Buffer.from("PK\x03\x04[Content_Types].xmlword/vbaProject.bin"),
      "macro.docx",
      null,
    ),
    null,
  );
  assert.doesNotMatch(cleanFileName("../\\secret\u0000.pdf"), /[\\/\u0000]/);
});
test("MIME extraction handles nested bodies and records files without exposing active HTML", () => {
  const message = {
    id: "one",
    threadId: "thread",
    payload: {
      parts: [
        {
          parts: [
            {
              mimeType: "text/plain",
              body: {
                data: Buffer.from("A mover asks for help").toString(
                  "base64url",
                ),
              },
            },
            {
              mimeType: "text/html",
              body: {
                data: Buffer.from(
                  '<b>Help</b><img src="https://tracker.invalid">',
                ).toString("base64url"),
              },
            },
          ],
        },
        {
          partId: "2",
          filename: "insurance.pdf",
          mimeType: "application/pdf",
          body: { attachmentId: "private-google-id", size: 1234 },
        },
      ],
    },
  };
  const result = extractGmailContent(message);
  assert.equal(result.text, "A mover asks for help");
  assert.equal(result.html, "<b>Help</b>");
  assert.equal(result.attachments[0].providerAttachmentId, "private-google-id");
});
test("resolved-this-week starts on Auckland Monday across UTC day boundaries and DST", () => {
  assert.equal(
    aucklandWeekStart(new Date("2026-10-31T02:00:00Z")).toISOString(),
    "2026-10-25T11:00:00.000Z",
  );
  assert.equal(
    aucklandWeekStart(new Date("2026-07-05T13:00:00Z")).toISOString(),
    "2026-07-05T12:00:00.000Z",
  );
});
