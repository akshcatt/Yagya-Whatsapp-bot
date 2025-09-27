# Email Connection Timeout Troubleshooting Guide

## 🚨 Connection Timeout Error (ETIMEDOUT)

If you're getting `ETIMEDOUT` errors, this means your server cannot connect to the email service's SMTP server. Here are the solutions:

## 🔧 Immediate Solutions

### 1. **Enhanced Configuration Applied**
The code now includes:
- ✅ **Increased timeouts**: 60 seconds connection timeout
- ✅ **Retry mechanism**: 3 attempts with exponential backoff
- ✅ **Connection pooling**: Better connection management
- ✅ **Alternative services**: Fallback to Outlook/Yahoo if Gmail fails

### 2. **Environment Variables to Add**
Add these to your `.env` file for better reliability:

```env
# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
ADMIN_EMAIL=admin@yourcompany.com

# Optional: Force specific SMTP settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
```

### 3. **Alternative Email Services**
If Gmail continues to fail, try these alternatives:

**Outlook/Hotmail:**
```env
EMAIL_SERVICE=outlook
EMAIL_USER=your_email@outlook.com
EMAIL_PASSWORD=your_password
```

**Yahoo:**
```env
EMAIL_SERVICE=yahoo
EMAIL_USER=your_email@yahoo.com
EMAIL_PASSWORD=your_app_password
```

## 🏗️ Production Environment Solutions

### 1. **Cloud Provider Network Issues**
Many cloud providers (Render, Heroku, etc.) block SMTP ports by default.

**Solution A: Use SendGrid (Recommended)**
```env
EMAIL_SERVICE=sendgrid
EMAIL_USER=apikey
EMAIL_PASSWORD=your_sendgrid_api_key
```

**Solution B: Use Mailgun**
```env
EMAIL_SERVICE=mailgun
EMAIL_USER=your_mailgun_username
EMAIL_PASSWORD=your_mailgun_password
```

### 2. **Firewall/Network Restrictions**
Check if your hosting provider allows outbound SMTP connections:
- Port 587 (TLS)
- Port 465 (SSL)
- Port 25 (Plain - often blocked)

### 3. **DNS Issues**
Ensure your server can resolve SMTP hostnames:
```bash
nslookup smtp.gmail.com
```

## 🧪 Testing Steps

### 1. **Check Configuration**
Visit: `http://your-server:3000/api/debug/email-config`

### 2. **Test Email**
Visit: `http://your-server:3000/api/test-email`

### 3. **Check Server Logs**
Look for these log messages:
```
📧 Creating email transporter...
📧 Using gmail SMTP configuration
📧 SMTP Config: {...}
✅ Email transporter created successfully
📧 Verifying email transporter connection...
```

## 🔄 Retry Mechanism

The system now automatically:
1. **Retries 3 times** with exponential backoff (2s, 4s, 8s)
2. **Tries alternative services** if primary fails
3. **Continues order processing** even if email fails

## 📊 Monitoring

Watch for these log patterns:

**Success:**
```
✅ Order notification email sent successfully!
📧 Message ID: <message-id>
📧 Attempt: 1
```

**Retry Success:**
```
📧 Email attempt 2/3...
✅ Email sent successfully on attempt 2
```

**Fallback Success:**
```
📧 Trying alternative service: outlook
✅ Email sent successfully using outlook service
```

**Complete Failure:**
```
❌ All email services failed
⚠️ Order was saved but email notification failed
```

## 🚀 Recommended Production Setup

For production, use a dedicated email service:

### SendGrid (Free tier: 100 emails/day)
1. Sign up at sendgrid.com
2. Create API key
3. Set environment variables:
```env
EMAIL_SERVICE=sendgrid
EMAIL_USER=apikey
EMAIL_PASSWORD=SG.your_api_key_here
```

### Mailgun (Free tier: 5,000 emails/month)
1. Sign up at mailgun.com
2. Get SMTP credentials
3. Set environment variables:
```env
EMAIL_SERVICE=mailgun
EMAIL_USER=your_mailgun_username
EMAIL_PASSWORD=your_mailgun_password
```

## 🔍 Debug Commands

### Check if SMTP ports are accessible:
```bash
telnet smtp.gmail.com 587
```

### Test DNS resolution:
```bash
nslookup smtp.gmail.com
```

### Check server network connectivity:
```bash
curl -v telnet://smtp.gmail.com:587
```

## 📞 Support

If issues persist:
1. Check your hosting provider's SMTP restrictions
2. Consider using a dedicated email service (SendGrid/Mailgun)
3. Check server logs for detailed error messages
4. Verify environment variables are properly set
