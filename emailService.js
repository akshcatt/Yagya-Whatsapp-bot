import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

// Initialize SendGrid
const initializeSendGrid = () => {
  try {
    console.log("📧 Initializing SendGrid...");
    console.log("📧 SendGrid API Key:", process.env.SENDGRID_API_KEY ? "✅ Set" : "❌ Not set");
    console.log("📧 From Email:", process.env.FROM_EMAIL ? "✅ Set" : "❌ Not set");
    console.log("📧 Admin Email:", process.env.ADMIN_EMAIL ? "✅ Set" : "❌ Not set");
    
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error("SENDGRID_API_KEY is not set in environment variables");
    }
    
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    console.log("✅ SendGrid initialized successfully");
    return true;
  } catch (error) {
    console.error("❌ Failed to initialize SendGrid:", error.message);
    return false;
  }
};

// Function to send order notification email using SendGrid
export const sendOrderNotificationEmail = async (orderData) => {
  try {
    console.log("📧 Starting order notification email process with SendGrid...");
    console.log("📧 Order data received:", JSON.stringify(orderData, null, 2));
    
    // Initialize SendGrid
    const isInitialized = initializeSendGrid();
    if (!isInitialized) {
      throw new Error("SendGrid initialization failed");
    }
    
    // Create email message
    const msg = {
      to: process.env.ADMIN_EMAIL,
      from: process.env.FROM_EMAIL,
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
    console.log("📧 From:", msg.from);
    console.log("📧 To:", msg.to);
    console.log("📧 Subject:", msg.subject);
    
    // Send email using SendGrid
    console.log("📧 Sending email via SendGrid API...");
    const response = await sgMail.send(msg);
    
    console.log('✅ Order notification email sent successfully via SendGrid!');
    console.log('📧 Response Status:', response[0].statusCode);
    console.log('📧 Message ID:', response[0].headers['x-message-id']);
    
    return { 
      success: true, 
      messageId: response[0].headers['x-message-id'],
      statusCode: response[0].statusCode,
      service: 'sendgrid'
    };
    
  } catch (error) {
    console.error('❌ Failed to send order notification email via SendGrid:');
    console.error('❌ Error message:', error.message);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error response:', error.response?.body);
    console.error('❌ Full error:', error);
    
    return { 
      success: false, 
      error: error.message, 
      code: error.code,
      service: 'sendgrid'
    };
  }
};

// Function to test SendGrid configuration
export const testEmailConfiguration = async () => {
  try {
    console.log("📧 Starting SendGrid configuration test...");
    
    // Initialize SendGrid
    const isInitialized = initializeSendGrid();
    if (!isInitialized) {
      throw new Error("SendGrid initialization failed");
    }
    
    const msg = {
      to: process.env.ADMIN_EMAIL,
      from: process.env.FROM_EMAIL,
      subject: 'Email Configuration Test - Yagya WhatsApp Bot',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #27ae60;">✅ SendGrid Email Configuration Test Successful</h2>
          <p>This is a test email to verify that the SendGrid email configuration is working correctly.</p>
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Service:</strong> SendGrid API</p>
          <p>Your Yagya WhatsApp Bot email notifications are now ready!</p>
        </div>
      `
    };

    console.log("📧 Sending test email via SendGrid...");
    const response = await sgMail.send(msg);
    
    console.log('✅ Test email sent successfully via SendGrid!');
    console.log('📧 Test Response Status:', response[0].statusCode);
    console.log('📧 Test Message ID:', response[0].headers['x-message-id']);
    
    return { 
      success: true, 
      messageId: response[0].headers['x-message-id'],
      statusCode: response[0].statusCode,
      service: 'sendgrid'
    };
    
  } catch (error) {
    console.error('❌ SendGrid configuration test failed:');
    console.error('❌ Test Error message:', error.message);
    console.error('❌ Test Error code:', error.code);
    console.error('❌ Test Error response:', error.response?.body);
    console.error('❌ Full test error:', error);
    
    return { 
      success: false, 
      error: error.message, 
      code: error.code,
      service: 'sendgrid'
    };
  }
};