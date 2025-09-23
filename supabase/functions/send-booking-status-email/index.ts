import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BookingEmailRequest {
  bookingId: string
  oldStatus: string
  newStatus: string
  emailRecipients?: string
  customEmailAddresses?: string
}

interface BookingDetails {
  id: string
  customer_id: string
  provider_id: string
  service_id: string
  start_time: string
  end_time: string
  status: string
  notes?: string
  location?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { bookingId, oldStatus, newStatus, emailRecipients = 'both', customEmailAddresses }: BookingEmailRequest = await req.json()

    // Fetch booking details with related data
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select(`
        *,
        customer:users!bookings_customer_id_fkey(id, full_name, email, phone_number),
        provider:users!bookings_provider_id_fkey(id, full_name, email),
        service:services(id, name, duration)
      `)
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      throw new Error(`Failed to fetch booking: ${bookingError?.message}`)
    }

    // Optionally fetch location details if needed
    let locationData = null;
    if (booking.location) {
      console.log('Fetching location data for location ID:', booking.location);
      const { data: location, error: locationError } = await supabaseClient
        .from('location')
        .select('id, name')
        .eq('id', booking.location)
        .single()
      
      if (locationError) {
        console.error('Error fetching location:', locationError);
      } else {
        locationData = location;
        console.log('Location data fetched:', locationData);
      }
    } else {
      console.log('No location ID found in booking:', booking.id);
    }

    // Attach location data to booking object for email generation
    if (locationData) {
      booking.locationDetails = locationData;
    } else {
      console.log('No location data to attach to booking');
    }

    // Generate email content based on status change
    const emailContent = generateEmailContent(booking, oldStatus, newStatus)
    
    // Send emails to customer and staff
    const emailPromises = []
    
    // Check if custom email addresses are provided for override
    if (customEmailAddresses && customEmailAddresses.trim()) {
      // Parse custom email addresses (comma-separated)
      const emailList = customEmailAddresses.split(',').map(email => email.trim()).filter(email => email)
      
      // Send to all valid custom email addresses
      for (const email of emailList) {
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
      // Send to customer
      if ((emailRecipients === 'both' || emailRecipients === 'customer') && booking.customer?.email) {
        emailPromises.push(
          sendEmail({
            to: booking.customer.email,
            subject: emailContent.customer.subject,
            html: emailContent.customer.html
          })
        )
      }
      
      // Send to staff
      if ((emailRecipients === 'both' || emailRecipients === 'provider') && booking.provider?.email) {
        emailPromises.push(
          sendEmail({
            to: booking.provider.email,
            subject: emailContent.staff.subject,
            html: emailContent.staff.html
          })
        )
      }
    }

    await Promise.all(emailPromises)

    return new Response(
      JSON.stringify({ success: true, message: 'Emails sent successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error sending booking status emails:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

function generateEmailContent(booking: any, oldStatus: string, newStatus: string) {
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

  const statusMessages = {
    pending: 'Pending Confirmation',
    confirmed: 'Confirmed',
    cancelled: 'Cancelled',
    completed: 'Completed'
  }

  const customerSubject = `Booking ${statusMessages[newStatus]}: ${booking.service?.name}`
  const staffSubject = `Booking Status Update: ${booking.customer?.full_name} - ${booking.service?.name}`

  // Customer email content
  const customerHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Booking Status Update</h2>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #495057;">Booking Details</h3>
        <p><strong>Service:</strong> ${booking.service?.name}</p>
        <p><strong>Staff Member:</strong> ${booking.provider?.full_name}</p>
        <p><strong>Date & Time:</strong> ${formatDate(booking.start_time)}</p>
        ${booking.locationDetails ? `<p><strong>Location:</strong> ${booking.locationDetails.name}</p>` : `<p><strong>Location:</strong> Not set (booking.location: ${booking.location})</p>`}
        <p><strong>Status:</strong> <span style="color: ${getStatusColor(newStatus)}; font-weight: bold;">${statusMessages[newStatus]}</span></p>
      </div>
      
      ${getCustomerStatusMessage(newStatus)}
      
      ${booking.notes ? `<p><strong>Notes:</strong> ${booking.notes}</p>` : ''}
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 14px;">
        <p>If you have any questions, please contact us.</p>
        <p>Thank you for choosing our services!</p>
      </div>
    </div>
  `

  // Staff email content
  const staffHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Booking Status Update</h2>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #495057;">Booking Details</h3>
        <p><strong>Customer:</strong> ${booking.customer?.full_name}</p>
        <p><strong>Customer Phone:</strong> ${booking.customer?.phone_number ? `<a href="tel:${booking.customer.phone_number}">${booking.customer.phone_number}</a>` : 'Not provided'}</p>
        <p><strong>Service:</strong> ${booking.service?.name}</p>
        <p><strong>Date & Time:</strong> ${formatDate(booking.start_time)}</p>
        ${booking.locationDetails ? `<p><strong>Location:</strong> ${booking.locationDetails.name}</p>` : ''}
        <p><strong>Previous Status:</strong> ${statusMessages[oldStatus]}</p>
        <p><strong>New Status:</strong> <span style="color: ${getStatusColor(newStatus)}; font-weight: bold;">${statusMessages[newStatus]}</span></p>
      </div>
      
      ${getStaffStatusMessage(newStatus)}
      
      ${booking.notes ? `<p><strong>Notes:</strong> ${booking.notes}</p>` : ''}
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 14px;">
        <p>Please check your schedule and prepare accordingly.</p>
      </div>
    </div>
  `

  return {
    customer: { subject: customerSubject, html: customerHtml },
    staff: { subject: staffSubject, html: staffHtml }
  }
}

function getStatusColor(status: string): string {
  const colors = {
    pending: '#ffc107',
    confirmed: '#28a745',
    cancelled: '#dc3545',
    completed: '#007bff'
  }
  return colors[status] || '#6c757d'
}

function getCustomerStatusMessage(status: string): string {
  const messages = {
    pending: '<div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0;"><p style="margin: 0; color: #856404;">Your booking is pending confirmation. We will notify you once it\'s confirmed.</p></div>',
    confirmed: '<div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 15px 0;"><p style="margin: 0; color: #155724;">Great! Your booking has been confirmed. We look forward to seeing you.</p></div>',
    cancelled: '<div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 15px 0;"><p style="margin: 0; color: #721c24;">Your booking has been cancelled. If you need to reschedule, please contact us.</p></div>',
    completed: '<div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 15px 0;"><p style="margin: 0; color: #0c5460;">Thank you for your visit! We hope you enjoyed our service.</p></div>'
  }
  return messages[status] || ''
}

function getStaffStatusMessage(status: string): string {
  const messages = {
    pending: '<div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0;"><p style="margin: 0; color: #856404;">This booking is awaiting confirmation.</p></div>',
    confirmed: '<div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 15px 0;"><p style="margin: 0; color: #155724;">This booking has been confirmed. Please prepare for the appointment.</p></div>',
    cancelled: '<div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 15px 0;"><p style="margin: 0; color: #721c24;">This booking has been cancelled. Your schedule slot is now available.</p></div>',
    completed: '<div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 15px 0;"><p style="margin: 0; color: #0c5460;">This booking has been marked as completed.</p></div>'
  }
  return messages[status] || ''
}

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  
  if (!RESEND_API_KEY) {
    console.warn('No email service configured - skipping email send')
    // Return a mock success response instead of undefined
    return { success: true, message: 'Email service not configured' }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'noreply@kangrehab.com.au', // Use Resend's default domain for testing
      to: [to],
      subject,
      html
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to send email: ${error}`)
  }

  return response.json()
}