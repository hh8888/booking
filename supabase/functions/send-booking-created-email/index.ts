import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Email validation function
function isValidEmail(email: string): boolean {
  // Check if email contains a valid hostname (not .temp.local or similar fake domains)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;
  
  // Check for fake email patterns
  const fakePatterns = [
    /\.temp\.local$/i,
    /\.fake\.com$/i,
    /\.test\.com$/i,
    /fake.*@/i,
    /test.*@/i,
    /temp.*@/i
  ];
  
  return !fakePatterns.some(pattern => pattern.test(email));
}

// Email sending function using Resend
async function sendEmail({ to, subject, html }: { to: string, subject: string, html: string }) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set')
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'Kang\'s Rehabilitation Centre <noreply@kangrehab.com.au>',
      to: [to],
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Failed to send email: ${error}`)
  }

  return res.json()
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { bookingId, emailRecipients = 'both', customEmailAddresses } = await req.json()

    if (!bookingId) {
      throw new Error('Booking ID is required')
    }

    // Create Supabase client
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    // Fetch booking details with related data
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select(`
        *,
        customer:users!bookings_customer_id_fkey(id, full_name, email, phone_number),
        provider:users!bookings_provider_id_fkey(id, full_name, email),
        service:services(id, name, duration, price)
      `)
      .eq('id', bookingId)
      .single()

    if (bookingError) {
      throw new Error(`Failed to fetch booking: ${bookingError.message}`)
    }

    if (!booking) {
      throw new Error('Booking not found')
    }

    console.log('Booking data fetched:', booking)

    // Fetch location data if location exists
    let locationData = null
    if (booking.location) {
      const { data: location, error: locationError } = await supabaseClient
        .from('location')
        .select('*')
        .eq('id', booking.location)
        .single()
      
      if (!locationError && location) {
        locationData = location
        console.log('Location data fetched:', locationData)
      }
    } else {
      console.log('No location ID found in booking:', booking.id)
    }

    // Attach location data to booking object for email generation
    if (locationData) {
      booking.locationDetails = locationData
    } else {
      console.log('No location data to attach to booking')
    }

    // Generate email content for booking creation
    const emailContent = generateBookingCreatedEmailContent(booking)
    
    // Send emails to customer and staff
    const emailPromises = []
    
    // Check if custom email addresses are provided for override
    if (customEmailAddresses && customEmailAddresses.trim()) {
      // Parse custom email addresses (comma-separated)
      const emailList = customEmailAddresses.split(',').map(email => email.trim()).filter(email => email && isValidEmail(email))
      
      // Send to all valid custom email addresses
      for (const email of emailList) {
        // Determine which email content to use based on recipients setting
        if (emailRecipients === 'customer' || emailRecipients === 'both') {
          emailPromises.push(
            sendEmail({
              to: email,
              subject: emailContent.customer.subject,
              html: emailContent.customer.html
            })
          )
        }
        if (emailRecipients === 'provider' || (emailRecipients === 'both' && emailList.length === 1)) {
          emailPromises.push(
            sendEmail({
              to: email,
              subject: emailContent.staff.subject,
              html: emailContent.staff.html
            })
          )
        }
      }
    } else {
      // Use original booking email addresses
      // Send to customer - with hostname validation
      if ((emailRecipients === 'both' || emailRecipients === 'customer') && 
          booking.customer?.email && isValidEmail(booking.customer.email)) {
        emailPromises.push(
          sendEmail({
            to: booking.customer.email,
            subject: emailContent.customer.subject,
            html: emailContent.customer.html
          })
        )
      } else if (booking.customer?.email) {
        console.log(`Skipping customer email to fake address: ${booking.customer.email}`)
      }
      
      // Send to staff member - with hostname validation
      if ((emailRecipients === 'both' || emailRecipients === 'provider') && 
          booking.provider?.email && isValidEmail(booking.provider.email)) {
        emailPromises.push(
          sendEmail({
            to: booking.provider.email,
            subject: emailContent.staff.subject,
            html: emailContent.staff.html
          })
        )
      } else if (booking.provider?.email) {
        console.log(`Skipping staff email to fake address: ${booking.provider.email}`)
      }
    }

    await Promise.all(emailPromises)

    return new Response(
      JSON.stringify({ success: true, message: 'Booking creation emails sent successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error sending booking creation emails:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

function generateBookingCreatedEmailContent(booking: any) {
  const formatDate = (dateString: string) => {
    // Convert GMT time to Sydney time with automatic daylight saving consideration
    return new Date(dateString).toLocaleString('en-AU', {
      timeZone: 'Australia/Sydney',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    })
  }

  const startTime = formatDate(booking.start_time)
  const endTime = formatDate(booking.end_time)
  const customerName = booking.customer?.full_name || 'Customer'
  const customerPhone = booking.customer?.phone_number || 'Not provided'
  const providerName = booking.provider?.full_name || 'Staff Member'
  const serviceName = booking?.service?.name || 'Service'
  
  // Fix duration calculation - handle PostgreSQL interval format
  const parseDuration = (duration) => {
    if (!duration) return 'TBD'
    
    // If it's already a number, assume it's in minutes
    if (typeof duration === 'number' && !isNaN(duration)) {
      return `${Math.round(duration)} minutes`
    }
    
    // Handle PostgreSQL interval format
    if (typeof duration === 'string') {
      if (duration.includes(':')) {
        // If duration is in time format (HH:MM:SS), convert to minutes
        const timeParts = duration.split(':')
        if (timeParts.length === 3) {
          // Convert hours:minutes:seconds to minutes
          const minutes = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]) + parseInt(timeParts[2]) / 60
          return `${Math.round(minutes)} minutes`
        } else if (timeParts.length === 2) {
          // Convert minutes:seconds to minutes
          const minutes = parseInt(timeParts[0]) + parseInt(timeParts[1]) / 60
          return `${Math.round(minutes)} minutes`
        }
      } else if (duration.includes('hour') || duration.includes('minute') || duration.includes('second')) {
        // Handle verbose interval format
        let minutes = 0
        
        // Extract hours
        const hourMatch = duration.match(/(\d+)\s+hour/i)
        if (hourMatch) minutes += parseInt(hourMatch[1]) * 60
        
        // Extract minutes
        const minuteMatch = duration.match(/(\d+)\s+minute/i)
        if (minuteMatch) minutes += parseInt(minuteMatch[1])
        
        // Extract seconds (convert to fraction of minute)
        const secondMatch = duration.match(/(\d+)\s+second/i)
        if (secondMatch) minutes += parseInt(secondMatch[1]) / 60
        
        return `${Math.round(minutes)} minutes`
      }
    }
    
    return 'TBD'
  }
  
  // Calculate actual booking duration from start_time and end_time
  const calculateBookingDuration = () => {
    if (booking.start_time && booking.end_time) {
      const startDate = new Date(booking.start_time)
      const endDate = new Date(booking.end_time)
      const durationMs = endDate.getTime() - startDate.getTime()
      const durationMinutes = Math.round(durationMs / (1000 * 60))
      return `${durationMinutes} minutes`
    }
    // Fallback to service duration if booking times are not available
    return parseDuration(booking.service?.duration)
  }
  
  const serviceDuration = calculateBookingDuration()
  
  // Fix location undefined issue
  const locationInfo = booking.locationDetails ? 
    `${booking.locationDetails.name || 'Location'}${booking.locationDetails.address ? '\n' + booking.locationDetails.address : ''}` : 
    'Location TBD'
  
  // Add booking status
  const bookingStatus = booking.status || 'Confirmed'

  // Customer email content
  const customerSubject = `Booking Confirmation - ${serviceName}`
  const customerHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #2563eb; margin-bottom: 20px; text-align: center;">Booking Created!</h2>
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">Dear ${customerName},</p>
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">Great news! Your booking has been successfully created.</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1f2937; margin-top: 0;">Booking Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Service:</td>
              <td style="padding: 8px 0; color: #1f2937;">${serviceName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Provider:</td>
              <td style="padding: 8px 0; color: #1f2937;">${providerName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Status:</td>
              <td style="padding: 8px 0; color: #1f2937;">${bookingStatus}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Date & Time:</td>
              <td style="padding: 8px 0; color: #1f2937;">${startTime}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Duration:</td>
              <td style="padding: 8px 0; color: #1f2937;">${serviceDuration}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Location:</td>
              <td style="padding: 8px 0; color: #1f2937; white-space: pre-line;">${locationInfo}</td>
            </tr>
          </table>
        </div>
        
        ${booking.notes ? `
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h4 style="color: #92400e; margin-top: 0;">Additional Notes</h4>
          <p style="color: #92400e; margin-bottom: 0;">${booking.notes}</p>
        </div>
        ` : ''}
        
        <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
          <h4 style="color: #065f46; margin-top: 0;">What's Next?</h4>
          <ul style="color: #065f46; margin-bottom: 0; padding-left: 20px;">
            <li>Please arrive 5-10 minutes early</li>
            <li>Bring any required documents or items</li>
            <li>Contact us if you need to reschedule</li>
          </ul>
        </div>
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">If you have any questions or need to make changes, please don't hesitate to contact us.</p>
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">Thank you for choosing our services!</p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 14px; margin: 0;">This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </div>
  `

  // Staff email content
  const staffSubject = `New Booking Assignment - ${serviceName}`
  const staffHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #7c3aed; margin-bottom: 20px; text-align: center;">New Booking Assignment</h2>
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hello ${providerName},</p>
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">You have been assigned a new booking. Please review the details below:</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1f2937; margin-top: 0;">Booking Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Customer:</td>
              <td style="padding: 8px 0; color: #1f2937;">${customerName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Customer Phone:</td>
              <td style="padding: 8px 0; color: #1f2937;"><a href="tel:${customerPhone}" style="color: #2563eb; text-decoration: none;">${customerPhone}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Service:</td>
              <td style="padding: 8px 0; color: #1f2937;">${serviceName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Status:</td>
              <td style="padding: 8px 0; color: #1f2937;">${bookingStatus}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Date & Time:</td>
              <td style="padding: 8px 0; color: #1f2937;">${startTime}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Duration:</td>
              <td style="padding: 8px 0; color: #1f2937;">${serviceDuration}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Location:</td>
              <td style="padding: 8px 0; color: #1f2937; white-space: pre-line;">${locationInfo}</td>
            </tr>
          </table>
        </div>
        
        ${booking.notes ? `
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h4 style="color: #92400e; margin-top: 0;">Customer Notes</h4>
          <p style="color: #92400e; margin-bottom: 0;">${booking.notes}</p>
        </div>
        ` : ''}
        
        <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
          <h4 style="color: #1e40af; margin-top: 0;">Preparation Checklist</h4>
          <ul style="color: #1e40af; margin-bottom: 0; padding-left: 20px;">
            <li>Review customer requirements</li>
            <li>Prepare necessary equipment/materials</li>
            <li>Confirm location and arrival time</li>
            <li>Contact customer if needed</li>
          </ul>
        </div>
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">Please ensure you're prepared and arrive on time. Contact the customer or management if you have any questions.</p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 14px; margin: 0;">This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </div>
  `

  return {
    customer: {
      subject: customerSubject,
      html: customerHtml
    },
    staff: {
      subject: staffSubject,
      html: staffHtml
    }
  }
}