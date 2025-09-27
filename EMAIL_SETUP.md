# Email Notification Setup

## Environment Variables Required

Add the following environment variables to your `.env` file:

```env
# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
ADMIN_EMAIL=admin@yourcompany.com
```

## Email Service Configuration

### For Gmail:
1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this app password as `EMAIL_PASSWORD`

### For Other Email Services:
- **Outlook/Hotmail**: Use `EMAIL_SERVICE=hotmail`
- **Yahoo**: Use `EMAIL_SERVICE=yahoo`
- **Custom SMTP**: Configure manually in `emailService.js`

## How It Works

1. When a new order is created through the WhatsApp bot
2. The order is saved to MongoDB
3. Immediately after successful save, an email notification is sent to `ADMIN_EMAIL`
4. The email contains all order details in a formatted HTML template

## Email Template Features

- Professional HTML formatting
- Complete order details table
- Customer information
- Pickup schedule
- Payment method
- Order timestamp
- Success confirmation

## Testing Email Configuration

You can test the email configuration by calling the test function in `emailService.js`:

```javascript
import { testEmailConfiguration } from './emailService.js';
await testEmailConfiguration();
```

## Troubleshooting

- Ensure all environment variables are set correctly
- Check that the email service supports the authentication method
- Verify that the admin email address is valid
- Check server logs for detailed error messages
