import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter for email sending
const createTransporter = () => {
  try {
    console.log("📧 Creating email transporter...");
    console.log("📧 Email service:", process.env.EMAIL_SERVICE || 'gmail');
    console.log("📧 Email user:", process.env.EMAIL_USER ? "✅ Set" : "❌ Not set");
    console.log("📧 Email password:", process.env.EMAIL_PASSWORD ? "✅ Set" : "❌ Not set");
    console.log("📧 Admin email:", process.env.ADMIN_EMAIL ? "✅ Set" : "❌ Not set");
    
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail', // Default to Gmail
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    
    console.log("✅ Email transporter created successfully");
    return transporter;
  } catch (error) {
    console.error("❌ Failed to create email transporter:", error.message);
    throw error;
  }
};

// Function to send order notification email
export const sendOrderNotificationEmail = async (orderData) => {
  try {
    console.log("📧 Starting order notification email process...");
    console.log("📧 Order data received:", JSON.stringify(orderData, null, 2));
    
    const transporter = createTransporter();
    
    // Verify transporter connection
    console.log("📧 Verifying email transporter connection...");
    await transporter.verify();
    console.log("✅ Email transporter connection verified");
    
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
    
    // Send email
    console.log("📧 Sending email...");
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Order notification email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📧 Response:', info.response);
    return { success: true, messageId: info.messageId };
    
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

    console.log("📧 Sending test email...");
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent successfully!');
    console.log('📧 Test Message ID:', info.messageId);
    console.log('📧 Test Response:', info.response);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('❌ Email configuration test failed:');
    console.error('❌ Test Error message:', error.message);
    console.error('❌ Test Error code:', error.code);
    console.error('❌ Test Error response:', error.response);
    console.error('❌ Full test error:', error);
    return { success: false, error: error.message, code: error.code };
  }
};
