import '@testing-library/jest-dom';

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.RESEND_API_KEY = 'test_api_key';
process.env.STRIPE_SECRET_KEY = 'sk_test_key';
process.env.WEBSITE_BASE_URL = 'https://con-vive.com';
process.env.EMAIL_FROM_ADDRESS = 'test@invite.con-vive.com';
