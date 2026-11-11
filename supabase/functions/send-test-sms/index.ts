import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only a signed-in admin or manager may send SMS. The site's public (anon)
  // key is not a user token, so it is rejected here.
  const caller = await getCaller(req)
  if (!caller) {
    return jsonResponse({ error: 'Sign-in required' }, 401)
  }
  if (caller.role !== 'admin' && caller.role !== 'manager') {
    return jsonResponse({ error: 'Only admins and managers can send test SMS' }, 403)
  }

  try {
    const { bookingId, phoneNumbers, testType, bookingData } = await req.json()

    if (typeof phoneNumbers !== 'string' || !phoneNumbers.trim()) {
      throw new Error('At least one phone number is required')
    }

    // Get Twilio credentials from environment variables
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      throw new Error('Twilio credentials not configured')
    }

    // Generate SMS content based on test type
    const smsContent = generateSmsContent(testType, bookingData)
    
    // Parse phone numbers (comma-separated)
    const phoneNumberList = phoneNumbers.split(',').map(phone => phone.trim()).filter(phone => phone)
    
    // Send SMS to each phone number
    const smsPromises = phoneNumberList.map(async (phoneNumber) => {
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: TWILIO_PHONE_NUMBER,
          To: phoneNumber,
          Body: smsContent
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Failed to send SMS to ${phoneNumber}: ${error}`)
      }

      return response.json()
    })

    await Promise.all(smsPromises)

    return new Response(
      JSON.stringify({ success: true, message: `Test SMS sent successfully to ${phoneNumberList.length} recipient(s)` }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error sending test SMS:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

// Resolve the signed-in user behind the request and their role in the users
// table. Returns null when the request carries no valid user session.
async function getCaller(req: Request): Promise<{ id: string; role: string | null } | null> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return null

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data, error } = await adminClient.auth.getUser(token)
  if (error || !data?.user) return null

  const { data: profile } = await adminClient
    .from('users')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle()

  return { id: data.user.id, role: profile?.role ?? null }
}

function generateSmsContent(testType: string, bookingData: any): string {
  const customerName = bookingData?.customer?.full_name || 'Customer'
  const serviceName = bookingData?.service?.name || 'Service'
  const bookingId = bookingData?.id || 'N/A'
  
  switch (testType) {
    case 'reminder':
      return `Hi ${customerName}, this is a reminder for your upcoming ${serviceName} appointment. Booking ID: ${bookingId}. Please contact us if you need to reschedule.`
    
    case 'confirmation':
      return `Hi ${customerName}, your ${serviceName} booking has been confirmed! Booking ID: ${bookingId}. We look forward to seeing you.`
    
    case 'cancellation':
      return `Hi ${customerName}, your ${serviceName} booking (ID: ${bookingId}) has been cancelled. Please contact us if you have any questions.`
    
    default:
      return `Test SMS from booking system. Booking ID: ${bookingId}`
  }
}