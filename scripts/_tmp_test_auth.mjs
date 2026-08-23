import cloudbase from '@cloudbase/js-sdk';

const ENV = 'wollynz-d2gvvk54afe1d25a3';
const KEY = 'eyJhbGciOiJSUzI1NiIsImtpZCI6ImI2YTJlMzBkLWExYTAtNGFhMi04ZWQ3LTEwYmMzYWRmODNmMSJ9.eyJwbGF0Zm9ybSI6IjEwIiwiaXNzIjoiY2xvdWRiYXNlIiwic3ViIjoiY2xvdWRiYXNlLXdtczVrYXl3ZWJjbGllbnQiLCJhdWQiOlsiZWNvLXN5c3RlbSIsImNsb3Vkc3RhY2stYXBpLWdjIiwiY2xvdWRiYXNlLWFwaS1nYyIsImNsb3Vkc3RhY2stYXBpLWRpcmVjdC1nYyJdLCJleHAiOjE5NDc3MTY2ODYsImlhdCI6MTc1NTM5NjY4Nn0.dUzRf3APbLpfZ1sE2LbDf6FaTkaGQqOUNq9Xl_h7sKFt7z6qg990T3n71Q6HZdN04Dc96Qa7yNY3Ed9IoiqeW5OhIfDvlAY4i9xHrw4fvMi2gXUJmZxJRo4EjOSuHkDts3b3cA_UrPt1ZdY2ubfl_EjxwPe5y6N8cVfQTN_5dYWI1Z7Fy4Gqi8LlFWDvjvDAdM9c9pgzIYHXc4tQvX8vy9bK8fAPwpR5MnEhEi3p2e8QFw1zrIzV1StYcSxGmmAhRjwvLpAdAqLmvR_kv7cV0kKV4nZPlZ1lL2v3Dqx8qXaJbYjchqXm4R9n4zJ3d5eQ';

const app = cloudbase.init({ env: ENV });
const auth = app.auth({ persistence: 'local' });

try {
  const res = await auth.getVerification({ email: 'suntest@example.com' });
  console.log('SEND_OK', JSON.stringify(res));
} catch (e) {
  console.error('SEND_ERR', e?.message || e);
  if (e?.response) console.error('RESP', JSON.stringify(e.response));
}
