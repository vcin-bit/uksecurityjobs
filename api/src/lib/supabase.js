const { createClient } = require('@supabase/supabase-js');

// Supabase admin client — uses service key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Create a per-request Supabase client with the user context set
// This ensures RLS policies fire correctly for every query
async function getClientForUser(userId) {
  const client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  // Set the user ID in the session context so RLS policies can read it
  await client.rpc('set_current_user_id', { user_id: userId });
  return client;
}

// Encrypt a sensitive value using pgcrypto
async function encrypt(value) {
  if (!value) return null;
  const { data, error } = await supabase.rpc('encrypt_value', {
    val: value,
    key: process.env.ENCRYPTION_KEY
  });
  if (error) throw new Error('Encryption failed: ' + error.message);
  return data;
}

// Decrypt a sensitive value using pgcrypto
async function decrypt(encrypted) {
  if (!encrypted) return null;
  const { data, error } = await supabase.rpc('decrypt_value', {
    encrypted_val: encrypted,
    key: process.env.ENCRYPTION_KEY
  });
  if (error) throw new Error('Decryption failed: ' + error.message);
  return data;
}

// Write to audit log
async function auditLog({ tableName, recordId, action, performedBy, ipAddress, changes }) {
  try {
    await supabase.from('audit_log').insert({
      table_name: tableName,
      record_id: recordId,
      action,
      performed_by: performedBy,
      ip_address: ipAddress,
      changes: changes || null
    });
  } catch(err) {
    // Never let audit log failures break the main request
    console.error('Audit log error:', err.message);
  }
}

module.exports = { supabase, getClientForUser, encrypt, decrypt, auditLog };
