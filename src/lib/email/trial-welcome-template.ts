export function trialWelcomeEmailHtml({ email }: { email: string }): string {
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.onedollardigest.com";

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Your 3-day free trial has started</title>
</head>
<body style="margin:0;padding:0;background-color:#f0ebe3;font-family:Georgia,'Times New Roman',serif;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background-color:#f0ebe3;padding:40px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="max-width:520px;background-color:#faf7f3;border:1px solid #d6cfc6;">

          <!-- Masthead -->
          <tr>
            <td style="padding:36px 40px 28px;border-bottom:1px solid #d6cfc6;text-align:center;">
              <p style="margin:0 0 6px;font-family:'Courier New',Courier,monospace;font-size:9px;
                letter-spacing:0.12em;text-transform:uppercase;color:#9c8e82;">
                onedollardigest.com
              </p>
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-style:italic;
                font-size:28px;font-weight:400;color:#1a1816;line-height:1.2;">
                The One Dollar Digest
              </h1>
              <div style="margin:14px auto 0;width:32px;height:1px;background-color:#b0a898;"></div>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="padding:32px 40px 0;">
              <p style="margin:0 0 6px;font-family:'Courier New',Courier,monospace;font-size:9px;
                letter-spacing:0.1em;text-transform:uppercase;color:#9c8e82;">
                Welcome
              </p>
              <h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-style:italic;
                font-size:20px;font-weight:400;color:#1a1816;line-height:1.3;">
                Your 3-day free trial has started.
              </h2>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#2e2a26;">
                Welcome, ${email}. For the next <strong style="color:#1a1816;">3 days</strong> you
                have full access to The One Dollar Digest — including the complete archive of past
                issues. No credit card required, no commitment.
              </p>
            </td>
          </tr>

          <!-- What you get -->
          <tr>
            <td style="padding:0 40px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                style="background-color:#f0ebe3;border:1px solid #d6cfc6;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 14px;font-family:'Courier New',Courier,monospace;font-size:9px;
                      letter-spacing:0.1em;text-transform:uppercase;color:#9c8e82;">
                      What's included
                    </p>
                    <!-- Item -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;">
                      <tr>
                        <td style="width:16px;vertical-align:top;padding-top:3px;
                          font-family:'Courier New',Courier,monospace;font-size:10px;color:#3d6b5c;">
                          ✦
                        </td>
                        <td style="font-size:14px;line-height:1.5;color:#1a1816;">
                          <strong>Daily briefings</strong> — technology, politics, and finance, every morning
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;">
                      <tr>
                        <td style="width:16px;vertical-align:top;padding-top:3px;
                          font-family:'Courier New',Courier,monospace;font-size:10px;color:#3d6b5c;">
                          ✦
                        </td>
                        <td style="font-size:14px;line-height:1.5;color:#1a1816;">
                          <strong>Full archive access</strong> — every past issue, searchable by date
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;">
                      <tr>
                        <td style="width:16px;vertical-align:top;padding-top:3px;
                          font-family:'Courier New',Courier,monospace;font-size:10px;color:#3d6b5c;">
                          ✦
                        </td>
                        <td style="font-size:14px;line-height:1.5;color:#1a1816;">
                          <strong>Bias-labeled sources</strong> — know who is telling you what
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width:16px;vertical-align:top;padding-top:3px;
                          font-family:'Courier New',Courier,monospace;font-size:10px;color:#3d6b5c;">
                          ✦
                        </td>
                        <td style="font-size:14px;line-height:1.5;color:#1a1816;">
                          <strong>$1 / month</strong> — less than a single article on most paywalled outlets
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#2e2a26;">
                Your trial ends in 3 days. After that, archive access requires a subscription.
                Today's digest will always be free to read.
              </p>

              <!-- CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#3d6b5c;border:1px solid #3d6b5c;">
                    <a href="${siteUrl}"
                      style="display:inline-block;padding:14px 28px;font-family:'Courier New',Courier,monospace;
                        font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#ffffff;
                        text-decoration:none;font-weight:500;">
                      Read today's digest
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background-color:#d6cfc6;"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px;">
              <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:9px;
                letter-spacing:0.06em;color:#c4bcb2;">
                © ${new Date().getFullYear()} The One Dollar Digest &mdash; AI-curated daily news for $1/month
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}

export function trialWelcomeEmailText({ email }: { email: string }): string {
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.onedollardigest.com";

  return [
    `Welcome to The One Dollar Digest, ${email}`,
    ``,
    `Your 3-day free trial has started.`,
    ``,
    `For the next 3 days you have full access — including the complete archive of past issues.`,
    ``,
    `What's included:`,
    `  ✦ Daily briefings — technology, politics, and finance, every morning`,
    `  ✦ Full archive access — every past issue, searchable by date`,
    `  ✦ Bias-labeled sources — know who is telling you what`,
    `  ✦ $1 / month after your trial`,
    ``,
    `Read today's digest: ${siteUrl}`,
    ``,
    `© ${new Date().getFullYear()} The One Dollar Digest`,
  ].join("\n");
}
