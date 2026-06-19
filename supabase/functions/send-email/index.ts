import "https://deno.land/x/dotenv/load.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp/mod.ts";

// Debug: log SMTP environment configuration (mask password)
const smtpUser = Deno.env.get('GMAIL_USER') ?? '';
const smtpPass = Deno.env.get('GMAIL_APP_PASSWORD') ? '***' : '';
const useSmtp = Deno.env.get('USE_GMAIL_SMTP') ?? 'false';
console.log('SMTP Config -> use:', useSmtp, 'user:', smtpUser, 'pass:', smtpPass);


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json();
    // Destructure with sensible defaults; callers can override any field.
    const apiKey = payload.admin ? Deno.env.get('ADMIN_RESEND_API_KEY') : Deno.env.get('USER_RESEND_API_KEY');
    const {
      from = 'onboarding@resend.dev',
      to = Deno.env.get('ADMIN_NOTIFICATION_EMAIL') || 'sirijapolinati17@gmail.com',
      subject = 'Notification from Executive Workshop',
      html = '<p>No content provided.</p>',
    } = payload;
    
    // Validate required fields
    if (!to) {
      return new Response(JSON.stringify({ error: 'Missing "to" email address' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    
    // If Gmail SMTP is enabled, use it instead of Resend
    if (Deno.env.get('USE_GMAIL_SMTP') === 'true') {
      const client = new SmtpClient();
      await client.connectTLS({
        hostname: 'smtp.gmail.com',
        port: 465,
        username: Deno.env.get('GMAIL_USER') ?? '',
        password: Deno.env.get('GMAIL_APP_PASSWORD') ?? '',
      });
      await client.send({
        from: Deno.env.get('GMAIL_USER') ?? '',
        to: to,
        subject: subject,
        content: html,
      });
      await client.close();
      return new Response(JSON.stringify({ message: 'Email sent via Gmail SMTP' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    // Fallback to Resend API
    
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    const data = await res.json()

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: res.ok ? 200 : res.status,
    })
  } catch (error: any) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})
