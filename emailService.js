import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Alternative email services configuration
const EMAIL_SERVICES = {
  gmail: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true
  },
  outlook: {
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false,
    requireTLS: true
  },
  yahoo: {
    host: 'smtp.mail.yahoo.com',
    port: 587,
    secure: false,
    requireTLS: true
  },
  sendgrid: {
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    requireTLS: true
  }
};

// Create transporter for email sending
const createTransporter = () => {
  try {
    console.log("📧 Creating email transporter...");
    console.log("📧 Email service:", process.env.EMAIL_SERVICE || 'gmail');
    console.log("📧 Email user:", process.env.EMAIL_USER ? "✅ Set" : "❌ Not set");
    console.log("📧 Email password:", process.env.EMAIL_PASSWORD ? "✅ Set" : "❌ Not set");
    console.log("📧 Admin email:", process.env.ADMIN_EMAIL ? "✅ Set" : "❌ Not set");
    
    // Enhanced SMTP configuration for production environments
    const smtpConfig = {
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      // Connection timeout settings
      connectionTimeout: 60000, // 60 seconds
      greetingTimeout: 30000,   // 30 seconds
      socketTimeout: 60000,     // 60 seconds
      // Retry settings
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 20000, // 20 seconds
      rateLimit: 5,     // 5 messages per rateDelta
      // Security settings
      secure: true,
      tls: {
        rejectUnauthorized: false
      },
      // Pool settings for better connection management
      pool: true,
      poolConfig: {
        max: 5,
        min: 0,
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200
      }
    };

    // Use specific service configuration if available
    const serviceName = process.env.EMAIL_SERVICE || 'gmail';
    if (EMAIL_SERVICES[serviceName]) {
      const serviceConfig = EMAIL_SERVICES[serviceName];
      smtpConfig.host = serviceConfig.host;
      smtpConfig.port = serviceConfig.port;
      smtpConfig.secure = serviceConfig.secure;
      smtpConfig.requireTLS = serviceConfig.requireTLS;
      console.log(`📧 Using ${serviceName} SMTP configuration`);
    }
    
    console.log("📧 SMTP Config:", JSON.stringify({
      service: smtpConfig.service,
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      connectionTimeout: smtpConfig.connectionTimeout
    }, null, 2));
    
    const transporter = nodemailer.createTransport(smtpConfig);
    
    console.log("✅ Email transporter created successfully");
    return transporter;
  } catch (error) {
    console.error("❌ Failed to create email transporter:", error.message);
    throw error;
  }
};

// Function to send email with retry mechanism
const sendEmailWithRetry = async (transporter, mailOptions, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📧 Email attempt ${attempt}/${maxRetries}...`);
      
      if (attempt > 1) {
        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt - 1) * 1000; // 2s, 4s, 8s
        console.log(`📧 Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully on attempt ${attempt}`);
      return { success: true, messageId: info.messageId, attempt };
      
    } catch (error) {
      console.error(`❌ Email attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        console.error(`❌ All ${maxRetries} email attempts failed`);
        throw error;
      }
      
      // Check if it's a connection error that might be retryable
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
        console.log(`📧 Connection error detected, will retry...`);
        continue;
      } else {
        // Non-retryable error
        console.error(`❌ Non-retryable error:`, error.code);
        throw error;
      }
    }
  }
};

// Function to try alternative email services
const tryAlternativeServices = async (orderData, mailOptions) => {
  const services = ['gmail', 'outlook', 'yahoo'];
  const currentService = process.env.EMAIL_SERVICE || 'gmail';
  
  // Remove current service from alternatives
  const alternatives = services.filter(service => service !== currentService);
  
  for (const service of alternatives) {
    try {
      console.log(`📧 Trying alternative service: ${service}`);
      
      // Temporarily override the service
      const originalService = process.env.EMAIL_SERVICE;
      process.env.EMAIL_SERVICE = service;
      
      const transporter = createTransporter();
      const result = await sendEmailWithRetry(transporter, mailOptions, 2); // Fewer retries for alternatives
      
      // Restore original service
      process.env.EMAIL_SERVICE = originalService;
      
      console.log(`✅ Email sent successfully using ${service} service`);
      return { success: true, messageId: result.messageId, service: service };
      
    } catch (error) {
      console.error(`❌ Alternative service ${service} also failed:`, error.message);
      // Restore original service
      process.env.EMAIL_SERVICE = process.env.EMAIL_SERVICE || 'gmail';
      continue;
    }
  }
  
  throw new Error('All email services failed');
};

// Function to send order notification email
export const sendOrderNotificationEmail = async (orderData) => {
  try {
    console.log("📧 Starting order notification email process...");
    console.log("📧 Order data received:", JSON.stringify(orderData, null, 2));
    
    const transporter = createTransporter();
    
    // Verify transporter connection with timeout
    console.log("📧 Verifying email transporter connection...");
    try {
      await Promise.race([
        transporter.verify(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection verification timeout')), 30000)
        )
      ]);
      console.log("✅ Email transporter connection verified");
    } catch (verifyError) {
      console.error("❌ Email connection verification failed:", verifyError.message);
      // Continue anyway, sometimes verify fails but sending works
      console.log("📧 Proceeding with email send despite verification failure...");
    }
    
    // Email template for order notification
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL, // Email where notifications should be sent
      subject: `New Order Received - ${orderData.customer}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
            🗑️ New Waste Pickup Order
          </h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #34495e; margin-top: 0;">Order Details</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #2c3e50;">Customer Name:</td>
                <td style="padding: 8px 0;">${orderData.customer}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #2c3e50;">Phone Number:</td>
                <td style="padding: 8px 0;">${orderData.phoneNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #2c3e50;">Category:</td>
                <td style="padding: 8px 0;">${orderData.category}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #2c3e50;">Vehicle:</td>
                <td style="padding: 8px 0;">${orderData.vehicle}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #2c3e50;">Weight:</td>
                <td style="padding: 8px 0;">${orderData.weight} kg</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #2c3e50;">Address:</td>
                <td style="padding: 8px 0;">${orderData.address}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #2c3e50;">Pickup Date:</td>
                <td style="padding: 8px 0;">${orderData.date}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #2c3e50;">Time Slot:</td>
                <td style="padding: 8px 0;">${orderData.time}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #2c3e50;">Payment Method:</td>
                <td style="padding: 8px 0;">${orderData.payment}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #2c3e50;">Order Date:</td>
                <td style="padding: 8px 0;">${new Date(orderData.createdAt).toLocaleString()}</td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; border-left: 4px solid #27ae60;">
            <p style="margin: 0; color: #27ae60; font-weight: bold;">
              ✅ Order has been successfully saved to the database
            </p>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
            <p style="margin: 0; color: #856404;">
              <strong>Note:</strong> Please process this order according to the scheduled pickup time.
            </p>
          </div>
        </div>
      `
    };

    // Log email details before sending
    console.log("📧 Email details:");
    console.log("📧 From:", mailOptions.from);
    console.log("📧 To:", mailOptions.to);
    console.log("📧 Subject:", mailOptions.subject);
    
    // Send email with retry mechanism
    console.log("📧 Sending email with retry mechanism...");
    try {
      const result = await sendEmailWithRetry(transporter, mailOptions);
      console.log('✅ Order notification email sent successfully!');
      console.log('📧 Message ID:', result.messageId);
      console.log('📧 Attempt:', result.attempt);
      return { success: true, messageId: result.messageId, attempt: result.attempt };
    } catch (primaryError) {
      console.error('❌ Primary email service failed:', primaryError.message);
      console.log('📧 Attempting alternative email services...');
      
      // Try alternative services
      try {
        const altResult = await tryAlternativeServices(orderData, mailOptions);
        console.log('✅ Email sent using alternative service:', altResult.service);
        return { 
          success: true, 
          messageId: altResult.messageId, 
          service: altResult.service,
          fallback: true 
        };
      } catch (altError) {
        console.error('❌ All email services failed');
        throw primaryError; // Throw the original error
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to send order notification email:');
    console.error('❌ Error message:', error.message);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error response:', error.response);
    console.error('❌ Full error:', error);
    return { success: false, error: error.message, code: error.code };
  }
};

// Function to test email configuration
export const testEmailConfiguration = async () => {
  try {
    console.log("📧 Starting email configuration test...");
    const transporter = createTransporter();
    
    // Verify connection first
    console.log("📧 Verifying email connection for test...");
    await transporter.verify();
    console.log("✅ Email connection verified for test");
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: 'Email Configuration Test - Yagya WhatsApp Bot',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #27ae60;">✅ Email Configuration Test Successful</h2>
          <p>This is a test email to verify that the email configuration is working correctly.</p>
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          <p>Your Yagya WhatsApp Bot email notifications are now ready!</p>
        </div>
      `
    };

    console.log("📧 Sending test email with retry mechanism...");
    const result = await sendEmailWithRetry(transporter, mailOptions);
    console.log('✅ Test email sent successfully!');
    console.log('📧 Test Message ID:', result.messageId);
    console.log('📧 Test Attempt:', result.attempt);
    return { success: true, messageId: result.messageId, attempt: result.attempt };
    
  } catch (error) {
    console.error('❌ Email configuration test failed:');
    console.error('❌ Test Error message:', error.message);
    console.error('❌ Test Error code:', error.code);
    console.error('❌ Test Error response:', error.response);
    console.error('❌ Full test error:', error);
    return { success: false, error: error.message, code: error.code };
  }
};
